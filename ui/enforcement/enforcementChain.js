import { eventBus } from "../core/eventBus.js";
import { getSelfNodeId, pickOwnerNodeForCase } from "../core/clusterManager.js";

const enforcementState = new Map();

const modePresets = {
  conservative: {
    label: "Conservative",
    urgencyMultiplier: 1.5,
    maxStage: 3,
  },
  standard: {
    label: "Standard",
    urgencyMultiplier: 1.0,
    maxStage: 4,
  },
  aggressive: {
    label: "Aggressive",
    urgencyMultiplier: 0.5,
    maxStage: 5,
  },
};

let systemMode = String(process.env.ENFORCEMENT_SYSTEM_MODE || "standard").trim().toLowerCase() || "standard";
if (!modePresets[systemMode]) systemMode = "standard";

function normalizeCreditorKey(creditor) {
  return String(creditor || "unknown")
    .trim()
    .toLowerCase();
}

function normalizeCaseId(caseId) {
  const c = String(caseId || "").trim();
  return c || "global";
}

function makeKey(creditor, caseId) {
  return `${normalizeCreditorKey(creditor)}::${normalizeCaseId(caseId)}`;
}

export function getSystemMode() {
  return systemMode;
}

export function setSystemMode(mode) {
  const m = String(mode || "").trim().toLowerCase();
  if (!modePresets[m]) return systemMode;
  systemMode = m;
  eventBus.emit("system.mode.updated", { mode: systemMode });
  return systemMode;
}

export function getModePresets() {
  return modePresets;
}

function getPreset(mode) {
  const m = String(mode || "").trim().toLowerCase();
  return modePresets[m] || modePresets.standard;
}

function getState(creditor, caseId) {
  const creditorName = String(creditor || "").trim();
  if (!creditorName) return null;

  const key = makeKey(creditorName, caseId);
  if (!enforcementState.has(key)) {
    enforcementState.set(key, {
      key,
      creditor: creditorName,
      caseId: normalizeCaseId(caseId) === "global" ? null : String(caseId).trim(),
      openedAt: Date.now(),
      ownerNodeId: null,
      stage: 0,
      lastActionAt: 0,
      paused: false,
      strategy: null,
      channel: null,
      persona: null,
      baseDaysBetweenStages: null,
      urgencyMultiplier: 1.0,
      mode: systemMode,
      riskLevel: "unknown",
      behaviorFlags: {},
      policy: null,
      adaptiveManaged: false,
    });
  }
  return enforcementState.get(key);
}

export function setCaseConfig({ creditor, caseId, mode, baseDaysOverride, urgencyOverride, paused } = {}) {
  const state = getState(creditor, caseId);
  if (!state) return null;

  if (mode && modePresets[String(mode).trim().toLowerCase()]) {
    state.mode = String(mode).trim().toLowerCase();
  }

  if (typeof baseDaysOverride === "number" && Number.isFinite(baseDaysOverride) && baseDaysOverride > 0) {
    state.baseDaysBetweenStages = baseDaysOverride;
  }

  if (typeof urgencyOverride === "number" && Number.isFinite(urgencyOverride) && urgencyOverride > 0) {
    state.urgencyMultiplier = urgencyOverride;
  }

  if (typeof paused === "boolean") {
    state.paused = paused;
  }

  eventBus.emit("case.config.updated", {
    creditor: state.creditor,
    caseId: state.caseId,
    state,
  });

  return state;
}

export function getCaseConfig({ creditor, caseId } = {}) {
  return getState(creditor, caseId);
}

export function getAllEnforcementStates() {
  return Array.from(enforcementState.values()).map((s) => ({
    key: s.key,
    creditor: s.creditor,
    caseId: s.caseId,
    openedAt: s.openedAt || null,
    ownerNodeId: s.ownerNodeId || null,
    stage: s.stage,
    lastActionAt: s.lastActionAt,
    paused: s.paused,
    baseDaysBetweenStages: s.baseDaysBetweenStages,
    urgencyMultiplier: s.urgencyMultiplier,
    mode: s.mode,
    riskLevel: s.riskLevel,
    behaviorFlags: s.behaviorFlags,
    policy: s.policy,
    channel: s.channel,
    persona: s.persona,
  }));
}

