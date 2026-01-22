import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

import { verifyReceiptHash } from "./receipt_verify.mjs";
import { broadcastHealthEvent } from "./health_stream.mjs";
import { incCounter, setGauge } from "./metrics.mjs";

const MODE = (process.env.SOCIALOS_STORE || "dev") === "postgres" ? "postgres" : "dev";
const MAX_STALE_MINUTES = Number(process.env.SOCIALOS_WORKER_STALE_MINUTES || "180");

export function statusFromSnapshot(s) {
  const receiptsOk = s?.receipts?.ok;
  const mismatch = Number(s?.receipts?.mismatch ?? 0);
  const schemasOk = s?.schemas?.last_lint_ok;
  const workerStale = s?.worker?.stale;
  const workerLastRun = s?.worker?.best_time_last_run;

  if (schemasOk === false) {
    return { severity: "incident", status_code: "SCHEMA_FAIL", recommended_action: "Run lint:schemas" };
  }

  if (receiptsOk === false || (Number.isFinite(mismatch) && mismatch > 0)) {
    return { severity: "incident", status_code: "RECEIPT_DRIFT", recommended_action: "Run receipts verify" };
  }

  if (workerStale === true) {
    return { severity: "attention", status_code: "WORKER_STALE", recommended_action: "Restart worker" };
  }

  if (workerLastRun == null) {
    return { severity: "unknown", status_code: "WORKER_NO_HEARTBEAT", recommended_action: "Check worker heartbeat" };
  }

  if (s?.ok === true) {
    return { severity: "stable", status_code: "HEALTH_OK", recommended_action: "None" };
  }

  if (s?.ok === false) {
    return { severity: "incident", status_code: "HEALTH_FAIL", recommended_action: "Check health details" };
  }

  return { severity: "unknown", status_code: "HEALTH_UNKNOWN", recommended_action: "Investigate telemetry" };
}

function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const out = {};
  for (const k of Object.keys(value).sort()) out[k] = canonicalize(value[k]);
  return out;
}

function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Hex(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

export function eventKeyFromSnapshot(s) {
  const key = {
    ok: s?.ok === true,
    mode: s?.mode ?? null,
    receipts: {
      ok: s?.receipts?.ok ?? null,
      checked: s?.receipts?.checked ?? 0,
      mismatch: s?.receipts?.mismatch ?? null
    },
    worker: {
      stale: s?.worker?.stale ?? null,
      best_time_last_run: s?.worker?.best_time_last_run ?? null,
      best_time_last_run_source: s?.worker?.best_time_last_run_source ?? null,
      stale_threshold_minutes: s?.worker?.stale_threshold_minutes ?? null
    },
    schemas: {
      last_lint_ok: s?.schemas?.last_lint_ok ?? null,
      last_lint_at: s?.schemas?.last_lint_at ?? null
    }
  };

  return sha256Hex(stableJson(key));
}

export function changeReasons(prev, next) {
  if (!prev) return ["first"]; 
  const reasons = [];
  if ((prev.ok ?? null) !== (next.ok ?? null)) reasons.push("ok");
  if ((prev.mode ?? null) !== (next.mode ?? null)) reasons.push("mode");
  if ((prev.receipts?.ok ?? null) !== (next.receipts?.ok ?? null)) reasons.push("receipts.ok");
  if ((prev.receipts?.checked ?? null) !== (next.receipts?.checked ?? null)) reasons.push("receipts.checked");
  if ((prev.receipts?.mismatch ?? null) !== (next.receipts?.mismatch ?? null)) reasons.push("receipts.mismatch");
  if ((prev.worker?.stale ?? null) !== (next.worker?.stale ?? null)) reasons.push("worker.stale");
  if ((prev.worker?.best_time_last_run ?? null) !== (next.worker?.best_time_last_run ?? null)) reasons.push("worker.last_run");
  if ((prev.worker?.best_time_last_run_source ?? null) !== (next.worker?.best_time_last_run_source ?? null)) reasons.push("worker.last_run_source");
  if ((prev.schemas?.last_lint_ok ?? null) !== (next.schemas?.last_lint_ok ?? null)) reasons.push("schemas.lint_ok");
  if ((prev.schemas?.last_lint_at ?? null) !== (next.schemas?.last_lint_at ?? null)) reasons.push("schemas.lint_at");
  return reasons.length ? reasons : ["minor"];
}

export function eventScopeFromReasons(reasons) {
  const rs = Array.isArray(reasons) ? reasons : [];
  const scopes = new Set();

  for (const r of rs) {
    const s = String(r || "");
    if (s.startsWith("worker.")) scopes.add("worker");
    else if (s.startsWith("schemas.")) scopes.add("schemas");
    else if (s.startsWith("receipts.")) scopes.add("receipts");
    else if (s === "mode" || s.startsWith("store.")) scopes.add("store");
    else if (s === "ok") scopes.add("system");
    else if (s === "first" || s === "minor") scopes.add("system");
  }

  const out = Array.from(scopes);
  out.sort((a, b) => String(a).localeCompare(String(b)));
  return out.length ? out : ["system"];
}

function minutesSince(iso) {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() - t) / 60000;
}

