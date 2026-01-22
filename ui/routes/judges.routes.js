import express from "express";
import path from "node:path";
import { requireApiKey } from "../middleware/requireApiKey.js";
import { appendJsonl, readJsonl, safeReadJson, safeWriteJson } from "../services/jsonlStore.js";

const router = express.Router();

const RUNS_DIR = path.resolve(process.cwd(), "runs");
const JUDGES_FILE = path.join(RUNS_DIR, "judges.json");
const OUTCOMES_FILE = path.join(RUNS_DIR, "judge-outcomes.jsonl");

function normalizeId(id) {
  return String(id || "").trim();
}

function listJudges() {
  const data = safeReadJson(JUDGES_FILE, { judges: [] });
  const judges = Array.isArray(data?.judges) ? data.judges : [];
  return judges
    .filter(Boolean)
    .map((j) => ({
      id: normalizeId(j.id),
      name: j.name ? String(j.name) : undefined,
      court: j.court ? String(j.court) : undefined,
      traits: Array.isArray(j.traits) ? j.traits.map(String) : [],
      notes: j.notes ? String(j.notes) : undefined,
    }))
    .filter((j) => j.id);
}

function writeJudges(judges) {
  safeWriteJson(JUDGES_FILE, { judges });
}

function computeStats({ judgeId, limit = 5000 } = {}) {
  const id = normalizeId(judgeId);
  const items = readJsonl(OUTCOMES_FILE, { limit, newestFirst: false }).filter((x) => normalizeId(x?.judgeId) === id);
  let wins = 0;
  let losses = 0;
  let other = 0;
  const byMotionType = {};

  for (const it of items) {
    const outcome = String(it?.outcome || "").toLowerCase();
    const motionType = String(it?.motionType || "unknown");
    byMotionType[motionType] = byMotionType[motionType] || { wins: 0, losses: 0, other: 0, total: 0 };
    byMotionType[motionType].total += 1;

    if (["win", "granted", "favorable"].includes(outcome)) {
      wins += 1;
      byMotionType[motionType].wins += 1;
    } else if (["loss", "denied", "unfavorable"].includes(outcome)) {
      losses += 1;
      byMotionType[motionType].losses += 1;
    } else {
      other += 1;
      byMotionType[motionType].other += 1;
    }
  }

  const total = wins + losses + other;
  const winRate = total ? wins / total : null;
  return { total, wins, losses, other, winRate, byMotionType };
}

router.get("/", (req, res) => {
  if (!requireApiKey(req, res)) return;
  const judges = listJudges();
  res.json({ ok: true, judges, count: judges.length });
});

router.get("/:id", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const id = normalizeId(req.params.id);
  const judges = listJudges();
  const judge = judges.find((j) => j.id === id) || null;
  if (!judge) return res.status(404).json({ ok: false, error: "not_found" });

  const stats = computeStats({ judgeId: id });
  res.json({ ok: true, judge, stats });
});

// Create/update judge records (API-key gated). Body: { id, name?, court?, traits?, notes? }
router.post("/", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const id = normalizeId(req.body?.id);
  if (!id) return res.status(400).json({ ok: false, error: "id_required" });

  const judges = listJudges();
  const next = {
    id,
    name: req.body?.name ? String(req.body.name) : undefined,
    court: req.body?.court ? String(req.body.court) : undefined,
    traits: Array.isArray(req.body?.traits) ? req.body.traits.map(String) : [],
    notes: req.body?.notes ? String(req.body.notes) : undefined,
  };

  const idx = judges.findIndex((j) => j.id === id);
  if (idx >= 0) judges[idx] = { ...judges[idx], ...next };
  else judges.push(next);

  writeJudges(judges);
  res.json({ ok: true, judge: next });
});

// Append an outcome row for stats. Body: { judgeId, caseId?, motionType?, outcome, ts? }
router.post("/:id/outcome", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const judgeId = normalizeId(req.params.id);
  if (!judgeId) return res.status(400).json({ ok: false, error: "judgeId_required" });

  const outcome = String(req.body?.outcome || "").trim();
  if (!outcome) return res.status(400).json({ ok: false, error: "outcome_required" });

  appendJsonl(OUTCOMES_FILE, {
    ts: Number.isFinite(req.body?.ts) ? Number(req.body.ts) : Date.now(),
    judgeId,
    caseId: req.body?.caseId ? String(req.body.caseId) : null,
    motionType: req.body?.motionType ? String(req.body.motionType) : "unknown",
    outcome,
    notes: req.body?.notes ? String(req.body.notes) : null,
  });

  const stats = computeStats({ judgeId });
  res.json({ ok: true, stats });
});

export default router;
