import { eventBus } from "../core/eventBus.js";
import { appendAdvisorLog } from "../core/advisorLogStore.js";
import { getAllEnforcementStates } from "../enforcement/enforcementChain.js";
import { getPrimaryCandidate, listClusterNodes } from "../core/clusterManager.js";

function safeStr(v) {
  return v == null ? "" : String(v);
}

function capLength(arr) {
  return Array.isArray(arr) ? arr.length : 0;
}

function summarizeCases(items) {
  const riskHigh = items.filter((i) => {
    const r = safeStr(i?.riskLevel).toLowerCase();
    return r === "high" || r === "critical";
  }).length;
  const paused = items.filter((i) => Boolean(i?.paused)).length;
  const escalated = items.filter((i) => Number(i?.stage || 0) >= 3).length;

  return { total: items.length, riskHigh, paused, escalated };
}

function snapshotNow(reason) {
  const items = getAllEnforcementStates();
  const nodes = listClusterNodes();
  const primary = getPrimaryCandidate();

  const { total, riskHigh, paused, escalated } = summarizeCases(items);

  const online = nodes.filter((n) => safeStr(n?.status).toLowerCase() === "online").length;
  const offline = nodes.filter((n) => safeStr(n?.status).toLowerCase() === "offline").length;

  const msg = `Advisor tick (${reason || "manual"}): ${total} cases (${riskHigh} high/critical, ${escalated} escalated, ${paused} paused) • Nodes: ${capLength(nodes)} (${online} online, ${offline} offline) • Primary: ${primary?.nodeId || "none"}`;

  appendAdvisorLog({
    type: "advisor",
    level: "info",
    message: msg,
    data: { totalCases: total, riskHigh, paused, escalated, nodes: capLength(nodes), online, offline, primaryNodeId: primary?.nodeId || null },
  });
}

// --- Event bindings ---

eventBus.on("advisor.force.tick", () => {
  snapshotNow("force");
});

eventBus.on("enforcement.event", (payload) => {
  const creditor = safeStr(payload?.creditor || "").trim();
  const status = safeStr(payload?.status || "").trim();
  const details = safeStr(payload?.details || "").trim();

  appendAdvisorLog({
    type: "enforcement",
    level: "info",
    message: `${creditor || "(unknown creditor)"}: ${status || "event"}${details ? ` — ${details}` : ""}`,
    data: {
      creditor: creditor || null,
      caseId: payload?.caseId || null,
      channel: payload?.channel || null,
      status: status || null,
      details: details || null,
      link: payload?.link || null,
    },
  });
});

eventBus.on("system.error", (payload) => {
  const source = safeStr(payload?.source || "System").trim() || "System";
  const error = safeStr(payload?.error || "unknown").trim() || "unknown";

  appendAdvisorLog({
    type: "error",
    level: "error",
    message: `${source}: ${error}`,
    data: {
      source,
      error,
      context: payload?.context ?? null,
      channel: payload?.channel || null,
    },
  });
});

eventBus.on("case.update", (payload) => {
  const caseId = safeStr(payload?.caseId || "").trim();
  const title = safeStr(payload?.title || "").trim();

  appendAdvisorLog({
    type: "case",
    level: "info",
    message: `${caseId || "CASE"}: ${title || "update"}`,
    data: payload ?? null,
  });
});