function secondsSince(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 1000));
}

let workerLastRunAgeSeconds = 0;
setGauge("worker_last_run_age_seconds", () => workerLastRunAgeSeconds);

async function readJsonOrNull(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function getSchemaLintStatus(store) {
  if (typeof store?.health?.getSchemaLintStatus === "function") {
    return store.health.getSchemaLintStatus();
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const candidate = path.resolve(__dirname, "../../../shared/runs/schema_lint_status.json");
  return readJsonOrNull(candidate);
}

export async function computeHealthSnapshot({ store } = {}) {
  const receipts = await (async () => {
    const items = await store.receipts.list({ content_id: null, platform: null, limit: 10 });
    const filtered = items.filter((r) => r?.result?.kind === "schedule_decision");
    const sample = filtered.slice(0, 5);

    const checks = sample.map((r) => {
      const v = verifyReceiptHash(r);
      return {
        ok: v.ok,
        receipt_id: r.receipt_id,
        stored: String(r.receipt_hash || "").slice(0, 16),
        recomputed: String(v.expected || "").slice(0, 16)
      };
    });

    const ok = checks.every((x) => x.ok);
    const mismatch = checks.filter((x) => !x.ok).length;
    return { ok, checked: checks.length, mismatch, checks };
  })();

  let worker;
  if (typeof store?.health?.getWorkerHeartbeat === "function") {
    const hb = await store.health.getWorkerHeartbeat("best_time");
    const lastRun = hb?.last_run || null;
    const stale = minutesSince(lastRun) > MAX_STALE_MINUTES;
    worker = {
      best_time_last_run: lastRun,
      best_time_last_run_source: MODE === "postgres" ? "postgres" : "dev_store",
      stale,
      stale_threshold_minutes: MAX_STALE_MINUTES
    };
  } else {
    worker = {
      best_time_last_run: null,
      best_time_last_run_source: null,
      stale: null,
      stale_threshold_minutes: MAX_STALE_MINUTES
    };
  }

  const schema = await getSchemaLintStatus(store);
  const schemas = schema
    ? { last_lint_ok: !!schema.ok, last_lint_at: schema.at || null, commit: schema.commit || null }
    : { last_lint_ok: null, last_lint_at: null };

  const ok = receipts.ok !== false && worker.stale !== true && schemas.last_lint_ok !== false;

  const snapshot = {
    at: new Date().toISOString(),
    ok,
    mode: MODE,
    receipts: {
      ok: receipts.ok,
      checked: receipts.checked ?? 0,
      mismatch: receipts.mismatch ?? 0
    },
    worker: {
      best_time_last_run: worker.best_time_last_run ?? null,
      best_time_last_run_source: worker.best_time_last_run_source ?? null,
      stale: worker.stale ?? null,
      stale_threshold_minutes: worker.stale_threshold_minutes ?? MAX_STALE_MINUTES
    },
    schemas: {
      last_lint_ok: schemas.last_lint_ok ?? null,
      last_lint_at: schemas.last_lint_at ?? null
    }
  };

  const status = statusFromSnapshot(snapshot);
  snapshot.severity = status.severity;
  snapshot.status_code = status.status_code;
  snapshot.recommended_action = status.recommended_action;

  snapshot.event_key = eventKeyFromSnapshot(snapshot);

  // Update a few gauges opportunistically.
  try {
    const age = secondsSince(snapshot?.worker?.best_time_last_run || null);
    workerLastRunAgeSeconds = Number.isFinite(age) ? age : 0;
  } catch {
    // ignore
  }

  return { snapshot, receipts, worker, schemas, ok, mode: MODE };
}

export async function maybeAppendHealthSnapshot({ store, snapshot, source } = {}) {
  const canAppend = typeof store?.health?.appendHealthSnapshot === "function";
  if (!canAppend) return false;

  const canReadLatest = typeof store?.health?.getLatestHealthSnapshot === "function";
  const prev = canReadLatest ? await store.health.getLatestHealthSnapshot() : null;
  const prevKey = prev?.event_key ?? null;

  if ((snapshot?.event_key ?? null) === prevKey) return false;

  const reasons = changeReasons(prev, snapshot);
  snapshot.event_reason = reasons;
  snapshot.event_scope = eventScopeFromReasons(reasons);
  snapshot.source = source || "poll";

  await store.health.appendHealthSnapshot(snapshot);

  try {
    if (snapshot?.status_code === "RECEIPT_DRIFT") incCounter("drift_fail_total", 1);
  } catch {
    // ignore
  }

  try {
    // Best-effort: never fail persistence due to stream failures.
    broadcastHealthEvent(snapshot);
  } catch {
    // ignore
  }
  return true;
}

export async function emitHealthSnapshot({ store, source } = {}) {
  try {
    const { snapshot } = await computeHealthSnapshot({ store });
    await maybeAppendHealthSnapshot({ store, snapshot, source });
    return true;
  } catch {
    return false;
  }
}
