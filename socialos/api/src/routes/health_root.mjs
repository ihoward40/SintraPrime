import express from "express";

import { rootHealth, healthHistory, lastChange, healthStream, metrics } from "../controllers/health_root_controller.mjs";

export function healthRootRoutes() {
  const r = express.Router();
  r.get("/health", rootHealth);
  r.get("/health/history", healthHistory);
  r.get("/health/history/last-change", lastChange);
  r.get("/health/stream", healthStream);
  r.get("/metrics", metrics);
  return r;
}
