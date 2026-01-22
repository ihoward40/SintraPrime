import { eventBus } from "../core/eventBus.js";

function nowIso() {
  return new Date().toISOString();
}

export function emitSuspiciousRequest(details) {
  eventBus.emit("security.suspicious-request.detected", { ...(details || {}), occurredAt: nowIso() });
}

export function emitAuthFailure(details) {
  eventBus.emit("security.auth.failure", { ...(details || {}), occurredAt: nowIso() });
}

export function emitRateLimitTriggered(details) {
  eventBus.emit("security.rate-limit.triggered", { ...(details || {}), occurredAt: nowIso() });
}

export function emitIntegrityViolation(details) {
  eventBus.emit("security.integrity.violation", { ...(details || {}), occurredAt: nowIso() });
}
