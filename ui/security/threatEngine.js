import { eventBus } from "../core/eventBus.js";

let threatScore = 0;
let threatLevel = "normal"; // normal | elevated | high | lockdown

function clamp(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(120, n));
}

function computeLevel(score) {
  if (score >= 80) return "lockdown";
  if (score >= 50) return "high";
  if (score >= 25) return "elevated";
  return "normal";
}

function emitLevelChange(newLevel) {
  if (newLevel === threatLevel) return;
  const oldLevel = threatLevel;
  threatLevel = newLevel;
  eventBus.emit("security.threat.level.changed", {
    oldLevel,
    newLevel,
    score: threatScore,
    ts: new Date().toISOString(),
  });
}

function bump(amount, reason, details = {}) {
  threatScore = clamp(threatScore + Number(amount || 0));
  eventBus.emit("security.threat.bump", {
    amount,
    reason,
    score: threatScore,
    level: threatLevel,
    ts: new Date().toISOString(),
    details,
  });
  emitLevelChange(computeLevel(threatScore));
}

function decayTick() {
  threatScore = clamp(threatScore - 3);
  emitLevelChange(computeLevel(threatScore));
}

export function startThreatEngine() {
  const enabled = String(process.env.SECURITY_THREAT_ENGINE || "1").trim() === "1";
  if (!enabled) return;

  eventBus.on("vision.perimeter.suspicious", (payload) => bump(8, "perimeter_suspicious", payload));
  eventBus.on("vision.network.traffic-spike", (payload) => bump(12, "traffic_spike", payload));
  eventBus.on("security.rate-limit.triggered", (payload) => bump(8, "rate_limit", payload));
  eventBus.on("security.auth.failure", (payload) => bump(10, "auth_failure", payload));
  eventBus.on("security.config.drift", (payload) => bump(20, "config_drift", payload));

  eventBus.on("security.blue-team.anomaly", (payload) => {
    const sev = String(payload?.severity || "medium");
    const amount = sev === "critical" ? 25 : sev === "high" ? 15 : sev === "low" ? 2 : 8;
    bump(amount, "blue_team_anomaly", payload);
  });

  eventBus.on("vision.system.metrics", (payload) => {
    if (Number(payload?.load1m || 0) > 3) bump(5, "system_high_load", payload);
  });

  setInterval(decayTick, 30_000);
}

export function getThreatState() {
  return { score: threatScore, level: threatLevel };
}
