import express from "express";

import { getBestTime } from "../controllers/best_time_controller.mjs";

export function bestTimeRoutes() {
  const r = express.Router();
  r.get("/best-time", getBestTime);
  return r;
}
