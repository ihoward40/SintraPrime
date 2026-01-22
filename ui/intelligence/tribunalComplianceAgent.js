import { eventBus } from "../core/eventBus.js";

function clamp01(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function heuristicCompliance(req) {
  const payload = req?.payload || {};
  const violations = [];

  if (Array.isArray(payload?.complianceViolations)) {
    for (const v of payload.complianceViolations) {
      if (!v) continue;
      violations.push(typeof v === "string" ? { code: v, level: "soft" } : v);
    }
  }

  if (payload?.requiresAttorneyReview) {
    violations.push({ code: "requires_attorney_review", level: "hard" });
  }

  const severityHint = payload?.severityScore;
  let severityScore = Number.isFinite(Number(severityHint)) ? clamp01(Number(severityHint)) : 0.25;

  if (violations.some((v) => String(v?.level || "").toLowerCase() === "hard")) severityScore = Math.max(severityScore, 0.8);

  return { violations, severityScore };
}

export function startComplianceAgent() {
  eventBus.on("tribunal.compliance.review", async (req) => {
    const actionId = String(req?.actionId || "").trim();
    if (!actionId) return;

    try {
      const result = heuristicCompliance(req);
      const violations = Array.isArray(result.violations) ? result.violations : [];
      const severity = clamp01(result.severityScore ?? 0);

      let vote = "approve";
      if (severity > 0.7 || violations.some((v) => String(v?.level || "").toLowerCase() === "hard")) vote = "deny";
      else if (severity > 0.4) vote = "throttle";

      eventBus.emit("tribunal.vote.compliance", {
        actionId,
        agent: "compliance",
        vote,
        score: clamp01(1 - severity),
        reasons: violations.length ? violations.map((v) => v.code || v.message || "compliance_violation") : ["no conflicts"],
        flags: violations.length ? violations.map((v) => v.code || "compliance_violation") : [],
      });
    } catch (err) {
      eventBus.emit("tribunal.vote.compliance", {
        actionId,
        agent: "compliance",
        vote: "throttle",
        score: 0.4,
        reasons: ["compliance_agent_error", err?.message || String(err)],
        flags: ["compliance_agent_error"],
      });
    }
  });
}
