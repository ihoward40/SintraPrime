import express from "express";

import { receiptsHealth } from "../controllers/health_controller.mjs";

export function healthRoutes() {
  const r = express.Router();
  r.get("/health/receipts", receiptsHealth);
  return r;
}
