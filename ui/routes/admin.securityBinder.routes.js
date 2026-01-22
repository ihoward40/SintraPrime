import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import { generateSecurityBinder } from "../services/securityBinderService.js";

const router = express.Router();
router.use(adminAuth);

router.post("/security/binder", (req, res) => {
  const { windowMinutes } = req.body || {};
  const result = generateSecurityBinder({ windowMinutes: windowMinutes || 60 });
  res.json({ ok: true, file: result.path, meta: result.binder.meta });
});

export default router;
