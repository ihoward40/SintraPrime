import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { listClusterNodes, setNodeLatency, updateNodeFromHeartbeat } from "../core/clusterManager.js";

const router = express.Router();
router.use(adminAuth);

router.post("/node/ping", async (req, res) => {
  const url = String(req.body?.url || "").trim();
  if (!url) return res.status(400).json({ ok: false, error: "url is required" });

  const controller = new AbortController();
  const t0 = Date.now();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/api/cluster/status`, { signal: controller.signal });
    const json = await r.json();
    const dt = Date.now() - t0;

    const nodeId = String(json?.node?.nodeId || json?.nodeId || "").trim();
    if (nodeId) setNodeLatency(nodeId, dt);

    return res.json({ ok: true, latencyMs: dt, data: json });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  } finally {
    clearTimeout(timeout);
  }
});

router.post("/node/heartbeat", (req, res) => {
  const nodeId = String(req.body?.nodeId || "").trim();
  if (!nodeId) return res.status(400).json({ ok: false, error: "nodeId required" });

  const updated = updateNodeFromHeartbeat({
    nodeId,
    url: req.body?.url ?? null,
    role: req.body?.role ?? "worker",
    capabilities: req.body?.capabilities ?? [],
  });

  res.json({ ok: true, node: updated });
});

router.post("/node/role", (req, res) => {
  const nodeId = String(req.body?.nodeId || "").trim();
  const role = String(req.body?.role || "").trim();
  if (!nodeId || !role) return res.status(400).json({ ok: false, error: "nodeId and role required" });

  const nodes = listClusterNodes();
  const n = nodes.find((x) => x.nodeId === nodeId);
  if (!n) return res.status(404).json({ ok: false, error: "node not found" });

  // Soft role change: update registry in-memory.
  updateNodeFromHeartbeat({ ...n, role });
  res.json({ ok: true, nodeId, newRole: role });
});

export default router;
