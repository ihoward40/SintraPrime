import express from "express";
import { getCaseConfig, setCaseConfig } from "../enforcement/enforcementChain.js";
import { eventBus } from "../core/eventBus.js";

const router = express.Router();

function requireApiKey(req, res) {
  const expected = String(process.env.DASHBOARD_API_KEY || "").trim();
  if (!expected) return true;

  const provided = String(req.headers["x-api-key"] || "").trim();
  if (provided && provided === expected) return true;

  res.status(401).json({ ok: false, error: "Unauthorized" });
  return false;
}

router.get("/config", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const creditor = String(req.query?.creditor || "").trim();
  const caseId = String(req.query?.caseId || "").trim();
  if (!creditor || !caseId) {
    return res.status(400).json({ ok: false, error: "creditor and caseId required" });
  }

  const state = getCaseConfig({ creditor, caseId });
  return res.json({ ok: true, state });
});

router.post("/config", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const creditor = String(req.body?.creditor || "").trim();
  const caseId = String(req.body?.caseId || "").trim();
  if (!creditor || !caseId) {
    return res.status(400).json({ ok: false, error: "creditor and caseId required" });
  }

  const mode = req.body?.mode;
  const baseDaysOverride = req.body?.baseDaysOverride;
  const urgencyOverride = req.body?.urgencyOverride;
  const paused = req.body?.paused;

  const state = setCaseConfig({ creditor, caseId, mode, baseDaysOverride, urgencyOverride, paused });
  return res.json({ ok: true, state });
});

router.post("/start", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const creditor = String(req.body?.creditor || "").trim();
  const caseId = String(req.body?.caseId || "").trim();
  if (!creditor || !caseId) {
    return res.status(400).json({ ok: false, error: "creditor and caseId required" });
  }

  const channel = req.body?.channel;
  const strategy = req.body?.strategy;
  const initialDoc = req.body?.initialDoc;
  const persona = req.body?.persona;

  eventBus.emit("enforcement.chain.start", {
    creditor,
    caseId,
    channel: channel ? String(channel) : undefined,
    strategy: strategy ? String(strategy) : undefined,
    initialDoc: initialDoc ? String(initialDoc) : undefined,
    persona: persona ? String(persona) : undefined,
  });

  const state = getCaseConfig({ creditor, caseId });
  return res.json({ ok: true, state });
});

export default router;
