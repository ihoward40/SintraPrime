import { eventBus } from "../core/eventBus.js";

function isEnabled() {
  return String(process.env.ADAPTIVE_ENFORCEMENT_ENABLED || "").trim() === "1";
}

function voiceEnabled() {
  const v = String(process.env.ADAPTIVE_ENFORCEMENT_VOICE || "1").trim();
  return v === "1";
}

const adaptivePolicies = {
  telco: {
    baseDaysBetweenStages: 30,
    tightenOnHighRisk: 0.5,
    escalateOnIgnore: true,
    tone: "firm",
    voice: "dragon",
    slackChannel: "#verizon-watch",
  },
  junk_debt_buyer: {
    baseDaysBetweenStages: 20,
    tightenOnHighRisk: 0.4,
    escalateOnIgnore: true,
    tone: "surgical",
    voice: "scribe",
    slackChannel: "#junk-debt",
  },
  major_bank: {
    baseDaysBetweenStages: 25,
    tightenOnHighRisk: 0.6,
    escalateOnIgnore: true,
    tone: "formal",
    voice: "judge",
    slackChannel: "#ews-chase",
  },
  secured_lender: {
    baseDaysBetweenStages: 30,
    tightenOnHighRisk: 0.5,
    escalateOnIgnore: true,
    tone: "calm",
    voice: "guardian",
    slackChannel: "#dakota-financial",
  },
  default: {
    baseDaysBetweenStages: 30,
    tightenOnHighRisk: 0.5,
    escalateOnIgnore: false,
    tone: "neutral",
    voice: "oracle",
    slackChannel: "#all-ikesolutions",
  },
};

const recentUpdateByCreditor = new Map();
const updateDedupeMs = 60 * 60 * 1000; // 1h

function shouldDedupeUpdate(creditorKey) {
  const k = String(creditorKey || "").trim();
  if (!k) return false;
  const now = Date.now();

  for (const [rk, ts] of recentUpdateByCreditor.entries()) {
    if (now - ts > updateDedupeMs) recentUpdateByCreditor.delete(rk);
  }

  if (recentUpdateByCreditor.has(k)) return true;
  recentUpdateByCreditor.set(k, now);
  return false;
}

function getPolicyFor({ creditor, classification } = {}) {
  const name = String(creditor || classification?.name || "");
  const type = String(classification?.type || "").trim();

  if (/verizon/i.test(name)) return adaptivePolicies.telco;
  if (/lvnv|midland|portfolio recovery|cavalry/i.test(name)) return adaptivePolicies.junk_debt_buyer;
  if (/chase|jpmorgan|early warning|\bews\b/i.test(name)) return adaptivePolicies.major_bank;
  if (/dakota financial/i.test(name)) return adaptivePolicies.secured_lender;

  return adaptivePolicies[type] || adaptivePolicies.default;
}

function deriveFlags({ prediction } = {}) {
  const likely = String(prediction?.likelyBehavior || "").toLowerCase();
  return {
    likelyToIgnore: likely === "ignore",
    likelyToStall: likely === "stall",
    likelyToEscalate: likely === "escalate",
  };
}

function formatAdaptiveUpdate({ creditor, riskLevel, behaviorFlags, policy } = {}) {
  return [
    `🧠 *Adaptive Enforcement Updated for ${creditor}*`,
    `Risk: ${riskLevel || "unknown"}`,
    `Likely to ignore: ${behaviorFlags?.likelyToIgnore ? "Yes" : "No"}`,
    `Likely to stall: ${behaviorFlags?.likelyToStall ? "Yes" : "No"}`,
    `Likely to escalate: ${behaviorFlags?.likelyToEscalate ? "Yes" : "No"}`,
    `Timeline base: ${policy?.baseDaysBetweenStages ?? "?"} days`,
    `Tone: ${policy?.tone || "neutral"}`,
  ].join("\n");
}

function voiceAdaptiveUpdate({ creditor, riskLevel, behaviorFlags } = {}) {
  return (
    `Adaptive enforcement profile updated for ${creditor}. ` +
    `Risk level: ${riskLevel || "unknown"}. ` +
    `Likely to ignore: ${behaviorFlags?.likelyToIgnore ? "yes" : "no"}. ` +
    `Likely to escalate: ${behaviorFlags?.likelyToEscalate ? "yes" : "no"}.`
  );
}

const adaptiveState = new Map();
function getAdaptiveState(creditor) {
  const c = String(creditor || "").trim();
  if (!c) return null;
  if (!adaptiveState.has(c)) {
    adaptiveState.set(c, {
      policy: adaptivePolicies.default,
      riskLevel: "unknown",
      lastPrediction: null,
      behaviorFlags: { likelyToIgnore: false, likelyToStall: false, likelyToEscalate: false },
      updatedAt: 0,
    });
  }
  return adaptiveState.get(c);
}

