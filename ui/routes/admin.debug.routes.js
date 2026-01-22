import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { eventBus } from "../core/eventBus.js";

const router = express.Router();
router.use(adminAuth);

router.post("/debug/events/emit", express.json(), (req, res) => {
  const type = String(req.body?.type || "").trim();
  const payload = req.body?.payload ?? null;
  if (!type) return res.status(400).json({ ok: false, error: "type required" });

  eventBus.emit(type, payload);
  return res.json({ ok: true, emitted: { type } });
});

export default router;
