import express from "express";

import { listReceipts, verifyReceipt } from "../controllers/receipts_controller.mjs";

export function receiptsRoutes() {
  const r = express.Router();
  r.get("/receipts", listReceipts);
  r.get("/receipts/:id/verify", verifyReceipt);
  return r;
}
