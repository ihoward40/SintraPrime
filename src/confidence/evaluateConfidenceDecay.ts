import fs from "node:fs";
import path from "node:path";

export type ConfidenceDecayDecision = {
  decay: boolean;
  reason:
    | "NO_RECENT_ACTIVITY"
    | "STALE_CONFIDENCE"
    | "INVALID_HORIZON"
    | "INVALID_MIN_SUCCESS";
  successes_in_window: number;
  required_successes: number;
  horizon_hours: number;
};

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function safeDateMs(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function shouldDecayConfidence(input: {
  fingerprint: string;
  now_iso: string;
}): ConfidenceDecayDecision {
  const horizon_hours = parseIntEnv("CONFIDENCE_DECAY_HOURS", 72);
  const required_successes = parseIntEnv("CONFIDENCE_MIN_SUCCESS", 1);

  if (!Number.isFinite(horizon_hours) || horizon_hours <= 0) {
    return {
      decay: false,
      reason: "INVALID_HORIZON",
      successes_in_window: 0,
      required_successes,
      horizon_hours,
    };
  }

  if (!Number.isFinite(required_successes) || required_successes <= 0) {
    return {
      decay: false,
      reason: "INVALID_MIN_SUCCESS",
      successes_in_window: 0,
      required_successes,
      horizon_hours,
    };
  }

  const nowMs = new Date(input.now_iso).getTime();
  if (!Number.isFinite(nowMs)) {
    // Conservative: invalid clock => do nothing.
    return {
      decay: false,
      reason: "INVALID_HORIZON",
      successes_in_window: 0,
      required_successes,
      horizon_hours,
    };
  }

  const receiptsPath = path.join(process.cwd(), "runs", "receipts.jsonl");
  if (!fs.existsSync(receiptsPath)) {
    return {
      decay: true,
      reason: "STALE_CONFIDENCE",
      successes_in_window: 0,
      required_successes,
      horizon_hours,
    };
  }

  const horizonMs = horizon_hours * 60 * 60 * 1000;
  const cutoff = nowMs - horizonMs;

  let successes = 0;

  const lines = fs.readFileSync(receiptsPath, "utf8").split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]!;

    let r: any;
    try {
      r = JSON.parse(line);
    } catch {
      continue;
    }

    if (!r || r.fingerprint !== input.fingerprint) continue;
    if (r.status !== "success") continue;

    // Exclude administrative receipts (Tier-23 emits a success receipt too).
    if (r.kind === "ConfidenceDecayed" || r?.receipt?.kind === "ConfidenceDecayed") continue;

    const finishedMs =
      safeDateMs(r.finished_at) ?? safeDateMs(r.started_at) ?? safeDateMs(r.created_at);
    if (finishedMs === null) continue;

    if (finishedMs >= cutoff) {
      successes += 1;
      if (successes >= required_successes) {
        return {
          decay: false,
          reason: "STALE_CONFIDENCE",
          successes_in_window: successes,
          required_successes,
          horizon_hours,
        };
      }
    }
  }

  return {
    decay: true,
    reason: "STALE_CONFIDENCE",
    successes_in_window: successes,
    required_successes,
    horizon_hours,
  };
}


