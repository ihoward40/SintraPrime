import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { getPending, setDecision } from "../intelligence/governorState.js";
import { eventBus } from "../core/eventBus.js";

const router = express.Router();
router.use(adminAuth);

router.post("/governor/override", (req, res) => {
  const actionId = String(req.body?.actionId || "").trim();
  const final = String(req.body?.final || "").trim().toLowerCase();
  const reason = String(req.body?.reason || "override").trim();

  if (!actionId) return res.status(400).json({ ok: false, error: "actionId_required" });
  if (!final || !["approve", "deny", "throttle"].includes(final)) {
    return res.status(400).json({ ok: false, error: "final_must_be_approve_deny_throttle" });
  }

  const pending = getPending(actionId);
  const decision = {
    actionId,
    final,
    reason,
    violations: Array.isArray(req.body?.violations) ? req.body.violations : [],
    sim: req.body?.sim ?? null,
    tribunal: req.body?.tribunal ?? null,
    decidedAt: new Date().toISOString(),
    request: pending?.req ?? null,
    override: { by: "admin", at: new Date().toISOString() },
  };

  const updated = setDecision(actionId, decision);
  eventBus.emit("governor.decision", decision);

  if (final === "approve") eventBus.emit("governor.action.approved", decision);
  else if (final === "deny") eventBus.emit("governor.action.denied", decision);
  else eventBus.emit("governor.action.throttled", decision);

  res.json({ ok: true, actionId, decision, updated });
});

export default router;
