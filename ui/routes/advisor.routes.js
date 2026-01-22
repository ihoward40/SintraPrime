import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { appendAdvisorLog, listAdvisorLog } from "../core/advisorLogStore.js";

const router = express.Router();

function requireApiKey(req, res) {
  const expected = String(process.env.DASHBOARD_API_KEY || "").trim();
  if (!expected) return true;

  const provided = String(req.headers["x-api-key"] || "").trim();
  if (provided && provided === expected) return true;

  res.status(401).json({ ok: false, error: "Unauthorized" });
  return false;
}

router.get("/log", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const limit = Number(req.query?.limit || 50);
  const sinceTs = req.query?.sinceTs != null ? Number(req.query.sinceTs) : null;

  const items = listAdvisorLog({ limit, sinceTs });
  res.json({ ok: true, count: items.length, items });
});

// Manual append for ops/testing.
router.post("/log", adminAuth, (req, res) => {
  const message = String(req.body?.message || "").trim();
  if (!message) return res.status(400).json({ ok: false, error: "message required" });

  const row = appendAdvisorLog({
    type: String(req.body?.type || "note"),
    level: String(req.body?.level || "info"),
    message,
    data: req.body?.data ?? null,
  });

  res.json({ ok: true, item: row });
});

export default router;
