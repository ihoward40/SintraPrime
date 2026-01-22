import express from "express";
import { requireApiKey } from "../middleware/requireApiKey.js";
import { listPending, listRecentDecisions, listRecentActions, newActionId } from "../intelligence/governorState.js";
import { getGovernorRules } from "../intelligence/governorRules.js";
import { evaluateGovernorRequest } from "../intelligence/governorEvaluate.js";
import { eventBus } from "../core/eventBus.js";

const router = express.Router();

router.get("/rules", async (req, res) => {
  if (!requireApiKey(req, res)) return;
  const type = String(req.query.type || "filing").trim().toLowerCase();
  const rules = await getGovernorRules(type);
  res.json({ ok: true, type, rules });
});

router.get("/actions", (req, res) => {
  if (!requireApiKey(req, res)) return;
  const limit = Math.min(500, Math.max(1, Number(req.query.limit || 50)));
  const pending = listPending();
  const recentDecisions = listRecentDecisions(limit);
  const recentActions = listRecentActions(limit);
  res.json({ ok: true, pending, recentDecisions, recentActions });
});

router.post("/request", (req, res) => {
  if (!requireApiKey(req, res)) return;

  const type = String(req.body?.type || "").trim().toLowerCase();
  if (!type) return res.status(400).json({ ok: false, error: "type_required" });

  const actionId = newActionId();
  const payload = req.body?.payload ?? {};
  const mode = String(req.body?.mode || "standard").trim().toLowerCase();
  const scenarioId = req.body?.scenarioId ?? null;
  const path = req.body?.path ?? null;

  const actionReq = { actionId, type, mode, payload, scenarioId, path };
  eventBus.emit("governor.action.request", actionReq);
  res.json({ ok: true, actionId, enqueued: true });
});

router.post("/check", async (req, res) => {
  if (!requireApiKey(req, res)) return;
  try {
    const result = await evaluateGovernorRequest(req.body || {});
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

export default router;
