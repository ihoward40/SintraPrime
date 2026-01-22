import type { ExecutionRunLog } from "../executor/executePlan.js";
import fs from "node:fs";
import path from "node:path";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function lastEgressPolicySnapshot(runLog: ExecutionRunLog): {
  decision_reason: string;
  allowlist_match: "exact" | "regex" | "none";
  approved_hash: string | null;
  current_hash: string | null;
  approval_freshness_mode: "max_age_ok" | "approved_after_index" | "fail" | "n/a";
} | null {
  const steps = Array.isArray((runLog as any)?.steps) ? ((runLog as any).steps as any[]) : [];
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const snap = steps[i]?.egress_policy_snapshot;
    if (!isRecord(snap)) continue;
    if (snap.requires_guard !== true) continue;

    const decision_reason = typeof snap.decision_reason === "string" ? snap.decision_reason : "";
    const allowlist_match = snap.allowlist_match;
    const approved_hash = typeof snap.approved_hash === "string" ? snap.approved_hash : null;
    const current_hash = typeof snap.current_hash === "string" ? snap.current_hash : null;
    const approval_freshness_mode = snap.approval_freshness_mode;

    const allowOk = allowlist_match === "exact" || allowlist_match === "regex" || allowlist_match === "none";
    const freshnessOk =
      approval_freshness_mode === "max_age_ok" ||
      approval_freshness_mode === "approved_after_index" ||
      approval_freshness_mode === "fail" ||
      approval_freshness_mode === "n/a";

    if (!decision_reason || !allowOk || !freshnessOk) continue;

    return {
      decision_reason,
      allowlist_match,
      approved_hash,
      current_hash,
      approval_freshness_mode,
    };
  }
  return null;
}

export async function persistRun(runLog: ExecutionRunLog) {
  const planVersion = process.env.PLAN_VERSION ?? "ExecutionPlan@1";
  const denied = runLog.status === "denied";
  const kindFromStatus = (s: unknown) => {
    if (s === "throttled") return "Throttled";
    return "RunReceipt";
  };

  const receipt = {
    kind: (runLog as any).kind ?? kindFromStatus(runLog.status),
    execution_id: runLog.execution_id,
    threadId: runLog.threadId,
    status: runLog.status,
    fingerprint: (runLog as any).fingerprint ?? null,
    autonomy_mode: (runLog as any).autonomy_mode ?? null,
    autonomy_mode_effective: (runLog as any).autonomy_mode_effective ?? null,
    throttle_reason: (runLog as any).throttle_reason ?? null,
    retry_after: (runLog as any).retry_after ?? null,
    receipt_hash: runLog.receipt_hash ?? null,
    plan_hash: (runLog as any).plan_hash ?? null,
    started_at: runLog.started_at,
    finished_at: runLog.finished_at ?? null,
    plan_version: planVersion,
    agent_versions: runLog.agent_versions ?? null,
    resolved_capabilities: runLog.resolved_capabilities ?? null,
    phases_planned: runLog.phases_planned ?? null,
    phases_executed: runLog.phases_executed ?? null,
    denied_phase: runLog.denied_phase ?? null,
    policy_code: runLog.policy_denied?.code ?? null,
    artifacts: runLog.artifacts ?? null,
    policy_denied: runLog.policy_denied ?? null,
    approval_required: (runLog as any).approval_required ?? null,
    policy: {
      checked: true,
      denied,
      code: runLog.policy_denied?.code ?? null,
    },
    // Compact operator-friendly summary derived from the last guarded external step.
    // Useful for quick “why did it pass/fail” inspection without parsing the full step log.
    egress_policy_snapshot: lastEgressPolicySnapshot(runLog),
  };

  // Allow custom receipts to attach structured payloads without expanding the
  // base RunReceipt schema. This supports Tier-22.* deterministic receipts.
  const extra = (runLog as any).receipt;
  if (isRecord(extra)) {
    const reserved = new Set([
      "kind",
      "execution_id",
      "threadId",
      "status",
      "fingerprint",
      "autonomy_mode",
      "autonomy_mode_effective",
      "throttle_reason",
      "retry_after",
      "receipt_hash",
      "plan_hash",
      "started_at",
      "finished_at",
      "plan_version",
      "agent_versions",
      "resolved_capabilities",
      "phases_planned",
      "phases_executed",
      "denied_phase",
      "policy_code",
      "artifacts",
      "policy_denied",
      "approval_required",
      "policy",
    ]);

    for (const [k, v] of Object.entries(extra)) {
      if (reserved.has(k)) continue;
      (receipt as any)[k] = v;
    }
  }

  const persistLocal = process.env.PERSIST_LOCAL_RECEIPTS === "1";

  const writeLocal = () => {
    const runsDir = path.join(process.cwd(), "runs");
    fs.mkdirSync(runsDir, { recursive: true });
    const file = path.join(runsDir, "receipts.jsonl");
    fs.appendFileSync(file, `${JSON.stringify(receipt)}\n`, { encoding: "utf8" });
  };

  const url = process.env.NOTION_RUNS_WEBHOOK;
  if (!url) {
    writeLocal();
    return;
  }

  if (persistLocal) {
    writeLocal();
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Keep the Notion payload small and stable.
    body: JSON.stringify(receipt),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`persistRun failed (${res.status}): ${text}`);
  }
}