function publicState(state) {
  if (!state) return null;
  return {
    key: state.key,
    creditor: state.creditor,
    caseId: state.caseId,
    openedAt: state.openedAt || null,
    ownerNodeId: state.ownerNodeId || null,
    stage: state.stage,
    lastActionAt: state.lastActionAt,
    paused: state.paused,
    baseDaysBetweenStages: state.baseDaysBetweenStages,
    urgencyMultiplier: state.urgencyMultiplier,
    mode: state.mode,
    riskLevel: state.riskLevel,
    behaviorFlags: state.behaviorFlags,
    policy: state.policy,
    channel: state.channel,
    persona: state.persona,
  };
}

function ensureOwnershipAssigned(state) {
  if (!state) return;
  if (!state.openedAt) state.openedAt = Date.now();
  if (state.ownerNodeId) return;

  try {
    const chosen = pickOwnerNodeForCase({ creditor: state.creditor, caseId: state.caseId || "global" });
    state.ownerNodeId = chosen?.nodeId || getSelfNodeId();
  } catch {
    state.ownerNodeId = getSelfNodeId();
  }
}

export function advanceEnforcementStage({ creditor, caseId } = {}) {
  const state = getState(creditor, caseId);
  if (!state) return null;
  if (state.paused) return publicState(state);

  const preset = getPreset(state.mode);
  const maxStage = preset.maxStage;
  const next = Math.min((state.stage || 0) + 1, maxStage);
  if (next === state.stage) return publicState(state);

  state.stage = next;
  state.lastActionAt = Date.now();

  eventBus.emit("enforcement.chain.step", {
    creditor: state.creditor,
    caseId: state.caseId,
    stage: state.stage,
    channel: state.channel || undefined,
    at: new Date().toISOString(),
    adminReason: "Stage advanced via /api/admin/case/advance",
  });

  eventBus.emit("enforcement.event", {
    creditor: state.creditor,
    status: `Chain advanced to stage ${state.stage}`,
    details: "Manual stage advance (admin).",
    channel: state.channel || undefined,
  });

  return publicState(state);
}

export function restartEnforcementForCase({ creditor, caseId } = {}) {
  const state = getState(creditor, caseId);
  if (!state) return null;

  state.stage = 0;
  state.lastActionAt = 0;
  state.paused = false;

  // Reuse the same start event handler (ensures consistent behavior).
  eventBus.emit("enforcement.chain.start", {
    creditor: state.creditor,
    caseId: state.caseId,
    strategy: state.strategy || undefined,
    channel: state.channel || undefined,
    persona: state.persona || undefined,
  });

  return publicState(state);
}

export function pauseEnforcement(creditor, caseId) {
  const state = getState(creditor, caseId);
  if (!state) return;
  state.paused = true;
}

export function resumeEnforcement(creditor, caseId) {
  const state = getState(creditor, caseId);
  if (!state) return;
  state.paused = false;
}

function stageDays() {
  const v = Number(process.env.AUTONOMOUS_ENFORCEMENT_STAGE_DAYS || "30");
  if (!Number.isFinite(v) || v < 1) return 30;
  return v;
}

function tunedStageDays(state, baseDays) {
  let days = baseDays;

  const mult = typeof state?.urgencyMultiplier === "number" && Number.isFinite(state.urgencyMultiplier) ? state.urgencyMultiplier : 1.0;
  days = Math.max(1, days * mult);

  // Back-compat: if older code sets urgencyBoost boolean, accelerate.
  if (state?.urgencyBoost === true) {
    days = Math.min(days, baseDays * 0.5);
  }

  return Math.max(7, Math.floor(days));
}

function emitStep({ creditor, caseId, stage, channel }) {
  eventBus.emit("enforcement.chain.step", {
    creditor,
    caseId: caseId || null,
    stage,
    channel: channel || undefined,
    at: new Date().toISOString(),
  });

  eventBus.emit("enforcement.event", {
    creditor,
    status: `Chain advanced to stage ${stage}`,
    details: "Autonomous enforcement chain progression.",
    channel: channel || undefined,
  });
}

