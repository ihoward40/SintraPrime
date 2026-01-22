import express from "express";
import { getPrimaryCandidate, getSelfNode, listClusterNodes, updateNodeFromHeartbeat } from "../core/clusterManager.js";

const router = express.Router();

router.get("/status", (_req, res) => {
  res.json({
    ok: true,
    node: getSelfNode(),
    uptime_s: Math.round(process.uptime()),
    at: new Date().toISOString(),
  });
});

router.get("/nodes", (_req, res) => {
  res.json({ ok: true, nodes: listClusterNodes() });
});

router.get("/primary-candidate", (_req, res) => {
  res.json({ ok: true, candidate: getPrimaryCandidate() });
});

// Optional: allow manual heartbeat registration for quick multi-process demos.
// If you want this locked down, set DASHBOARD_API_KEY and call with x-api-key.
router.post("/heartbeat", (req, res) => {
  const expected = String(process.env.DASHBOARD_API_KEY || "").trim();
  if (expected) {
    const provided = String(req.headers["x-api-key"] || "").trim();
    if (!provided || provided !== expected) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
  }

  const updated = updateNodeFromHeartbeat(req.body || {});
  if (!updated) return res.status(400).json({ ok: false, error: "invalid heartbeat payload" });
  return res.json({ ok: true, node: updated });
});

export default router;
