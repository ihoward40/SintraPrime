import express from "express";
import { getSlackGraph, getSlackGraphState, loadSlackGraphFromDisk } from "../services/slackGraphStore.js";

const router = express.Router();

router.get("/graph", (req, res) => {
  const compact = String(req.query?.compact || "").trim() === "1";
  const graph = getSlackGraph({ compact });
  const state = getSlackGraphState();

  return res.json({ ok: true, loaded: Boolean(state.loaded), loadedAt: state.loadedAt, sourcePath: state.sourcePath, error: state.error, graph });
});

router.post("/graph/reload", (req, res) => {
  const state = loadSlackGraphFromDisk();
  const compact = String(req.query?.compact || "").trim() === "1";
  const graph = getSlackGraph({ compact });
  return res.json({ ok: true, loaded: Boolean(state.loaded), loadedAt: state.loadedAt, sourcePath: state.sourcePath, error: state.error, graph });
});

export default router;
