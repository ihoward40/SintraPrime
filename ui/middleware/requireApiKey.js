import { emitAuthFailure } from "../security/securityEvents.js";

export function requireApiKey(req, res) {
  const expected = String(process.env.DASHBOARD_API_KEY || "").trim();
  if (!expected) return true;

  const provided = String(req.headers["x-api-key"] || "").trim();
  if (provided && provided === expected) return true;

  emitAuthFailure({
    type: "api-key",
    ip: req.ip,
    path: req.path,
    method: req.method,
  });
  res.status(401).json({ ok: false, error: "Unauthorized" });
  return false;
}
