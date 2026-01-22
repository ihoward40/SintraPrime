import express from "express";
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

// Test-only helper: seed enforcement chain entries via HTTP.
router.post("/test-start", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const creditor = String(req.body?.creditor || "").trim();
  const caseId = String(req.body?.caseId || "").trim();
  const strategy = String(req.body?.strategy || "").trim();
  const initialDoc = String(req.body?.initialDoc || "").trim();

  if (!creditor || !caseId) {
    return res.status(400).json({ ok: false, error: "creditor and caseId are required" });
  }

  eventBus.emit("enforcement.chain.start", {
    creditor,
    caseId,
    strategy: strategy || "default",
    initialDoc: initialDoc || "initial-notice",
  });

  return res.json({
    ok: true,
    message: `Enforcement chain started for ${creditor} / ${caseId}`,
    emitter: "enforcement.chain.start",
  });
});

export default router;
