import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { eventBus } from "../core/eventBus.js";

const router = express.Router();
router.use(adminAuth);

router.post("/advisor/run", (_req, res) => {
  eventBus.emit("advisor.force.tick", {});
  res.json({ ok: true });
});

router.post("/analytics/reset", (_req, res) => {
  // Stubbed: implement persistent analytics store reset when you want.
  res.json({ ok: true, msg: "Not implemented (stub)" });
});

export default router;