// Explicit chain start (used by playbooks)
eventBus.on("enforcement.chain.start", ({ creditor, strategy, initialDoc, channel, persona, caseId } = {}) => {
  const c = String(creditor || "").trim();
  if (!c) return;

  const state = getState(c, caseId);
  if (!state || state.paused) return;

  ensureOwnershipAssigned(state);

  state.strategy = String(strategy || "").trim() || state.strategy;
  state.channel = String(channel || "").trim() || state.channel;
  state.persona = String(persona || "").trim() || state.persona;

  if (state.stage === 0) {
    state.stage = 1;
    state.lastActionAt = Date.now();
    eventBus.emit("enforcement.chain.step", {
      creditor: c,
      caseId: state.caseId,
      stage: 1,
      channel: state.channel || undefined,
      at: new Date().toISOString(),
      strategy: state.strategy || undefined,
      initialDoc: initialDoc || undefined,
    });

    eventBus.emit("enforcement.event", {
      creditor: c,
      status: "Chain started",
      details: `Enforcement chain started at stage 1${state.caseId ? ` (case ${state.caseId})` : ""}.`,
      channel: state.channel || undefined,
    });
  }

  // Initial doc hint (not all docs are implemented yet)
  if (initialDoc === "debt_validation") {
    eventBus.emit("doc.generate.debtValidation", { creditor: c, classification: { name: c }, channel: state.channel });
  }
});

// Start the chain when a creditor is classified as junk debt.
eventBus.on("creditor.classified", ({ name, tag, context } = {}) => {
  if (tag !== "junk_debt_suspected") return;

  const creditor = String(name || "").trim();
  if (!creditor) return;

  const caseId = context?.caseId || context?.case_id || null;
  const state = getState(creditor, caseId);
  if (!state || state.paused) return;

  ensureOwnershipAssigned(state);

  if (state.stage === 0) {
    state.stage = 1;
    state.lastActionAt = Date.now();
    state.channel = String(context?.channel || "").trim() || state.channel;

    eventBus.emit("enforcement.chain.step", {
      creditor,
      caseId: state.caseId,
      stage: 1,
      channel: state.channel || undefined,
      at: new Date().toISOString(),
    });

    // Stage 1 typically triggers DV draft via docGenerator listener.
    eventBus.emit("creditor.chain.started", { creditor, stage: 1, channel: context?.channel });
  }
});

// When a filing draft is ready, we can advance stage depending on type.
eventBus.on("filing.draft.ready", ({ type, creditor, channel, caseId } = {}) => {
  const c = String(creditor || "").trim();
  if (!c) return;
  const state = getState(c, caseId);
  if (!state || state.paused) return;

  const t = String(type || "").trim();

  // Minimal mapping for now.
  if (t === "debt_validation" && state.stage === 1) {
    // DV prepared. Next step is waiting/clock logic; we keep stage 1 until overdue window.
    eventBus.emit("enforcement.event", {
      creditor: c,
      status: "Debt validation draft ready",
      details: "Prepared. Await send/response clock wiring.",
      channel: channel || undefined,
    });
  }

  if (t === "notice_of_fault" && state.stage === 2) {
    eventBus.emit("enforcement.event", {
      creditor: c,
      status: "Notice of Fault draft ready",
      details: "Prepared. Next stage (dishonor/default) is not yet automated.",
      channel: channel || undefined,
    });
  }
});

// Autonomous tick advances chain by time.
eventBus.on("autonomous.tick", () => {
  const now = Date.now();
  const defaultBaseDays = stageDays();

  for (const [creditor, state] of enforcementState.entries()) {
    if (state.paused) continue;
    if (!state.lastActionAt) continue;

    const preset = getPreset(state.mode);
    const maxStage = preset.maxStage;

    const baseDays =
      typeof state.baseDaysBetweenStages === "number" && Number.isFinite(state.baseDaysBetweenStages) && state.baseDaysBetweenStages > 0
        ? state.baseDaysBetweenStages
        : defaultBaseDays;

    const elapsedDays = (now - state.lastActionAt) / (1000 * 60 * 60 * 24);
    const days = tunedStageDays(state, baseDays * preset.urgencyMultiplier);

    // Stage 1 -> Stage 2: overdue response window reached
    if (state.stage === 1 && elapsedDays >= days && state.stage < maxStage) {
      state.stage = 2;
      state.lastActionAt = now;

      eventBus.emit("enforcement.chain.step", {
        creditor: state.creditor,
        caseId: state.caseId,
        stage: 2,
        channel: state.channel || undefined,
        at: new Date().toISOString(),
        adaptiveReason: `Time-based escalation after ${elapsedDays.toFixed(1)} days (mode: ${state.mode})`,
      });

      eventBus.emit("enforcement.event", {
        creditor: state.creditor,
        status: "Chain advanced to stage 2",
        details: "Autonomous enforcement chain progression.",
        channel: state.channel || undefined,
      });

      // Triggers Notice of Fault draft via docGenerator.
      eventBus.emit("enforcement.overdue", {
        creditor: state.creditor,
        caseId: state.caseId,
        accountRef: "[auto-detected or set later]",
        channel: state.channel || undefined,
      });
    }

    // Future stages (dishonor/default, lien prep) can be added similarly.
  }
});

