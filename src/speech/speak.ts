import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { nowIso } from "../utils/clock.js";
import { loadSpeechSinks } from "./sinks/index.js";
import type { SpeechPayload } from "./sinks/types.js";
import { writeSpeechArtifact } from "./writeSpeechArtifact.js";
import { mapConfidenceToSpeech } from "./gradient/confidenceGradient.js";
import { redactSpeechText } from "./redaction/redactSpeech.js";
import { decideSpeech } from "./decideSpeech.js";
import { readOperatorState } from "../operator/state.js";
import { appendSpeechAutoplayAuditLine } from "./autoplayAudit.js";
import { isSpeechAutoplayDenied } from "./autoplayDenied.js";

const SPEECH_DEBUG = process.env.SPEECH_DEBUG === "1";

function speechDebug(reason: string, details?: Record<string, unknown>): void {
  if (!SPEECH_DEBUG) return;
  try {
    const payload = {
      kind: "SpeechDebug",
      reason,
      ...(details ? { details } : {}),
    };
    process.stderr.write(`${JSON.stringify(payload)}\n`);
  } catch {
    // fail-open
  }
}

function envEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env.SPEECH_ENABLED;
  if (v == null || v === "") return true;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

function allowedCategory(category: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = String(env.SPEECH_CATEGORIES ?? "").trim();
  if (!raw) return true;
  const allow = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allow.length) return true;
  return allow.includes(category);
}

function stableHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function parseCsv(input: string | undefined | null): string[] {
  const raw = String(input ?? "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function sinkFallbackTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = String(env.SPEECH_SINK_FALLBACK_TIMEOUT_MS ?? "").trim();
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return n;
  // Default: short enough to fall back quickly, long enough for local IO.
  return 2500;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return p;
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("SINK_TIMEOUT")), ms);
    try {
      // Do not keep the process alive solely for fallback timers.
      (t as any).unref?.();
    } catch {
      // ignore
    }
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function buildSpeechSinksEnv(operatorSink: string | null): NodeJS.ProcessEnv {
  // Canonical boring-reliable fallback order.
  const canonical = ["elevenlabs", "os-tts", "console"];

  // If operator explicitly pinned a primary sink, respect it as primary, but still
  // append fallback sinks so speech still happens under stress.
  const rawList = operatorSink ? [operatorSink] : parseCsv(process.env.SPEECH_SINKS);
  const base = rawList.length ? rawList : canonical;

  const out: string[] = [];
  for (const s of base) {
    const v = String(s ?? "").trim();
    if (!v) continue;
    if (!out.includes(v)) out.push(v);
  }
  for (const s of canonical) {
    if (!out.includes(s)) out.push(s);
  }

  return { ...process.env, SPEECH_SINKS: out.join(",") };
}

