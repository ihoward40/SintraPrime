import { eventBus } from "../core/eventBus.js";
import { appendTimelineEvent } from "../core/timelineStore.js";
import { getAllEnforcementStates } from "../enforcement/enforcementChain.js";

function safeStr(v) {
  return v == null ? "" : String(v);
}

function findOwnerFor(creditor, caseId) {
  const items = getAllEnforcementStates();
  const lcCred = safeStr(creditor).trim().toLowerCase();
  const cid = caseId != null ? safeStr(caseId).trim() : null;

  for (const it of items) {
    if (cid && safeStr(it?.caseId).trim() !== cid) continue;
    if (lcCred && !safeStr(it?.creditor).toLowerCase().includes(lcCred)) continue;
    if (it?.ownerNodeId) return it.ownerNodeId;
  }
  return null;
}

// Record enforcement chain steps into the timeline.

eventBus.on("enforcement.chain.step", (payload) => {
  appendTimelineEvent({
    caseId: payload?.caseId || null,
    creditor: payload?.creditor || null,
    ownerNodeId: payload?.ownerNodeId || findOwnerFor(payload?.creditor, payload?.caseId),
    type: "enforcement.chain.step",
    title: `Stage ${safeStr(payload?.stage || "?")}`,
    message: payload?.adminReason || payload?.adaptiveReason || null,
    data: payload ?? null,
  });
});

eventBus.on("enforcement.event", (payload) => {
  appendTimelineEvent({
    caseId: payload?.caseId || null,
    creditor: payload?.creditor || null,
    ownerNodeId: payload?.ownerNodeId || findOwnerFor(payload?.creditor, payload?.caseId),
    type: "enforcement.event",
    title: safeStr(payload?.status || "Enforcement Event") || "Enforcement Event",
    message: payload?.details != null ? safeStr(payload.details) : null,
    data: payload ?? null,
  });
});

eventBus.on("system.error", (payload) => {
  appendTimelineEvent({
    caseId: null,
    creditor: null,
    ownerNodeId: null,
    type: "system.error",
    title: safeStr(payload?.source || "System") || "System",
    message: safeStr(payload?.error || "unknown") || "unknown",
    data: payload ?? null,
  });
});

eventBus.on("omni.plan.for-case", ({ creditor, caseId, plan } = {}) => {
  appendTimelineEvent({
    caseId: caseId || null,
    creditor: creditor || null,
    ownerNodeId: null,
    type: "omni.plan.for-case",
    title: "OmniSkill plan created",
    message: plan?.intent ? `Intent: ${plan.intent}` : null,
    data: { plan: plan || null },
  });
});
