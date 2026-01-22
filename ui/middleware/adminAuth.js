import { emitAuthFailure } from "../security/securityEvents.js";

export function adminAuth(req, res, next) {
  const expected = String(process.env.CLUSTER_ADMIN_SECRET || "").trim();
  if (!expected) {
    return res.status(500).json({ ok: false, error: "Admin secret not configured (CLUSTER_ADMIN_SECRET)" });
  }

  const provided = String(req.headers["x-sintra-admin"] || "").trim();
  if (!provided || provided !== expected) {
    emitAuthFailure({
      type: "admin-token",
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    return res.status(403).json({ ok: false, error: "Forbidden: invalid admin token" });
  }

  next();
}
