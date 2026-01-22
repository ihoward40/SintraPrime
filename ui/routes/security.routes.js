import express from "express";
import { requireApiKey } from "../middleware/requireApiKey.js";
import { getThreatState } from "../security/threatEngine.js";
import { getSecurityProfile } from "../security/securityProfile.js";
import { getIncidents } from "../security/securityIncidentLogger.js";
import { getBlueTeamStatus } from "../security/blueTeamEngine.js";

const router = express.Router();

router.get("/state", (req, res) => {
  if (!requireApiKey(req, res)) return;
  res.json({ ok: true, threat: getThreatState(), profile: getSecurityProfile() });
});

router.get("/incidents", (req, res) => {
  if (!requireApiKey(req, res)) return;
  const limit = Math.max(1, Math.min(500, Number(req.query.limit || 100)));
  res.json({ ok: true, items: getIncidents({ limit }) });
});

router.get("/blue-team/status", (req, res) => {
  if (!requireApiKey(req, res)) return;
  res.json(getBlueTeamStatus());
});

export default router;

