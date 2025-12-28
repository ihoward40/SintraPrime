import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import type { RequalificationState, RequalificationStateName } from "./state.js";
import { applyCurveSignal, loadCounters, policyCurveSignalFromParts, saveCounters } from "./probationCounters.js";
import { writeProbationCounterArtifact } from "../artifacts/writeProbationCounterArtifact.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeFilePart(input: string): string {
  const s = String(input ?? "");
  const cleaned = s.replace(/[\\/<>:"|?*\x00-\x1F]/g, "_");
  return cleaned.slice(0, 120);
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonFile(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", { encoding: "utf8" });
}

function runsDir(): string {
  return process.env.RUNS_DIR || "runs";
}

function statePath(fingerprint: string) {
  return path.join(runsDir(), "requalification", "state", `${safeFilePart(fingerprint)}.json`);
}

function eventsDir() {
  return path.join(runsDir(), "requalification", "events");
}

function sha256Stable(obj: Record<string, unknown>): string {
  // Deterministic: keep a single stable JSON stringify site.
  return crypto.createHash("sha256").update(JSON.stringify(obj, null, 0), "utf8").digest("hex");
}

type RawRequalificationEvent = {
  kind?: string;
  fingerprint?: string;
  at?: string;
  ok?: boolean;
  monotonic?: boolean;
  regressed?: boolean;
  confidence?: number;
  success_count?: number;
  required?: number;
  required_successes?: number;
};

function latestPolicySignalsByFingerprint(projectRunsDir: string): Record<string, {
  monotonic: boolean;
  regressed: boolean;
  decision_curve_hash: string;
  observed_at: string;
}> {
  const out: Record<string, { monotonic: boolean; regressed: boolean; decision_curve_hash: string; observed_at: string }> = {};
  const dir = path.join(projectRunsDir, "requalification", "events");
  if (!fs.existsSync(dir)) return out;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

  // Deterministic iteration: by filename.
  files.sort((a, b) => a.localeCompare(b));

  for (const f of files) {
    const full = path.join(dir, f);
    const raw = readJsonFile<unknown>(full);
    if (!isRecord(raw)) continue;
    const ev = raw as RawRequalificationEvent;
    const kind = typeof ev.kind === "string" ? ev.kind : "";
    const fingerprint = typeof ev.fingerprint === "string" ? ev.fingerprint : "";
    if (!fingerprint) continue;

    // Tier-22.1 scan consumes the most recent PROBATION evaluation signal.
    // Today that's represented by the probation success event family.
    if (kind !== "ProbationSuccess") continue;

    const observed_at = typeof ev.at === "string" && ev.at.trim() ? ev.at.trim() : "";
    const ok = ev.ok === true;

    // Map existing event semantics into the requested signal contract.
    // - ok true implies monotonic confidence + no regression in the curve.
    // - ok false counts as a failure (treated as regressed for counter reset semantics).
    const monotonic = ev.monotonic === true || ok;
    const regressed = ev.regressed === true || !ok;

    const decision_curve_hash = sha256Stable({
      kind,
      fingerprint,
      observed_at,
      ok,
      confidence: typeof ev.confidence === "number" ? ev.confidence : null,
      success_count: typeof ev.success_count === "number" ? ev.success_count : null,
      required: typeof ev.required === "number" ? ev.required : (typeof ev.required_successes === "number" ? ev.required_successes : null),
    });

    // "Last one wins" due to lexicographic ordering; filenames are timestamped.
    out[fingerprint] = {
      monotonic,
      regressed,
      decision_curve_hash,
      observed_at: observed_at || new Date(0).toISOString(),
    };
  }

  return out;
}

export type AutonomyStateTransition = {
  fingerprint: string;
  from: RequalificationStateName;
  to: RequalificationStateName;
  reason: string;
  timestamp: string;
};

export function isRequalificationEnabled(): boolean {
  return process.env.REQUALIFICATION_ENABLED === "1";
}

export function readRequalificationState(fingerprint: string): RequalificationState | null {
  const raw = readJsonFile<unknown>(statePath(fingerprint));
  if (!isRecord(raw)) return null;
  const state = String((raw as any).state ?? "");
  if (state !== "ACTIVE" && state !== "SUSPENDED" && state !== "PROBATION" && state !== "ELIGIBLE") {
    return null;
  }
  const cause = typeof (raw as any).cause === "string" ? (raw as any).cause : "UNKNOWN";
  const since = typeof (raw as any).since === "string" ? (raw as any).since : "";
  const cooldown_until =
    typeof (raw as any).cooldown_until === "string" ? (raw as any).cooldown_until : null;
  const activated_at = typeof (raw as any).activated_at === "string" ? (raw as any).activated_at : undefined;
  const decayed_at = typeof (raw as any).decayed_at === "string" ? (raw as any).decayed_at : undefined;

  const success_count = Number.isFinite(Number((raw as any).success_count))
    ? Number((raw as any).success_count)
    : undefined;
  const last_confidence = Number.isFinite(Number((raw as any).last_confidence))
    ? Number((raw as any).last_confidence)
    : undefined;
  const required_successes_raw =
    (raw as any).required_successes !== undefined ? (raw as any).required_successes : (raw as any).required;
  const required_successes = Number.isFinite(Number(required_successes_raw))
    ? Number(required_successes_raw)
    : undefined;

  return {
    fingerprint,
    state: state as RequalificationStateName,
    cause,
    since,
    cooldown_until,
    activated_at,
    decayed_at,
    success_count,
    last_confidence,
    required_successes,
  };
}

export function writeRequalificationState(state: RequalificationState) {
  writeJsonFile(statePath(state.fingerprint), state);
}

export function writeRequalificationEvent(input: {
  fingerprint: string;
  at_iso: string;
  event: string;
  details?: Record<string, unknown>;
}) {
  ensureDir(eventsDir());
  const ts = new Date(input.at_iso).getTime();
  const safeTs = Number.isFinite(ts) ? ts : Date.now();
  const file = path.join(eventsDir(), `${safeFilePart(input.fingerprint)}.${safeTs}.json`);
  // Events are append-only audit artifacts. Keep them flat for grepability.
  writeJsonFile(file, {
    kind: input.event,
    fingerprint: input.fingerprint,
    at: input.at_iso,
    ...(input.details ?? {}),
  });
}

function writeAutonomyStateTransitionEvent(input: AutonomyStateTransition) {
  ensureDir(eventsDir());
  const ts = new Date(input.timestamp).getTime();
  const safeTs = Number.isFinite(ts) ? ts : Date.now();
  const file = path.join(eventsDir(), `${safeFilePart(input.fingerprint)}.${safeTs}.json`);
  writeJsonFile(file, {
    fingerprint: input.fingerprint,
    from: input.from,
    to: input.to,
    reason: input.reason,
    timestamp: input.timestamp,
  });
}

// Tier-22.1: cooldown-driven watcher invoked at run start.
// No scheduler required; deterministic transitions only.
export function applyRequalificationCooldownWatcher(input: { now_iso: string }): AutonomyStateTransition[] {
  const states = listRequalificationStates();
  const out: AutonomyStateTransition[] = [];

  const nowMs = new Date(input.now_iso).getTime();
  if (!Number.isFinite(nowMs)) return out;

  for (const s of states) {
    if (s.state !== "SUSPENDED") continue;
    if (!s.cooldown_until) continue;
    const cooldownMs = new Date(s.cooldown_until).getTime();
    if (!Number.isFinite(cooldownMs)) continue;
    if (nowMs < cooldownMs) continue;

    const next: RequalificationState = {
      fingerprint: s.fingerprint,
      state: "PROBATION",
      cause: "COOLDOWN_ELAPSED",
      since: input.now_iso,
      cooldown_until: null,
    };
    writeRequalificationState(next);

    const transition: AutonomyStateTransition = {
      fingerprint: s.fingerprint,
      from: "SUSPENDED",
      to: "PROBATION",
      reason: "COOLDOWN_ELAPSED",
      timestamp: input.now_iso,
    };
    writeAutonomyStateTransitionEvent(transition);
    out.push(transition);
  }

  return out;
}

export function listRequalificationStates(): RequalificationState[] {
  const dir = path.join(runsDir(), "requalification", "state");
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const out: RequalificationState[] = [];
  for (const f of files) {
    const raw = readJsonFile<unknown>(path.join(dir, f));
    if (!isRecord(raw)) continue;
    const fp = typeof (raw as any).fingerprint === "string" ? (raw as any).fingerprint : null;
    if (!fp) continue;
    const parsed = readRequalificationState(fp);
    if (parsed) out.push(parsed);
  }
  out.sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
  return out;
}

export function requalifyScan(input: { now_iso: string }): {
  kind: "RequalificationScan";
  evaluated: number;
  eligible: string[];
  still_suspended: string[];
  entered_probation: string[];
  recommended: string[];
} {
  const PROBATION_SUCCESS_WINDOW = Number(process.env.PROBATION_SUCCESS_WINDOW ?? "3");
  const states = listRequalificationStates();
  const eligible: string[] = [];
  const still_suspended: string[] = [];
  const entered_probation: string[] = [];
  const recommended: string[] = [];

  const latestPolicySignalByFingerprint = latestPolicySignalsByFingerprint(runsDir());

  for (const s of states) {
    if (s.state === "SUSPENDED") {
      const cooldown = s.cooldown_until;
      if (cooldown && new Date(cooldown).getTime() <= new Date(input.now_iso).getTime()) {
        const next: RequalificationState = {
          ...s,
          state: "PROBATION",
          cause: s.cause,
          since: input.now_iso,
          cooldown_until: null,
        };
        writeRequalificationState(next);
        writeRequalificationEvent({
          fingerprint: s.fingerprint,
          at_iso: input.now_iso,
          event: "SUSPENDED_TO_PROBATION",
          details: { cause: s.cause },
        });
        entered_probation.push(s.fingerprint);
        continue;
      }
      still_suspended.push(s.fingerprint);
      continue;
    }

    if (s.state === "PROBATION") {
      // Tier-22.1: probation success counters based on latest policy curve signal.
      const signalRaw = latestPolicySignalByFingerprint[s.fingerprint];
      if (signalRaw) {
        const window = Number.isFinite(PROBATION_SUCCESS_WINDOW) && PROBATION_SUCCESS_WINDOW > 0
          ? Math.floor(PROBATION_SUCCESS_WINDOW)
          : 3;

        const counters = loadCounters(runsDir(), s.fingerprint, window);
        const applied = applyCurveSignal(
          counters,
          policyCurveSignalFromParts({
            fingerprint: s.fingerprint,
            monotonic: !!signalRaw.monotonic,
            regressed: !!signalRaw.regressed,
            decision_curve_hash: String(signalRaw.decision_curve_hash ?? "missing"),
            observed_at: String(signalRaw.observed_at ?? input.now_iso),
          })
        );

        saveCounters(runsDir(), applied.next);

        const artifact = writeProbationCounterArtifact(runsDir(), s.fingerprint, {
          kind: "ProbationCounterUpdated",
          fingerprint: s.fingerprint,
          ok: applied.ok,
          reason: applied.reason,
          counters: applied.next,
        });

        // If we hit the window, recommend eligible (still no auto activation)
        if (applied.next.successes >= applied.next.window) {
          const next: RequalificationState = {
            ...s,
            state: "ELIGIBLE",
            cause: `PROBATION_SUCCESS_${applied.next.successes}_OF_${applied.next.window}`,
            since: input.now_iso,
          };
          writeRequalificationState(next);
          writeRequalificationEvent({
            fingerprint: s.fingerprint,
            at_iso: input.now_iso,
            event: "RequalificationRecommended",
            details: {
              recommendation: "ELIGIBLE",
              state: "ELIGIBLE",
              reason: next.cause,
              artifact,
            },
          });
          eligible.push(s.fingerprint);
          recommended.push(s.fingerprint);
        }
      }
      continue;
    }

    if (s.state === "ELIGIBLE") {
      eligible.push(s.fingerprint);
      // Tier-16: machine recommendation (still requires operator activation).
      recommended.push(s.fingerprint);
      continue;
    }
  }

  return {
    kind: "RequalificationScan",
    evaluated: states.length,
    eligible,
    still_suspended,
    entered_probation,
    recommended,
  };
}

export function effectiveAutonomyModeForState(input: {
  autonomy_mode: string;
  state: RequalificationStateName;
}): string {
  if (input.autonomy_mode === "OFF") return "OFF";
  if (input.state === "PROBATION") return "READ_ONLY_AUTONOMY";
  return input.autonomy_mode;
}
