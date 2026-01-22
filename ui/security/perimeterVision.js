import { eventBus } from "../core/eventBus.js";
import { noteSuspiciousIp } from "./ipReputation.js";
import { emitSuspiciousRequest } from "./securityEvents.js";

const TEMP_BLOCK_SCORE = 8;

function ua(req) {
  return String(req.headers["user-agent"] || "");
}

function isWeirdMethod(method) {
  const m = String(method || "").toUpperCase();
  return m === "TRACE" || m === "TRACK";
}

export function perimeterVision(req, _res, next) {
  const ip = req.ip;
  const path = String(req.path || "");
  const method = String(req.method || "");
  const userAgent = ua(req);

  const suspiciousReasons = [];
  if (path.includes("..")) suspiciousReasons.push("path_traversal");
  if (path.includes("\\u0000")) suspiciousReasons.push("null_byte");
  if (isWeirdMethod(method)) suspiciousReasons.push("weird_method");
  if (path.length > 2048) suspiciousReasons.push("path_too_long");
  if (!userAgent.trim()) suspiciousReasons.push("missing_user_agent");

  if (suspiciousReasons.length) {
    const payload = {
      ip,
      path,
      method,
      ua: userAgent.slice(0, 220),
      reasons: suspiciousReasons,
    };
    eventBus.emit("vision.perimeter.suspicious", payload);
    emitSuspiciousRequest(payload);
    noteSuspiciousIp(ip, TEMP_BLOCK_SCORE, suspiciousReasons[0]);
  }

  next();
}