async function onBehaviorPredicted(payload = {}) {
  if (!isEnabled()) return;

  const creditor = String(payload?.creditor || "").trim();
  if (!creditor) return;

  const state = getAdaptiveState(creditor);
  if (!state) return;

  const caseId = payload?.caseId || payload?.classification?.context?.caseId || payload?.classification?.context?.case_id || null;

  const policy = getPolicyFor({ creditor, classification: payload?.classification });
  const riskLevel = String(payload?.classification?.risk || "unknown").toLowerCase();
  const behaviorFlags = deriveFlags({ prediction: payload?.prediction });

  state.policy = policy;
  state.riskLevel = riskLevel;
  state.lastPrediction = payload?.prediction || null;
  state.behaviorFlags = behaviorFlags;
  state.updatedAt = Date.now();

  const creditorKey = String(payload?.creditorKey || creditor).toLowerCase();
  if (shouldDedupeUpdate(creditorKey)) {
    eventBus.emit("adaptive.policy.updated", {
      creditor,
      policy,
      riskLevel,
      behaviorFlags,
      channel: payload?.channel,
      caseId: caseId || undefined,
    });
    return;
  }

  const channel = payload?.channel || policy?.slackChannel || "#all-ikesolutions";

  eventBus.emit("case.update", {
    channel,
    caseId: caseId || creditor,
    title: `🧠 Adaptive Enforcement — ${creditor}`,
    summary: formatAdaptiveUpdate({ creditor, riskLevel, behaviorFlags, policy }),
    idempotency_key: `adaptive:update:${creditorKey}:${new Date().toISOString().slice(0, 13)}`,
  });

  if (voiceEnabled()) {
    eventBus.emit("briefing.voice", {
      channel,
      character: policy?.voice || "oracle",
      subdir: "autonomous/adaptive",
      outputDir: "output/audio",
      title: `Adaptive Enforcement — ${creditor}`,
      initial_comment: `🎤 *Adaptive Enforcement (${String(policy?.voice || "oracle").toUpperCase()})*`,
      text: voiceAdaptiveUpdate({ creditor, riskLevel, behaviorFlags }),
    });
  }

  eventBus.emit("adaptive.policy.updated", {
    creditor,
    policy,
    riskLevel,
    behaviorFlags,
    channel,
    caseId: caseId || undefined,
  });
}

async function onEnforcementOverdue(payload = {}) {
  if (!isEnabled()) return;

  const creditor = String(payload?.creditor || "").trim();
  if (!creditor) return;

  const caseId = payload?.caseId || null;

  const state = getAdaptiveState(creditor);
  const policy = state?.policy || adaptivePolicies.default;
  const channel = payload?.channel || policy?.slackChannel || "#all-ikesolutions";

  if (state?.behaviorFlags?.likelyToIgnore && policy?.escalateOnIgnore) {
    eventBus.emit("enforcement.event", {
      channel,
      creditor,
      status: "⚠️ Adaptive escalation suggested",
      details: "Predicted ignore pattern + overdue response window.",
      idempotency_key: `adaptive:overdue:escalate:${creditor}:${new Date().toISOString().slice(0, 13)}`,
    });

    eventBus.emit("enforcement.chain.adaptiveEscalate", {
      creditor,
      caseId: caseId || undefined,
      reason: "Predicted ignore pattern + overdue response",
      accountRef: payload?.accountRef,
      channel,
    });

    if (voiceEnabled()) {
      eventBus.emit("briefing.voice", {
        channel,
        character: policy?.voice || "oracle",
        subdir: "autonomous/adaptive",
        outputDir: "output/audio",
        title: `Adaptive Escalation — ${creditor}`,
        initial_comment: `🎤 *Adaptive Escalation*`,
        text: `Creditor ${creditor} is overdue and predicted to ignore. Adaptive enforcement recommends escalation to the next stage.`,
      });
    }
  } else {
    eventBus.emit("enforcement.event", {
      channel,
      creditor,
      status: "⏳ Overdue window reached",
      details: "Adaptive policy does not require aggressive escalation at this time.",
      idempotency_key: `adaptive:overdue:note:${creditor}:${new Date().toISOString().slice(0, 13)}`,
    });
  }
}

let registered = false;
export function registerAdaptiveEnforcementAI() {
  if (registered) return;
  registered = true;

  eventBus.on("behavior.predicted", (p) => {
    void onBehaviorPredicted(p);
  });

  eventBus.on("enforcement.overdue", (p) => {
    void onEnforcementOverdue(p);
  });
}

registerAdaptiveEnforcementAI();
