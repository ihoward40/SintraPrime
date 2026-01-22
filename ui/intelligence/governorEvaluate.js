import { getCurrentTrustSnapshot } from "./trustSnapshot.js";
import { getGovernorRules } from "./governorRules.js";
import { runHolodeckQuickSim } from "./strategyHolodeckQuick.js";

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeMode(mode) {
  const m = String(mode || "standard").trim().toLowerCase();
  return m || "standard";
}

function hardViolations({ snapshot, rules }) {
  const violations = [];

  const cashBuffer = Number(snapshot?.cashBufferMonths ?? 0);
  if (Number.isFinite(Number(rules?.minCashBufferMonths)) && cashBuffer < Number(rules.minCashBufferMonths)) {
    violations.push("Cash < MinBuffer");
  }

  const openCases = Number(snapshot?.openCases ?? 0);
  if (Number.isFinite(Number(rules?.maxOpenCases)) && openCases > Number(rules.maxOpenCases)) {
    violations.push("Too Many Open Cases");
  }

  if (snapshot?.deadlinesHeavy) {
    violations.push("Deadlines Heavy");
  }

  if (Number(snapshot?.marketVolatilityScore ?? 0) > Number(rules?.volatilityThreshold ?? 10)) {
    violations.push("Trading Volatility High");
  }

  if (Number(snapshot?.taxExposureScore ?? 0) > 7) {
    violations.push("Tax Exposure High");
  }

  if (Array.isArray(snapshot?.complianceFlags) && snapshot.complianceFlags.length) {
    violations.push("Compliance Conflict");
  }

  return violations;
}

function recommendAlternatives({ violations, rules, snapshot }) {
  const rec = [];
  const cashBuffer = Number(snapshot?.cashBufferMonths ?? 0);
  const min = Number(rules?.minCashBufferMonths ?? 0);

  if (violations.includes("Cash < MinBuffer")) {
    rec.push(`Throttle execution until cash buffer ≥ ${Number.isFinite(min) ? min : 1} months (current: ${Number.isFinite(cashBuffer) ? cashBuffer : "?"}).`);
    rec.push("Switch to Conservative mode and reduce scope.");
  }

  if (violations.includes("Too Many Open Cases")) {
    rec.push("Throttle: wait for case load to drop, or close/resolve highest-risk cases first.");
  }

  if (violations.includes("Deadlines Heavy")) {
    rec.push("Defer non-deadline-critical actions; focus on the next 72h deadline stack.");
  }

  if (violations.includes("Trading Volatility High")) {
    rec.push("Prefer smaller allocations or wait for volatility to normalize below threshold.");
  }

  if (violations.includes("Tax Exposure High")) {
    rec.push("Route to tax-safe mode: reduce taxable events; request tax review.");
  }

  if (violations.includes("Compliance Conflict")) {
    rec.push("Prepare draft for attorney/compliance review instead of executing.");
  }

  return rec;
}

export async function evaluateGovernorRequest(req) {
  const type = String(req?.type || "filing").trim().toLowerCase() || "filing";
  const mode = normalizeMode(req?.mode);
  const snapshot = getCurrentTrustSnapshot();
  const rules = await getGovernorRules(type);

  const violations = hardViolations({ snapshot, rules });
  if (violations.length) {
    return {
      ok: true,
      final: "deny",
      reason: "hard_block",
      violations,
      sim: null,
      rules,
      snapshot,
      recommendedAlternative: recommendAlternatives({ violations, rules, snapshot }),
    };
  }

  const sim = await runHolodeckQuickSim(
    { ...(req || {}), type, mode },
    snapshot,
    rules,
    { horizonDays: 10 },
  );

  const riskScore = clamp01(sim?.riskScore ?? 0.5);
  const tol = Number(rules?.riskTolerance ?? 6);
  const riskLimit = clamp01(tol / 10);

  if (riskScore > riskLimit) {
    const simViolations = ["Simulation risk too high"];
    return {
      ok: true,
      final: "deny",
      reason: "sim_block",
      violations: simViolations,
      sim,
      rules,
      snapshot,
      recommendedAlternative: [
        "Throttle or reduce scope; re-run with Conservative mode.",
        "Break action into smaller steps and re-check Governor.",
      ],
    };
  }

  const cashBufferMonths = Number(sim?.cashBufferMonths ?? snapshot?.cashBufferMonths ?? 0);
  if (Number.isFinite(Number(rules?.minCashBufferMonths)) && cashBufferMonths < Number(rules.minCashBufferMonths)) {
    const simViolations = ["Cash buffer violation"];
    return {
      ok: true,
      final: "deny",
      reason: "cash_block",
      violations: simViolations,
      sim,
      rules,
      snapshot,
      recommendedAlternative: [
        "Throttle until buffer is restored; consider smaller allocation/spend.",
        "Switch to Conservative mode and re-check.",
      ],
    };
  }

  if (Number(snapshot?.openCases ?? 0) > Number(rules?.maxOpenCases ?? 9999)) {
    return {
      ok: true,
      final: "throttle",
      reason: "case_load",
      violations: ["Too many cases open"],
      sim,
      rules,
      snapshot,
      recommendedAlternative: ["Delay execution until open case count drops below threshold."],
    };
  }

  return {
    ok: true,
    final: "approve",
    reason: "ok",
    violations: [],
    sim,
    rules,
    snapshot,
    recommendedAlternative: [],
  };
}
