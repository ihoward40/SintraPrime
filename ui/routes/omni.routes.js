import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { ingestToolDescription } from "../intelligence/mimicLayer.js";
import { planForIntent, listAllCapabilities, capabilityMeta } from "../intelligence/skillRouter.js";

const router = express.Router();

function requireApiKey(req, res) {
  const expected = String(process.env.DASHBOARD_API_KEY || "").trim();
  if (!expected) return true;

  const provided = String(req.headers["x-api-key"] || "").trim();
  if (provided && provided === expected) return true;

  res.status(401).json({ ok: false, error: "Unauthorized" });
  return false;
}

router.get("/meta", (req, res) => {
  if (!requireApiKey(req, res)) return;
  res.json({ ok: true, meta: capabilityMeta() });
});

router.get("/capabilities", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const category = String(req.query?.category || "").trim() || null;
  const tag = String(req.query?.tag || "").trim() || null;
  const enabledRaw = String(req.query?.enabled || "").trim();
  const enabled = enabledRaw === "true" ? true : enabledRaw === "false" ? false : null;

  const skills = listAllCapabilities({
    ...(category ? { category } : {}),
    ...(tag ? { tag } : {}),
    ...(enabled != null ? { enabled } : {}),
  });

  res.json({ ok: true, count: skills.length, skills });
});

router.post("/plan", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const intent = String(req.body?.intent || "").trim();
  const context = req.body?.context || {};
  if (!intent) return res.status(400).json({ ok: false, error: "intent_required" });

  const plan = planForIntent({ intent, context });
  res.json({ ok: true, plan });
});

// Admin-gated: ingest an external tool's abilities.
router.post("/ingest-tool", adminAuth, (req, res) => {
  const name = String(req.body?.name || "").trim();
  const description = String(req.body?.description || "");
  const features = Array.isArray(req.body?.features) ? req.body.features : [];

  if (!name) return res.status(400).json({ ok: false, error: "name_required" });

  const result = ingestToolDescription({
    name,
    description,
    rawFeaturesText: features,
  });

  if (!result?.ok) return res.status(400).json({ ok: false, error: result?.error || "ingest_failed" });
  res.json({ ok: true, result });
});

export default router;