// Adaptive policy tuning (set by AdaptiveEnforcementAI)
eventBus.on("adaptive.policy.updated", ({ creditor, policy, riskLevel, behaviorFlags, caseId } = {}) => {
  const c = String(creditor || "").trim();
  if (!c) return;
  const state = getState(c, caseId);
  if (!state) return;

  const base = Number(policy?.baseDaysBetweenStages);
  if (Number.isFinite(base) && base > 0) state.baseDaysBetweenStages = base;

  let mult = 1.0;
  const rl = String(riskLevel || "").toLowerCase();
  state.riskLevel = rl || state.riskLevel;
  state.behaviorFlags = behaviorFlags || state.behaviorFlags;
  state.policy = policy || state.policy;
  if (rl === "high") {
    const tighten = Number(policy?.tightenOnHighRisk);
    if (Number.isFinite(tighten) && tighten > 0) mult = tighten;
  }

  if (behaviorFlags?.likelyToIgnore === true) {
    mult = Math.min(mult, 0.5);
  }

  state.urgencyMultiplier = mult;
  state.adaptiveManaged = true;
});

// Adaptive immediate escalation request
eventBus.on("enforcement.chain.adaptiveEscalate", ({ creditor, reason, channel, caseId } = {}) => {
  const c = String(creditor || "").trim();
  if (!c) return;

  const state = getState(c, caseId);
  if (!state || state.paused) return;

  const preset = getPreset(state.mode);
  const next = Math.min((state.stage || 1) + 1, preset.maxStage);
  if (next === state.stage) return;

  state.stage = next;
  state.lastActionAt = Date.now();

  eventBus.emit("enforcement.chain.step", {
    creditor: state.creditor,
    caseId: state.caseId,
    stage: state.stage,
    channel: String(channel || state.channel || "").trim() || undefined,
    at: new Date().toISOString(),
    adaptiveReason: reason ? String(reason) : "Adaptive escalation requested.",
  });

  eventBus.emit("enforcement.event", {
    creditor: c,
    status: "Adaptive escalation executed",
    details: reason ? String(reason) : "Adaptive escalation requested.",
    channel: String(channel || state.channel || "").trim() || undefined,
  });
});

// Prediction-informed tuning
eventBus.on("behavior.predicted", ({ creditor, prediction, caseId } = {}) => {
  const c = String(creditor || "").trim();
  if (!c) return;
  const state = getState(c, caseId);
  if (!state) return;

  // If adaptive policy is managing timing, let it drive urgency.
  if (state.adaptiveManaged === true) {
    state.predictedAt = Date.now();
    state.lastPrediction = {
      riskScore: typeof prediction?.riskScore === "number" ? prediction.riskScore : null,
      likelyBehavior: prediction?.likelyBehavior,
      suggestedEnforcementPath: prediction?.suggestedEnforcementPath,
    };
    return;
  }

  const risk = typeof prediction?.riskScore === "number" ? prediction.riskScore : null;
  const behavior = String(prediction?.likelyBehavior || "").toLowerCase();

  if (risk !== null && risk >= 8) state.urgencyBoost = true;
  if (behavior === "ignore" || behavior === "stall") state.urgencyBoost = true;

  if (state.urgencyBoost === true) {
    const current = typeof state.urgencyMultiplier === "number" && Number.isFinite(state.urgencyMultiplier) ? state.urgencyMultiplier : 1.0;
    state.urgencyMultiplier = Math.min(current, 0.5);
  }

  state.predictedAt = Date.now();
  state.lastPrediction = {
    riskScore: risk,
    likelyBehavior: prediction?.likelyBehavior,
    suggestedEnforcementPath: prediction?.suggestedEnforcementPath,
  };
});
