import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { getBlueTeamStatus, resetBlueTeamBreaker } from "../security/blueTeamEngine.js";

const router = express.Router();
router.use(adminAuth);

router.get("/security/blue-team/status", (_req, res) => {
  res.json(getBlueTeamStatus());
});

router.post("/security/blue-team/breakers/reset", (req, res) => {
  const { breaker } = req.body || {};
  if (!breaker) return res.status(400).json({ ok: false, error: "breaker is required" });

  try {
    resetBlueTeamBreaker(breaker);
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err?.message || err) });
  }

  res.json({ ok: true, breaker: String(breaker) });
});

export default router;