async function speakViaFallback(params: {
  payload: SpeechPayload;
  sinks: Array<{ name: string; speak(payload: SpeechPayload): Promise<void> | void }>;
  fingerprint: string;
  category: string;
  env: NodeJS.ProcessEnv;
}): Promise<void> {
  const timeoutMs = sinkFallbackTimeoutMs(params.env);

  const source = params.payload?.meta?.source ?? "operator";
  const requestedAutoplay = source === "alert" && params.payload?.meta?.autoplay_requested === true;
  const kind = typeof params.payload?.meta?.alert_kind === "string" ? String(params.payload.meta.alert_kind) : null;

  const production = String(params.env.NODE_ENV ?? "").trim() === "production";
  const autoplayEnabled = String(params.env.SPEECH_AUTOPLAY ?? "").trim() === "1";
  const allowAutoplay = requestedAutoplay && autoplayEnabled && !production;
  const baseReason: "OK" | "AUTOPLAY_DISABLED" | "DISABLED_IN_PRODUCTION" = allowAutoplay
    ? "OK"
    : production
      ? "DISABLED_IN_PRODUCTION"
      : "AUTOPLAY_DISABLED";

  let firstSink: string | null = null;
  let winnerSink: string | null = null;
  let fallbackUsed = false;
  let sawAutoplayDenied = false;

  // Hard rule: production is always silent for alert-origin speech.
  // Still record a minimal audit line when an alert requested autoplay.
  if (source === "alert" && production) {
    if (requestedAutoplay) {
      appendSpeechAutoplayAuditLine({
        ts: new Date().toISOString(),
        cmd: "speech-autoplay",
        mode: "production_silent",
        source: "alert",
        kind: kind ?? undefined,
        requested_autoplay: true,
        attempted: false,
        reason: "DISABLED_IN_PRODUCTION",
        fallback_used: false,
        count: 0,
        env: {
          autoplay: autoplayEnabled,
          node_env: String(params.env.NODE_ENV ?? "").trim() || "production",
        },
      });
    }
    return;
  }

  for (const sink of params.sinks) {
    if (!firstSink) firstSink = sink.name;
    try {
      const op = Promise.resolve(sink.speak(params.payload));
      // Only apply a timeout to non-console sinks; console is synchronous and should never block.
      if (sink.name === "console") {
        await op;
      } else {
        await withTimeout(op, timeoutMs);
      }

      winnerSink = sink.name;
      fallbackUsed = sawAutoplayDenied || (firstSink != null && winnerSink !== firstSink);

      if (requestedAutoplay) {
        appendSpeechAutoplayAuditLine({
          ts: new Date().toISOString(),
          cmd: "speech-autoplay",
          mode: winnerSink,
          source: "alert",
          kind: kind ?? undefined,
          requested_autoplay: true,
          attempted: allowAutoplay,
          reason: baseReason,
          fallback_used: fallbackUsed,
          count: 1,
          env: {
            autoplay: autoplayEnabled,
            node_env: String(params.env.NODE_ENV ?? "").trim() || "development",
          },
        });
      }
      return;
    } catch (err: any) {
      if (isSpeechAutoplayDenied(err)) {
        sawAutoplayDenied = true;
      }
      // fall through
    }
  }

  // If everything failed, still emit a minimal audit line for requested alert autoplay.
  if (requestedAutoplay) {
    appendSpeechAutoplayAuditLine({
      ts: new Date().toISOString(),
      cmd: "speech-autoplay",
      mode: winnerSink ?? firstSink ?? "none",
      source: "alert",
      kind: kind ?? undefined,
      requested_autoplay: true,
      attempted: allowAutoplay,
      reason: baseReason,
      fallback_used: false,
      count: 0,
      env: {
        autoplay: autoplayEnabled,
        node_env: String(params.env.NODE_ENV ?? "").trim() || "development",
      },
    });
  }
}

const budgetByFingerprint = new Map<string, { base: number; used: number }>();
const silenceUntilByFingerprint = new Map<string, number>();
const lastSpokenAtByFingerprint = new Map<string, number>();
const spokenTimestampsByFingerprint = new Map<string, number[]>();
const lastDenyByFingerprint = new Map<
  string,
  {
    reason: string;
    at: number;
    silenceUntil: number | null;
  }
>();

type SpeechDeltaEntry = {
  hash: string;
  at_ms: number;
};

const lastDeltaByFingerprint = new Map<string, Record<string, SpeechDeltaEntry>>();
      const DEFAULT_CATEGORIES = new Set(["confidence", "policy"]);
function safeFilePart(input: string): string {
  const s = String(input ?? "");
  const cleaned = s.replace(/[\\/<>:\"|?*\x00-\x1F]/g, "_");
  return cleaned.slice(0, 120);
}

function isDeltaOnlyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.SPEECH_DELTA_ONLY === "1";
}

function isDeltaPersistEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.SPEECH_DELTA_PERSIST === "1";
}

function deltaTtlMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = String(env.SPEECH_DELTA_TTL_MS ?? "").trim();
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return n;
  // Default: 24h
  return 24 * 60 * 60 * 1000;
}

function deltaStorePath(fingerprint: string): string {
  return path.join(process.cwd(), "runs", "speech-delta", `${safeFilePart(fingerprint)}.json`);
}

