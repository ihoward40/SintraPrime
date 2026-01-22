import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { appendTimelineEvent, listTimelineEvents } from "../core/timelineStore.js";

const router = express.Router();

function requireApiKey(req, res) {
  const expected = String(process.env.DASHBOARD_API_KEY || "").trim();
  if (!expected) return true;

  const provided = String(req.headers["x-api-key"] || "").trim();
  if (provided && provided === expected) return true;

  res.status(401).json({ ok: false, error: "Unauthorized" });
  return false;
}

router.get("/events", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const caseId = String(req.query?.caseId || "").trim() || null;
  const limit = Number(req.query?.limit || 100);
  const sinceTs = req.query?.sinceTs != null ? Number(req.query.sinceTs) : null;

  const items = listTimelineEvents({ caseId, limit, sinceTs });
  res.json({ ok: true, count: items.length, items });
});

// Manual append for ops/testing.
router.post("/events", adminAuth, (req, res) => {
  const type = String(req.body?.type || "event").trim() || "event";
  const title = req.body?.title != null ? String(req.body.title) : null;
  const message = req.body?.message != null ? String(req.body.message) : null;

  const row = appendTimelineEvent({
    caseId: req.body?.caseId != null ? String(req.body.caseId) : null,
    creditor: req.body?.creditor != null ? String(req.body.creditor) : null,
    ownerNodeId: req.body?.ownerNodeId != null ? String(req.body.ownerNodeId) : null,
    type,
    title,
    message,
    data: req.body?.data ?? null,
  });

  res.json({ ok: true, item: row });
});

export default router;
