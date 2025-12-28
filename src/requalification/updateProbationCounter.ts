import { readRequalificationState, writeRequalificationEvent, writeRequalificationState } from "./requalification.js";

export type ProbationCounterArtifact = {
  fingerprint: string;
  state: "PROBATION";
  success_count: number;
  required_successes: number;
  last_success_at: string;
  notes: string[];
};

export type ProbationRunResult = {
  // Minimal shape: this module is intentionally decoupled from the full receipt schema.
  status: string;
  now_iso: string;

  // Confidence for monotonic probation.
  confidence: number;

  governor_decision: "ALLOW" | "DENY" | "DELAY";

  // Friction flags
  policy_denied: boolean;
  throttled: boolean;
  rollback_recorded: boolean;
  approval_required: boolean;

  autonomy_mode: string;
  autonomy_mode_effective: string;

  steps: Array<{ read_only?: boolean }>;
};

function clampNonNegativeInt(n: unknown, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.floor(v));
}

function addMillisIso(nowIso: string, deltaMs: number): string {
  const t = new Date(nowIso).getTime();
  if (!Number.isFinite(t)) return nowIso;
  return new Date(t + deltaMs).toISOString();
}


function modeRank(mode: string): number {
  const m = String(mode ?? "OFF");
  if (m === "OFF") return 0;
  if (m === "READ_ONLY_AUTONOMY") return 1;
  if (m === "PROPOSE_ONLY_AUTONOMY") return 2;
  if (m === "APPROVAL_GATED_AUTONOMY") return 3;
  // Unknown modes are treated as most permissive.
  return 99;
}

function qualifiesAsSuccess(runResult: ProbationRunResult): { ok: boolean; notes: string[] } {
  const notes = ["No policy denials", "No throttles", "No rollbacks", "Monotonic confidence"];

  if (runResult.status !== "success") return { ok: false, notes };
  if (runResult.governor_decision !== "ALLOW") return { ok: false, notes };

  if (runResult.policy_denied) return { ok: false, notes };
  if (runResult.throttled) return { ok: false, notes };
  if (runResult.rollback_recorded) return { ok: false, notes };
  if (runResult.approval_required) return { ok: false, notes };

  const escalated = modeRank(runResult.autonomy_mode_effective) > modeRank(runResult.autonomy_mode);
  if (escalated) return { ok: false, notes };

  return { ok: true, notes };
}

export function updateProbationCounter(input: {
  fingerprint: string;
  runResult: ProbationRunResult;
}): { success_count: number; required_successes: number } | null {
  const rq = readRequalificationState(input.fingerprint);
  if (rq?.state !== "PROBATION") return null;

  // Tier-22.1 defaults: hard-coded for now.
  const required_successes = 3;

  const lastConfidence = Number.isFinite(Number(rq.last_confidence)) ? Number(rq.last_confidence) : null;
  const prev = lastConfidence === null ? Number.NEGATIVE_INFINITY : lastConfidence;

  const confidence = Number(input.runResult.confidence);
  const confidenceOk = Number.isFinite(confidence) && confidence >= prev;
  const q = qualifiesAsSuccess(input.runResult);
  const ok = q.ok && confidenceOk;

  const currentCount = clampNonNegativeInt(rq.success_count, 0);
  const nextCount = ok ? currentCount + 1 : 0;

  // Persist counters in the Tier-22 state file.
  writeRequalificationState({
    ...rq,
    state: "PROBATION",
    // Keep rq.since unchanged while in probation.
    success_count: nextCount,
    last_confidence: Number.isFinite(confidence) ? confidence : rq.last_confidence,
    required: required_successes,
  } as any);

  // Append-only probation event.
  writeRequalificationEvent({
    fingerprint: input.fingerprint,
    at_iso: input.runResult.now_iso,
    event: "ProbationSuccess",
    details: {
      confidence: Number.isFinite(confidence) ? confidence : null,
      success_count: nextCount,
      required: required_successes,
      eligible: nextCount >= required_successes,
      ok,
      notes: q.notes,
    },
  });

  if (nextCount >= required_successes) {
    // Promote to ELIGIBLE and emit recommendation (never auto-ACTIVE).
    writeRequalificationState({
      fingerprint: input.fingerprint,
      state: "ELIGIBLE",
      cause: "PROBATION_SUCCESS_THRESHOLD",
      since: input.runResult.now_iso,
      cooldown_until: null,
      success_count: nextCount,
      last_confidence: Number.isFinite(confidence) ? confidence : rq.last_confidence,
      required: required_successes,
    } as any);

    writeRequalificationEvent({
      fingerprint: input.fingerprint,
      at_iso: addMillisIso(input.runResult.now_iso, 1),
      event: "RequalificationRecommended",
      details: {
        recommendation: "ELIGIBLE",
        confidence: Number.isFinite(confidence) ? confidence : null,
        success_count: nextCount,
        required: required_successes,
      },
    });
  }

  return { success_count: nextCount, required_successes };
}
