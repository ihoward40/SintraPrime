import { eventBus } from "../core/eventBus.js";

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function heuristicStrategyFit(req) {
  const mode = String(req?.mode || "standard").toLowerCase();
  const type = String(req?.type || "unknown").toLowerCase();
  const payload = req?.payload || {};

  const alignmentHint = payload?.alignmentScore;
  if (Number.isFinite(Number(alignmentHint))) {
    return { alignmentScore: clamp01(Number(alignmentHint)), conflicts: [] };
  }

  let alignment = 0.62;
  const conflicts = [];

  if (mode === "nuclear") {
    alignment -= 0.15;
    conflicts.push("mode:nuclear_requires_justification");
  }

  if ((type === "filing" || type === "motion") && payload?.factsCompleteness === "low") {
    alignment -= 0.18;
    conflicts.push("facts_incomplete");
  }

  if (payload?.contradictsPriorPosition) {
    alignment -= 0.25;
    conflicts.push("position_conflict");
  }

  return { alignmentScore: clamp01(alignment), conflicts };
}

export function startStrategyAgent() {
  eventBus.on("tribunal.strategy.review", async (req) => {
    const actionId = String(req?.actionId || "").trim();
    if (!actionId) return;

    try {
      const fit = heuristicStrategyFit(req);
      const alignment = clamp01(fit.alignmentScore ?? 0.5);
      const conflicts = Array.isArray(fit.conflicts) ? fit.conflicts : [];

      let vote = "approve";
      if (alignment < 0.4 && conflicts.length >= 2) vote = "deny";
      else if (alignment < 0.6) vote = "throttle";

      eventBus.emit("tribunal.vote.strategy", {
        actionId,
        agent: "strategy",
        vote,
        score: alignment,
        reasons: conflicts.length ? conflicts : ["aligned with strategy"],
        flags: conflicts.map((c) => `conflict:${c}`),
      });
    } catch (err) {
      eventBus.emit("tribunal.vote.strategy", {
        actionId,
        agent: "strategy",
        vote: "throttle",
        score: 0.4,
        reasons: ["strategy_agent_error", err?.message || String(err)],
        flags: ["strategy_agent_error"],
      });
    }
  });
}
