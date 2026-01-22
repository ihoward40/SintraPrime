import { eventBus } from "../core/eventBus.js";
import { enqueueAction, setDecision } from "./governorState.js";
import { getGovernorRules, ensureLocalGovernorRulesSeed } from "./governorRules.js";
import { getCurrentTrustSnapshot } from "./trustSnapshot.js";
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

function hasHardBlock({ snapshot, rules }) {
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

function toGovernorDecision({ action, final, reason, violations, sim, tribunal }) {
  return {
    actionId: action?.actionId,
    final,
    reason: reason || null,
    violations: Array.isArray(violations) ? violations : [],
    sim: sim || null,
    tribunal: tribunal || null,
    decidedAt: new Date().toISOString(),
    request: action?.req || null,
  };
}

export function startGovernor() {
  ensureLocalGovernorRulesSeed();

  eventBus.on("governor.action.request", async (req) => {
    const action = enqueueAction({
      ...req,
      type: String(req?.type || "unknown").toLowerCase(),
      mode: normalizeMode(req?.mode),
    });

    const snapshot = getCurrentTrustSnapshot();
    const rules = await getGovernorRules(action.req.type);

    // Step 1 — Hard blocks
    const violations = hasHardBlock({ snapshot, rules });
    if (violations.length) {
      const decision = toGovernorDecision({ action, final: "deny", reason: "hard_block", violations });
      setDecision(action.actionId, decision);
      eventBus.emit("governor.action.denied", decision);
      eventBus.emit("governor.decision", decision);
      return;
    }

    // Step 2 — Tribunal review (Level XXVII)
    const tribunalEnabled = String(process.env.TRIBUNAL_ENABLED || "1").trim() === "1";
    if (tribunalEnabled) {
      eventBus.emit("tribunal.action.review", {
        ...action.req,
        actionId: action.actionId,
        context: { trustSnapshot: snapshot, rules },
      });
      return;
    }

    // Step 3 — Quick sim
    const sim = await runHolodeckQuickSim(action.req, snapshot, rules, { horizonDays: 10 });
    const riskScore = clamp01(sim?.riskScore ?? 0.5);
    const cashBufferMonths = Number(sim?.cashBufferMonths ?? 0);
    const tol = Number(rules?.riskTolerance ?? 6);

    if (riskScore > clamp01(tol / 10)) {
      const decision = toGovernorDecision({
        action,
        final: "deny",
        reason: "sim_block",
        violations: ["Simulation risk too high"],
        sim,
      });
      setDecision(action.actionId, decision);
      eventBus.emit("governor.action.denied", decision);
      eventBus.emit("governor.decision", decision);
      return;
    }

    if (Number.isFinite(Number(rules?.minCashBufferMonths)) && cashBufferMonths < Number(rules.minCashBufferMonths)) {
      const decision = toGovernorDecision({
        action,
        final: "deny",
        reason: "cash_block",
        violations: ["Cash buffer violation"],
        sim,
      });
      setDecision(action.actionId, decision);
      eventBus.emit("governor.action.denied", decision);
      eventBus.emit("governor.decision", decision);
      return;
    }

    // Step 4 — Throttle
    if (Number(snapshot?.openCases ?? 0) > Number(rules?.maxOpenCases ?? 9999)) {
      const decision = toGovernorDecision({
        action,
        final: "throttle",
        reason: "case_load",
        violations: ["Too many cases open"],
        sim,
      });
      setDecision(action.actionId, decision);
      eventBus.emit("governor.action.throttled", decision);
      eventBus.emit("governor.decision", decision);
      return;
    }

    // Step 5 — Approve
    const decision = toGovernorDecision({ action, final: "approve", reason: "ok", sim });
    setDecision(action.actionId, decision);
    eventBus.emit("governor.action.approved", decision);
    eventBus.emit("governor.decision", decision);
  });

  eventBus.on("tribunal.decision", ({ request, decision }) => {
    const actionId = String(decision?.actionId || request?.actionId || "").trim();
    if (!actionId) return;

    const final = String(decision?.final || "override_required");
    const payload = {
      actionId,
      final,
      reason: "tribunal",
      violations: [],
      sim: null,
      tribunal: decision,
      decidedAt: new Date().toISOString(),
      request: request || null,
    };

    setDecision(actionId, payload);

    if (final === "approve") eventBus.emit("governor.action.approved", payload);
    else if (final === "deny") eventBus.emit("governor.action.denied", payload);
    else if (final === "throttle") eventBus.emit("governor.action.throttled", payload);
    else eventBus.emit("governor.action.override.required", payload);

    eventBus.emit("governor.decision", payload);
  });
}