function readDeltaStoreFromDisk(fingerprint: string): Record<string, SpeechDeltaEntry> | null {
  try {
    const p = deltaStorePath(fingerprint);
    if (!fs.existsSync(p)) return null;
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    const byCategory = raw && typeof raw === "object" ? (raw as any).by_category : null;
    if (!byCategory || typeof byCategory !== "object") return null;

    const out: Record<string, SpeechDeltaEntry> = {};
    for (const [k, v] of Object.entries(byCategory)) {
      if (!k) continue;
      if (!v || typeof v !== "object") continue;
      const hash = typeof (v as any).hash === "string" ? String((v as any).hash) : "";
      const at_ms = Number((v as any).at_ms);
      if (!hash || !Number.isFinite(at_ms)) continue;
      out[k] = { hash, at_ms };
    }
    return out;
  } catch {
    return null;
  }
}

function writeDeltaStoreToDisk(fingerprint: string, byCategory: Record<string, SpeechDeltaEntry>): void {
  try {
    const p = deltaStorePath(fingerprint);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(
      p,
      JSON.stringify({ kind: "SpeechDeltaStore", fingerprint, by_category: byCategory }, null, 2) + "\n",
      { encoding: "utf8" }
    );
  } catch {
    // fail-open
  }
}

function shouldSuppressAsDelta(params: {
  fingerprint: string;
  category: string;
  text: string;
  at_ms: number;
  env: NodeJS.ProcessEnv;
}): { suppress: boolean; last_at_ms: number | null } {
  if (!isDeltaOnlyEnabled(params.env)) return { suppress: false, last_at_ms: null };

  const fp = params.fingerprint;
  const category = params.category;

  let store = lastDeltaByFingerprint.get(fp);
  if (!store && isDeltaPersistEnabled(params.env)) {
    store = readDeltaStoreFromDisk(fp) ?? undefined;
    if (store) lastDeltaByFingerprint.set(fp, store);
  }
  if (!store) store = {};

  const ttl = deltaTtlMs(params.env);
  const hash = stableHash(`${category}|${params.text}`);
  const prev = store[category];
  if (prev && prev.hash === hash) {
    const age = params.at_ms - prev.at_ms;
    if (!Number.isFinite(age) || age < 0) {
      // If time is weird, be conservative and suppress duplicates.
      return { suppress: true, last_at_ms: prev.at_ms };
    }
    if (age <= ttl) {
      return { suppress: true, last_at_ms: prev.at_ms };
    }
  }

  store[category] = { hash, at_ms: params.at_ms };
  lastDeltaByFingerprint.set(fp, store);
  if (isDeltaPersistEnabled(params.env)) {
    writeDeltaStoreToDisk(fp, store);
  }
  return { suppress: false, last_at_ms: prev ? prev.at_ms : null };
}

export function getSpeechGateStatus(fingerprint: string): {
  budget_remaining: number | null;
  silence_until: string | null;
  last_deny_reason: string | null;
} {
  try {
    const fp = String(fingerprint ?? "").trim() || "speech";
    const budget = budgetByFingerprint.get(fp);
    const budget_remaining = (() => {
      if (!budget) return null;
      if (!Number.isFinite(budget.base)) return null;
      return Math.max(0, budget.base - budget.used);
    })();

    const silenceUntil = silenceUntilByFingerprint.get(fp);
    const silence_until =
      typeof silenceUntil === "number" && Number.isFinite(silenceUntil)
        ? new Date(silenceUntil).toISOString()
        : null;

    const lastDeny = lastDenyByFingerprint.get(fp);
    const last_deny_reason = lastDeny ? lastDeny.reason : null;

    return { budget_remaining, silence_until, last_deny_reason };
  } catch {
    return { budget_remaining: null, silence_until: null, last_deny_reason: null };
  }
}

