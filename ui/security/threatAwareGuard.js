import { eventBus } from "../core/eventBus.js";
import { getThreatState } from "./threatEngine.js";
import { getSecurityProfile } from "./securityProfile.js";
import { isIpBlocked, noteSuspiciousIp } from "./ipReputation.js";

const SENSITIVE_PREFIXES = ["/api/admin", "/api/cluster", "/api/enforcement"];

export function threatAwareGuard(req, res, next) {
  const ip = String(req.ip || "unknown");
  const { level } = getThreatState();
  const profile = getSecurityProfile();
  const forcedMode = String(profile?.mode || "normal");

  if (isIpBlocked(ip)) {
    eventBus.emit("security.ip.blocked.hit", { ip, path: req.path, method: req.method, ts: new Date().toISOString() });
    return res.status(429).json({ ok: false, error: "Access temporarily restricted" });
  }

  const isSensitive = SENSITIVE_PREFIXES.some((p) => String(req.path || "").startsWith(p));

  // Manual mode can override threat-level derived behavior.
  const effectiveLockdown = forcedMode === "lockdown" || level === "lockdown";
  const effectiveHigh = forcedMode === "hardened" || level === "high";

  if (effectiveLockdown && isSensitive) {
    noteSuspiciousIp(ip, 10, "lockdown_sensitive");
    return res.status(503).json({ ok: false, error: "System in protective lockdown" });
  }

  if (effectiveHigh && isSensitive && String(req.method || "GET").toUpperCase() !== "GET") {
    noteSuspiciousIp(ip, 5, "high_sensitive_write");
    return res.status(429).json({ ok: false, error: "High security mode: write operations limited" });
  }

  next();
}
