import { eventBus } from "../core/eventBus.js";
import { runHolodeckQuickSim } from "./strategyHolodeckQuick.js";

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function startRiskAgent() {
  eventBus.on("tribunal.risk.review", async (req) => {
    const actionId = String(req?.actionId || "").trim();
    if (!actionId) return;

    try {
      const sim = await runHolodeckQuickSim(req, req?.context?.trustSnapshot, req?.context?.rules, { horizonDays: 10 });
      const riskScore = clamp01(sim?.riskScore ?? 0.5);
      const cashBuffer = Number(sim?.cashBufferMonths ?? 0);

      const flags = [];
      if (riskScore > 0.75) flags.push("risk_high");
      if (cashBuffer < 1) flags.push("cash_low");
      if (req?.context?.trustSnapshot?.deadlinesHeavy) flags.push("deadlines_heavy");

      let vote = "approve";
      if (flags.includes("risk_high")) vote = "deny";
      else if (flags.includes("cash_low") || flags.includes("deadlines_heavy")) vote = "throttle";

      eventBus.emit("tribunal.vote.risk", {
        actionId,
        agent: "risk",
        vote,
        score: clamp01(1 - riskScore),
        riskScore,
        reasons: flags.length ? flags : ["risk within band"],
        flags,
      });
    } catch (err) {
      eventBus.emit("tribunal.vote.risk", {
        actionId,
        agent: "risk",
        vote: "throttle",
        score: 0.3,
        riskScore: 0.85,
        reasons: ["risk_agent_error", err?.message || String(err)],
        flags: ["risk_agent_error"],
      });
    }
  });
}
