import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { runIRAC, makeComplaintDraft } from "../../src/intelligence/litigation/iracEngine.js";

const router = express.Router();
router.use(adminAuth);

router.get("/litigation/status", (_req, res) => {
  res.json({ ok: true, engine: "litigation-l3", features: ["irac", "complaint_draft"], at: new Date().toISOString() });
});

router.post("/litigation/irac", (req, res) => {
  try {
    const out = runIRAC({
      issue: req.body?.issue,
      rules: req.body?.rules,
      analysis: req.body?.analysis,
      conclusion: req.body?.conclusion,
    });
    res.json({ ok: true, output: out });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

router.post("/litigation/complaint-draft", (req, res) => {
  try {
    const out = makeComplaintDraft({
      facts: req.body?.facts,
      causes: req.body?.causes,
      defendant: req.body?.defendant,
      plaintiff: req.body?.plaintiff,
      caseId: req.body?.caseId,
    });
    res.json({ ok: true, output: out });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

export default router;
