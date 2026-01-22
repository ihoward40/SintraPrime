import express from "express";
import path from "node:path";
import { requireApiKey } from "../middleware/requireApiKey.js";
import { appendJsonl, readJsonl } from "../services/jsonlStore.js";
import { diffLines } from "../services/lineDiff.js";

const router = express.Router();

const RUNS_DIR = path.resolve(process.cwd(), "runs");
const FILE = path.join(RUNS_DIR, "template-history.jsonl");

function s(v) {
  return String(v ?? "").trim();
}

function n(v, fallback) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

router.get("/types", (req, res) => {
  if (!requireApiKey(req, res)) return;
  const items = readJsonl(FILE, { limit: 5000, newestFirst: false });
  const set = new Set();
  for (const it of items) {
    const t = s(it?.type);
    if (t) set.add(t);
  }
  res.json({ ok: true, types: Array.from(set).sort() });
});

router.get("/", (req, res) => {
  if (!requireApiKey(req, res)) return;
  const type = s(req.query?.type);
  const limit = Math.max(1, Math.min(20, n(req.query?.limit, 5)));

  const items = readJsonl(FILE, { limit: 5000, newestFirst: true })
    .filter((it) => (type ? s(it?.type) === type : true))
    .slice(0, limit)
    .map((it) => ({
      id: s(it?.id) || null,
      ts: n(it?.ts, Date.now()),
      type: s(it?.type) || "unknown",
      caseId: it?.caseId ? s(it.caseId) : null,
      judgeId: it?.judgeId ? s(it.judgeId) : null,
      title: it?.title ? s(it.title) : null,
      text: it?.text ? String(it.text) : "",
      meta: it?.meta ?? {},
    }));

  res.json({ ok: true, count: items.length, items });
});

// Append a version. Body: { type, text, caseId?, judgeId?, title?, meta? }
router.post("/", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const type = s(req.body?.type);
  const text = String(req.body?.text ?? "");
  if (!type) return res.status(400).json({ ok: false, error: "type_required" });
  if (!text.trim()) return res.status(400).json({ ok: false, error: "text_required" });

  const entry = {
    id: `tpl_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    ts: Date.now(),
    type,
    caseId: req.body?.caseId ? s(req.body.caseId) : null,
    judgeId: req.body?.judgeId ? s(req.body.judgeId) : null,
    title: req.body?.title ? s(req.body.title) : null,
    text,
    meta: req.body?.meta && typeof req.body.meta === "object" ? req.body.meta : {},
  };

  appendJsonl(FILE, entry);
  res.json({ ok: true, entry });
});

// Diff between two entries by id OR last two by type.
router.get("/diff", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const type = s(req.query?.type);
  const aId = s(req.query?.a);
  const bId = s(req.query?.b);

  const items = readJsonl(FILE, { limit: 5000, newestFirst: true });

  const pickById = (id) => items.find((it) => s(it?.id) === id) || null;

  let a = aId ? pickById(aId) : null;
  let b = bId ? pickById(bId) : null;

  if (!a || !b) {
    if (!type) return res.status(400).json({ ok: false, error: "type_or_ids_required" });
    const list = items.filter((it) => s(it?.type) === type);
    b = list[0] || null;
    a = list[1] || null;
  }

  if (!a || !b) return res.status(404).json({ ok: false, error: "not_enough_versions" });

  const diff = diffLines(String(a.text || ""), String(b.text || ""));
  res.json({
    ok: true,
    a: { id: s(a.id), ts: a.ts, title: a.title || null, caseId: a.caseId || null, judgeId: a.judgeId || null },
    b: { id: s(b.id), ts: b.ts, title: b.title || null, caseId: b.caseId || null, judgeId: b.judgeId || null },
    diff,
  });
});

export default router;
