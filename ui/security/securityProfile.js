import { eventBus } from "../core/eventBus.js";

const VALID_MODES = ["normal", "hardened", "lockdown"];

let currentProfile = {
  mode: "normal",
  lastChange: null,
  reason: null,
};

let manualHoldUntilMs = 0;

export function getSecurityProfile() {
  return currentProfile;
}

export function setSecurityProfileMode(mode, reason = null) {
  const m = String(mode || "").trim();
  if (!VALID_MODES.includes(m)) {
    throw new Error(`Invalid security mode: ${m}`);
  }

  if (currentProfile.mode === m && String(currentProfile.reason || "") === String(reason || "")) {
    return currentProfile;
  }

  currentProfile = {
    mode: m,
    lastChange: new Date().toISOString(),
    reason: reason ?? null,
  };

  // Hold off auto-bridge changes for a while after a manual flip.
  if (String(reason || "").toLowerCase().includes("manual") || String(reason || "").toLowerCase().includes("console")) {
    const holdMs = Math.max(0, Number(process.env.SECURITY_PROFILE_MANUAL_HOLD_MS || 10 * 60 * 1000));
    manualHoldUntilMs = Date.now() + holdMs;
  }

  eventBus.emit("security.profile.changed", { profile: currentProfile, ts: currentProfile.lastChange });
  // eslint-disable-next-line no-console
  console.log("[SecurityProfile] Mode set:", currentProfile.mode, currentProfile.reason || "");
  return currentProfile;
}

function canAutoAdjust() {
  const now = Date.now();
  return now >= manualHoldUntilMs;
}

export function startSecurityProfileBridge() {
  const enabled = String(process.env.SECURITY_PROFILE_BRIDGE || "1").trim() === "1";
  if (!enabled) return;

  eventBus.on("security.threat.level.changed", ({ newLevel }) => {
    if (!canAutoAdjust()) return;
    if (newLevel === "lockdown") setSecurityProfileMode("lockdown", "threat-engine");
    else if (newLevel === "high") setSecurityProfileMode("hardened", "threat-engine");
    else setSecurityProfileMode("normal", "threat-engine");
  });
}
