import { Router } from "express";

import { analyticsController } from "../controllers/analytics_controller.mjs";

export function analyticsRoutes() {
  const r = Router();
  r.get("/analytics", analyticsController());
  return r;
}
