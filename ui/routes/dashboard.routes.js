import express from "express";
import { getAllEnforcementStates, getModePresets, getSystemMode, setSystemMode } from "../enforcement/enforcementChain.js";

const router = express.Router();

function requireApiKey(req, res) {
  const expected = String(process.env.DASHBOARD_API_KEY || "").trim();
  if (!expected) return true;

  const provided = String(req.headers["x-api-key"] || "").trim();
  if (provided && provided === expected) return true;

  res.status(401).json({ ok: false, error: "Unauthorized" });
  return false;
}

router.get("/status", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const creditor = String(req.query?.creditor || "").trim();
  const caseId = String(req.query?.caseId || "").trim();
  const mode = String(req.query?.mode || "").trim().toLowerCase();

  let items = getAllEnforcementStates();

  if (creditor) {
    const lc = creditor.toLowerCase();
    items = items.filter((s) => String(s.creditor || "").toLowerCase().includes(lc));
  }

  if (caseId) {
    items = items.filter((s) => String(s.caseId || "") === caseId);
  }

  if (mode) {
    items = items.filter((s) => String(s.mode || "") === mode);
  }

  res.json({
    ok: true,
    systemMode: getSystemMode(),
    count: items.length,
    items,
  });
});

router.get("/modes", (req, res) => {
  if (!requireApiKey(req, res)) return;
  res.json({ ok: true, systemMode: getSystemMode(), presets: getModePresets() });
});

router.post("/system-mode", (req, res) => {
  if (!requireApiKey(req, res)) return;
  const mode = req.body?.mode;
  const updated = setSystemMode(mode);
  res.json({ ok: true, systemMode: updated });
});

router.get("/stats", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const items = getAllEnforcementStates();

  const byStage = {};
  const byMode = {};
  const byRisk = {};
  const byCreditor = {};

  for (const it of items) {
    const stage = String(it?.stage ?? "unknown");
    const mode = String(it?.mode ?? "unknown");
    const risk = String(it?.riskLevel ?? "unknown");
    const creditor = String(it?.creditor ?? "unknown");

    byStage[stage] = (byStage[stage] || 0) + 1;
    byMode[mode] = (byMode[mode] || 0) + 1;
    byRisk[risk] = (byRisk[risk] || 0) + 1;
    byCreditor[creditor] = (byCreditor[creditor] || 0) + 1;
  }

  res.json({
    ok: true,
    systemMode: getSystemMode(),
    count: items.length,
    byStage,
    byMode,
    byRisk,
    byCreditor,
    updatedAt: new Date().toISOString(),
  });
});

router.get("/creditors", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const items = getAllEnforcementStates();
  const map = {};
  for (const it of items) {
    const creditor = String(it?.creditor ?? "unknown");
    if (!map[creditor]) map[creditor] = [];
    map[creditor].push(it);
  }

  res.json({ ok: true, systemMode: getSystemMode(), creditors: map });
});

export default router;