function parseVoiceBudgetFromEnv(env: NodeJS.ProcessEnv = process.env): number | null {
  const raw = String(env.SPEECH_VOICE_BUDGET ?? "").trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseMaxPerMinuteFromEnv(env: NodeJS.ProcessEnv = process.env): number | null {
  const raw = String(env.SPEECH_MAX_PER_MINUTE ?? "").trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function wouldExceedRateLimit(params: {
  fingerprint: string;
  now_ms: number;
  env: NodeJS.ProcessEnv;
}): { limited: boolean; max_per_minute: number | null; count_last_minute: number } {
  const max = parseMaxPerMinuteFromEnv(params.env);
  if (max === null) return { limited: false, max_per_minute: null, count_last_minute: 0 };

  const windowMs = 60_000;
  const cutoff = params.now_ms - windowMs;
  const prior = spokenTimestampsByFingerprint.get(params.fingerprint) ?? [];
  const kept = prior.filter((t) => Number.isFinite(t) && t >= cutoff && t <= params.now_ms);
  spokenTimestampsByFingerprint.set(params.fingerprint, kept);

  const count = kept.length;
  if (count >= max) {
    return { limited: true, max_per_minute: max, count_last_minute: count };
  }
  return { limited: false, max_per_minute: max, count_last_minute: count };
}

function recordRateLimitSpeak(fingerprint: string, at_ms: number): void {
  const prior = spokenTimestampsByFingerprint.get(fingerprint) ?? [];
  prior.push(at_ms);
  // Bounded growth: keep at most a small multiple of the cap window.
  if (prior.length > 5000) prior.splice(0, prior.length - 5000);
  spokenTimestampsByFingerprint.set(fingerprint, prior);
}

function normalizeConfidence(raw: number): number {
  if (!Number.isFinite(raw)) return 1;
  if (raw > 1) return Math.max(0, Math.min(1, raw / 100));
  return Math.max(0, Math.min(1, raw));
}

function severityForGate(meta?: SpeechPayload["meta"]): "low" | "medium" | "high" {
  const s = meta?.severity;
  if (s === "urgent") return "high";
  if (s === "warning") return "medium";
  return "low";
}

function redactionLevelForGate(decision: { redactionLevel: "low" | "medium" | "high" }):
  | "normal"
  | "strict"
  | "paranoid" {
  if (decision.redactionLevel === "high") return "paranoid";
  if (decision.redactionLevel === "medium") return "strict";
  return "normal";
}

function writeDecisionArtifact(input: {
  fingerprint: string;
  threadId: string | null;
  execution_id: string | null;
  category: string;
  timestamp: string;
  text_preview: string;
  decision: any;
  meta: SpeechPayload["meta"] | null;
}): void {
  if (process.env.SPEECH_ARTIFACTS !== "1") return;
  const suffix = stableHash(
    `${input.timestamp}|${input.category}|${input.threadId ?? ""}|${String(input.decision?.reason ?? "")}|${input.text_preview}`
  ).slice(0, 16);
  try {
    writeSpeechArtifact({
      dir: "speech-decisions",
      fingerprint: input.fingerprint,
      timestamp: input.timestamp,
      suffix,
      payload: {
        kind: "SpeechDecision",
        fingerprint: input.fingerprint,
        execution_id: input.execution_id,
        threadId: input.threadId,
        category: input.category,
        timestamp: input.timestamp,
        text_preview: input.text_preview,
        decision: input.decision,
        meta: input.meta,
      },
    });
  } catch {
    // fail-open
  }
}

export function speak(input: {
  text: string;
  category: string;
  fingerprint?: string;
  execution_id?: string;
  threadId?: string;
  timestamp?: string;
  meta?: SpeechPayload["meta"];
  simulation?: boolean;
}): void {
  try {
    if (!envEnabled()) return;
    if (!allowedCategory(input.category)) return;

    // Simulation mode: no budgets, no counters, no artifacts, no silence windows.
    // Still fail-open, still respects SPEECH_ENABLED + category allowlist.
    if (input.simulation === true) {
      const timestamp = input.timestamp ?? nowIso();
      const threadId = input.threadId ?? process.env.THREAD_ID ?? input.execution_id;
      const gateFingerprint = input.fingerprint ?? threadId ?? "speech";

      let text = input.text;
      let meta: SpeechPayload["meta"] | undefined = input.meta;
      try {
        const allowCats = parseCsv(process.env.SPEECH_REDACTION_ALLOW_CATEGORIES);
        const redacted = redactSpeechText(text, allowCats, input.category, { level: "normal" });
        text = redacted.text;
        const hits = redacted.hits;
        if (hits.length) {
          meta = {
            ...(meta ?? {}),
            redaction_hits: hits,
            redaction_level: "normal",
          };
        }
      } catch {
        // fail-open
      }

      const payload: SpeechPayload = {
        text,
        category: input.category,
        threadId: threadId || undefined,
        timestamp,
        meta,
      };

      const operatorSink = (() => {
        try {
          return readOperatorState().speech_sink;
        } catch {
          return null;
        }
      })();

      const sinks = (() => {
        try {
          return loadSpeechSinks(buildSpeechSinksEnv(operatorSink));
        } catch {
          return loadSpeechSinks({ ...process.env, SPEECH_SINKS: "console" });
        }
      })();

      // Fire-and-forget fallback execution; must not block the caller.
      void Promise.resolve(
        speakViaFallback({
          payload,
          sinks,
          fingerprint: gateFingerprint,
          category: input.category,
          env: process.env,
        })
      ).catch(() => {
        // fail-open
      });

      // Touch the hash to keep lint happy; no side effects in simulation mode.
      void gateFingerprint;
      return;
    }

    const timestamp = input.timestamp ?? nowIso();
    const threadId = input.threadId ?? process.env.THREAD_ID ?? input.execution_id;

    const gateFingerprint = input.fingerprint ?? threadId ?? "speech";
    const nowMs = Date.now();

     // Hard silence window (sticky): if we've previously silenced, do not speak until expiration.
     const silenceUntil = silenceUntilByFingerprint.get(gateFingerprint);
     if (typeof silenceUntil === "number" && nowMs < silenceUntil) {
       speechDebug("SILENCE_WINDOW_ACTIVE", {
         fingerprint: gateFingerprint,
         category: input.category,
         now: nowMs,
         until: silenceUntil,
       });
       lastDenyByFingerprint.set(gateFingerprint, {
         reason: "SILENCE_WINDOW_ACTIVE",
         at: nowMs,
         silenceUntil,
       });
       writeDecisionArtifact({
         fingerprint: gateFingerprint,
         threadId: threadId ?? null,
         execution_id: input.execution_id ?? null,
         category: input.category,
         timestamp,
         text_preview: String(input.text).slice(0, 180),
         decision: { allow: false, reason: "LOW_CONFIDENCE", silenceUntil },
         meta: input.meta ?? null,
       });
       return;
     }

     // Budget state (per fingerprint, per process).
     const baseBudget = parseVoiceBudgetFromEnv();
     const state = (() => {
       const existing = budgetByFingerprint.get(gateFingerprint);
       if (existing) {
         if (typeof baseBudget === "number") existing.base = baseBudget;
         return existing;
       }
       const initial = { base: typeof baseBudget === "number" ? baseBudget : Number.POSITIVE_INFINITY, used: 0 };
       budgetByFingerprint.set(gateFingerprint, initial);
       return initial;
     })();

     const budgetRemaining = Number.isFinite(state.base) ? Math.max(0, state.base - state.used) : 1_000_000_000;

     const confidence = typeof input.meta?.confidence === "number" ? normalizeConfidence(input.meta.confidence) : 1;
     const lastSpokenAt = lastSpokenAtByFingerprint.get(gateFingerprint);

     const decision = decideSpeech({
       confidence,
       severity: severityForGate(input.meta),
       budgetRemaining,
       lastSpokenAt,
       now: nowMs,
     });

     if (!decision.allow) {
       lastDenyByFingerprint.set(gateFingerprint, {
         reason: decision.reason,
         at: nowMs,
         silenceUntil:
           ("silenceUntil" in decision && typeof (decision as any).silenceUntil === "number")
             ? (decision as any).silenceUntil
             : null,
       });
       if (decision.reason === "LOW_CONFIDENCE") {
         speechDebug("LOW_CONFIDENCE", {
           fingerprint: gateFingerprint,
           category: input.category,
           confidence,
           min: 0.4,
           now: nowMs,
            silenceUntil: ("silenceUntil" in decision && typeof (decision as any).silenceUntil === "number") ? (decision as any).silenceUntil : null,
         });
       }
       if (decision.reason === "BUDGET_EXHAUSTED") {
         speechDebug("BUDGET_EXHAUSTED", {
           fingerprint: gateFingerprint,
           category: input.category,
           remaining: budgetRemaining,
         });
       }
       if (decision.reason === "LOW_CONFIDENCE" && typeof decision.silenceUntil === "number") {
         silenceUntilByFingerprint.set(gateFingerprint, decision.silenceUntil);
       }

       writeDecisionArtifact({
         fingerprint: gateFingerprint,
         threadId: threadId ?? null,
         execution_id: input.execution_id ?? null,
         category: input.category,
         timestamp,
         text_preview: String(input.text).slice(0, 180),
         decision: {
           ...decision,
           budgetRemaining,
           lastSpokenAt: typeof lastSpokenAt === "number" ? lastSpokenAt : null,
         },
         meta: input.meta ?? null,
       });
       return;
     }

    // Apply redaction based on decision, but still allow explicit allow-categories to bypass.
    let text = input.text;
    let meta: SpeechPayload["meta"] | undefined = input.meta;
    const allowCats = parseCsv(process.env.SPEECH_REDACTION_ALLOW_CATEGORIES);
    const mappedLevel = redactionLevelForGate(decision);
    try {
      const redacted = redactSpeechText(text, allowCats, input.category, { level: mappedLevel });
      text = redacted.text;
      const hits = redacted.hits;
      if (hits.length || mappedLevel !== "normal") {
        meta = {
          ...(meta ?? {}),
          ...(hits.length ? { redaction_hits: hits } : {}),
          redaction_level: mappedLevel,
        };
      }
    } catch {
      // fail-open
    }

    // Tier-15: speak-only-deltas (opt-in). Suppress repeats of the *post-redaction* text.
    // This suppression must not decrement budgets, advance silence windows, or write speech-line artifacts.
    {
      const atMsParsed = new Date(timestamp).getTime();
      const at_ms = Number.isFinite(atMsParsed) ? atMsParsed : nowMs;
      const delta = shouldSuppressAsDelta({
        fingerprint: gateFingerprint,
        category: input.category,
        text,
        at_ms,
        env: process.env,
      });
      if (delta.suppress) {
        speechDebug("DELTA_NO_CHANGE", {
          fingerprint: gateFingerprint,
          category: input.category,
          at_ms,
          last_at_ms: delta.last_at_ms,
        });
        // Decision artifacts are optional; keep a trace when enabled.
        writeDecisionArtifact({
          fingerprint: gateFingerprint,
          threadId: threadId ?? null,
          execution_id: input.execution_id ?? null,
          category: input.category,
          timestamp,
          text_preview: String(text).slice(0, 180),
          decision: { allow: false, reason: "DELTA_NO_CHANGE" },
          meta: meta ?? null,
        });
        return;
      }
    }

    // Hard rate cap (independent of budget). Only counts actual speaks (post-redaction, post-delta).
    {
      const rate = wouldExceedRateLimit({ fingerprint: gateFingerprint, now_ms: nowMs, env: process.env });
      if (rate.limited) {
        speechDebug("RATE_LIMIT", {
          fingerprint: gateFingerprint,
          category: input.category,
          now: nowMs,
          max_per_minute: rate.max_per_minute,
          count_last_minute: rate.count_last_minute,
        });
        lastDenyByFingerprint.set(gateFingerprint, {
          reason: "RATE_LIMIT",
          at: nowMs,
          silenceUntil: null,
        });
        writeDecisionArtifact({
          fingerprint: gateFingerprint,
          threadId: threadId ?? null,
          execution_id: input.execution_id ?? null,
          category: input.category,
          timestamp,
          text_preview: String(text).slice(0, 180),
          decision: { allow: false, reason: "RATE_LIMIT", max_per_minute: rate.max_per_minute },
          meta: meta ?? null,
        });
        return;
      }
    }

    // Budget decrement (exactly one per allowed speak).
    state.used += 1;
    recordRateLimitSpeak(gateFingerprint, nowMs);
    lastSpokenAtByFingerprint.set(gateFingerprint, nowMs);
    if (Number.isFinite(state.base)) {
      meta = {
        ...(meta ?? {}),
        effective_voice_budget: state.base,
      };
    }

    writeDecisionArtifact({
      fingerprint: gateFingerprint,
      threadId: threadId ?? null,
      execution_id: input.execution_id ?? null,
      category: input.category,
      timestamp,
      text_preview: String(input.text).slice(0, 180),
      decision: {
        ...decision,
        budgetRemainingBefore: budgetRemaining,
        budgetRemainingAfter: Math.max(0, budgetRemaining - 1),
      },
      meta: meta ?? null,
    });

    const payload: SpeechPayload = {
      text,
      category: input.category,
      threadId: threadId || undefined,
      timestamp,
      meta,
    };

    const operatorSink = (() => {
      try {
        return readOperatorState().speech_sink;
      } catch {
        return null;
      }
    })();

    const sinks = (() => {
      try {
        return loadSpeechSinks(buildSpeechSinksEnv(operatorSink));
      } catch {
        return loadSpeechSinks({ ...process.env, SPEECH_SINKS: "console" });
      }
    })();

    if (process.env.SPEECH_ARTIFACTS === "1") {
      const suffix = stableHash(
        `${payload.timestamp}|${payload.category}|${payload.threadId ?? ""}|${payload.text}`
      ).slice(0, 16);

      try {
        writeSpeechArtifact({
          dir: "speech-lines",
          fingerprint: gateFingerprint,
          timestamp: payload.timestamp,
          suffix,
          payload: {
            kind: "SpeechLine",
            fingerprint: gateFingerprint,
            execution_id: input.execution_id ?? null,
            threadId: payload.threadId ?? null,
            category: payload.category,
            timestamp: payload.timestamp,
            text: payload.text,
            sinks: sinks.map((s) => s.name),
            meta: payload.meta ?? null,
          },
        });
      } catch {
        // fail-open
      }
    }

    // Fire-and-forget fallback execution; must not block the caller.
    void Promise.resolve(
      speakViaFallback({
        payload,
        sinks,
        fingerprint: gateFingerprint,
        category: input.category,
        env: process.env,
      })
    ).catch(() => {
      // fail-open
    });
  } catch {
    // fail-open
  }
}

export function speakText(
  text: string,
  category = "info",
  threadId?: string,
  opts?: { confidence?: number; fingerprint?: string; execution_id?: string; timestamp?: string }
): void {
  try {
    const useGradient = process.env.SPEECH_CONFIDENCE_GRADIENT === "1";
    const prefixEnabled = process.env.SPEECH_GRADIENT_PREFIX === "1";

    let meta: SpeechPayload["meta"] | undefined;
    let finalText = text;

    if (useGradient && typeof opts?.confidence === "number") {
      const g = mapConfidenceToSpeech(opts.confidence);
      meta = { confidence: g.confidence, severity: g.severity, cadence: g.cadence };
      if (prefixEnabled) finalText = `${g.prefix} ${finalText}`;
    }

    speak({
      text: finalText,
      category,
      threadId,
      fingerprint: opts?.fingerprint,
      execution_id: opts?.execution_id,
      timestamp: opts?.timestamp,
      meta,
    });
  } catch {
    // fail-open
  }
}
