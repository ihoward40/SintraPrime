import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { getSecurityProfile, setSecurityProfileMode } from "../security/securityProfile.js";
import { eventBus } from "../core/eventBus.js";

const router = express.Router();
router.use(adminAuth);

router.get("/security/profile", (_req, res) => {
  res.json(getSecurityProfile());
});

router.post("/security/profile", (req, res) => {
  const { mode, reason } = req.body || {};
  if (!mode) return res.status(400).json({ ok: false, error: "mode is required" });

  try {
    setSecurityProfileMode(mode, reason || "manual");
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err?.message || err) });
  }

  eventBus.emit("security.mode.changed", {
    mode: String(mode),
    reason: reason || "manual",
    ts: new Date().toISOString(),
  });

  res.json({ ok: true, mode: String(mode) });
});

export default router;
