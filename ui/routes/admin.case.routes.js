import express from "express";

import { adminAuth } from "../middleware/adminAuth.js";
import {
  advanceEnforcementStage,
  getCaseConfig,
  restartEnforcementForCase,
  setCaseConfig,
} from "../enforcement/enforcementChain.js";
import { eventBus } from "../core/eventBus.js";

const router = express.Router();
router.use(adminAuth);

router.post("/case/pause", (req, res) => {
  const creditor = String(req.body?.creditor || "").trim();
  const caseId = String(req.body?.caseId || "").trim();
  const pause = !!req.body?.pause;

  if (!creditor) return res.status(400).json({ ok: false, error: "creditor required" });
  if (!caseId) return res.status(400).json({ ok: false, error: "caseId required" });

  const updated = setCaseConfig({ creditor, caseId, paused: pause });
  return res.json({ ok: true, paused: !!updated?.paused, state: updated });
});

router.post("/case/mode", (req, res) => {
  const creditor = String(req.body?.creditor || "").trim();
  const caseId = String(req.body?.caseId || "").trim();
  const mode = String(req.body?.mode || "").trim();

  if (!creditor) return res.status(400).json({ ok: false, error: "creditor required" });
  if (!caseId) return res.status(400).json({ ok: false, error: "caseId required" });
  if (!mode) return res.status(400).json({ ok: false, error: "mode required" });

  const updated = setCaseConfig({ creditor, caseId, mode });
  return res.json({ ok: true, mode: updated?.mode || null, state: updated });
});

router.post("/case/advance", (req, res) => {
  const creditor = String(req.body?.creditor || "").trim();
  const caseId = String(req.body?.caseId || "").trim();

  if (!creditor) return res.status(400).json({ ok: false, error: "creditor required" });
  if (!caseId) return res.status(400).json({ ok: false, error: "caseId required" });

  const updated = advanceEnforcementStage({ creditor, caseId });
  return res.json({ ok: true, updated });
});

router.post("/case/restart", (req, res) => {
  const creditor = String(req.body?.creditor || "").trim();
  const caseId = String(req.body?.caseId || "").trim();

  if (!creditor) return res.status(400).json({ ok: false, error: "creditor required" });
  if (!caseId) return res.status(400).json({ ok: false, error: "caseId required" });

  const restarted = restartEnforcementForCase({ creditor, caseId });
  return res.json({ ok: true, restarted });
});

router.post("/case/binder", (req, res) => {
  const creditor = String(req.body?.creditor || "").trim();
  const caseId = String(req.body?.caseId || "").trim();

  if (!creditor) return res.status(400).json({ ok: false, error: "creditor required" });
  if (!caseId) return res.status(400).json({ ok: false, error: "caseId required" });

  eventBus.emit("binder.request", { creditor, caseId });
  return res.json({ ok: true, requested: "binder" });
});

router.post("/case/filing-pack", (req, res) => {
  const creditor = String(req.body?.creditor || "").trim();
  const caseId = String(req.body?.caseId || "").trim();

  if (!creditor) return res.status(400).json({ ok: false, error: "creditor required" });
  if (!caseId) return res.status(400).json({ ok: false, error: "caseId required" });

  eventBus.emit("filingPack.request", { creditor, caseId });
  return res.json({ ok: true, requested: "filingPack" });
});

// Convenience: read current case config
router.get("/case/config", (req, res) => {
  const creditor = String(req.query?.creditor || "").trim();
  const caseId = String(req.query?.caseId || "").trim();

  if (!creditor) return res.status(400).json({ ok: false, error: "creditor required" });
  if (!caseId) return res.status(400).json({ ok: false, error: "caseId required" });

  const state = getCaseConfig({ creditor, caseId });
  return res.json({ ok: true, state });
});

export default router;
