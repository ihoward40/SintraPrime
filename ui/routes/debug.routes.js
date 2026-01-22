import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { eventBus } from "../core/eventBus.js";

const router = express.Router();

function enabled() {
  const v = String(process.env.DEBUG_EVENTS_ENABLE || "").trim();
  return v === "1" || v.toLowerCase() === "true";
}

function requireAdmin() {
  const v = String(process.env.DEBUG_EVENTS_REQUIRE_ADMIN || "").trim();
  if (!v) return true;
  return v === "1" || v.toLowerCase() === "true";
}

// Canonical path: POST /api/debug/events/emit
router.post("/debug/events/emit", express.json(), (req, res) => {
  if (!enabled()) return res.status(404).json({ ok: false, error: "debug events disabled" });

  if (requireAdmin()) {
    // Delegate to the existing admin auth middleware.
    // We call it manually to avoid attaching it globally when DEBUG_EVENTS_REQUIRE_ADMIN=0.
    return adminAuth(req, res, () => {
      const type = String(req.body?.type || "").trim();
      const payload = req.body?.payload ?? null;
      if (!type) return res.status(400).json({ ok: false, error: "type required" });

      eventBus.emit(type, payload);
      return res.json({ ok: true, emitted: { type } });
    });
  }

  const type = String(req.body?.type || "").trim();
  const payload = req.body?.payload ?? null;
  if (!type) return res.status(400).json({ ok: false, error: "type required" });

  eventBus.emit(type, payload);
  return res.json({ ok: true, emitted: { type } });
});

export default router;
