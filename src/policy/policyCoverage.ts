import fs from "node:fs";
import path from "node:path";

export type PolicyDecision = "ALLOW" | "DENY" | "APPROVAL_REQUIRED";

type PolicyHit = {
  action: string;
  decision: PolicyDecision;
  code: string; // "ALLOW" for allow hits
};

let currentAction: string | null = null;

const mem = new Set<string>();

function keyOf(h: PolicyHit) {
  return `${h.action}\t${h.decision}\t${h.code}`;
}

export function setPolicyCoverageAction(action: string) {
  currentAction = action;
}

export function recordPolicyHit(
  hit: Omit<PolicyHit, "action"> & { action?: string }
) {
  const action = hit.action ?? currentAction ?? "UNKNOWN_ACTION";
  const full: PolicyHit = { action, decision: hit.decision, code: hit.code };

  mem.add(keyOf(full));

  const out = process.env.POLICY_COVERAGE_FILE;
  if (!out) return;

  try {
    const dir = path.dirname(out);
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(out, keyOf(full) + "\n", "utf8");
  } catch (e) {
    if (process.env.POLICY_COVERAGE_STRICT === "1") {
      throw new Error(
        `POLICY_COVERAGE_WRITE_FAILED: ${(e as Error).message}`
      );
    }
  }
}

export function snapshotPolicyCoverage(): string[] {
  return [...mem.values()];
}
