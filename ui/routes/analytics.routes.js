import express from "express";
import { getAllEnforcementStates } from "../enforcement/enforcementChain.js";

const router = express.Router();

router.get("/creditors", (_req, res) => {
  const items = getAllEnforcementStates();

  const creditors = {};
  for (const it of items) {
    const name = String(it?.creditor || "unknown");
    if (!creditors[name]) {
      creditors[name] = {
        casesOpened: 0,
        casesClosed: 0,
        totalDaysToClose: 0,
        escalatedCount: 0,
        avgDaysToClose: null,
      };
    }

    creditors[name].casesOpened += 1;

    const stage = Number(it?.stage ?? 0);
    if (Number.isFinite(stage) && stage >= 3) creditors[name].escalatedCount += 1;
  }

  res.json({ ok: true, creditors });
});

export default router;
