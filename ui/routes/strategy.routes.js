import express from "express";
import { requireApiKey } from "../middleware/requireApiKey.js";

const router = express.Router();

function s(v) {
  return String(v ?? "").trim();
}

function pickNextMotion({ stage, riskLevel }) {
  const risk = s(riskLevel).toLowerCase();
  const st = Number(stage);

  // Heuristic mapping (operator-configurable later).
  if (risk === "critical") {
    if (st <= 1) return { motionType: "motion_to_compel", rationale: "Critical risk early-stage → compel discovery/response" };
    return { motionType: "motion_for_sanctions", rationale: "Critical risk later-stage → sanctions posture" };
  }

  if (risk === "high") {
    if (st <= 2) return { motionType: "motion_to_compel", rationale: "High risk → tighten record via compel" };
    return { motionType: "motion_for_summary_disposition", rationale: "High risk later-stage → seek summary disposition" };
  }

  if (risk === "medium") {
    if (st <= 2) return { motionType: "motion_for_clarification", rationale: "Medium risk → clarify / narrow issues" };
    return { motionType: "motion_in_limine", rationale: "Medium risk later-stage → evidentiary narrowing" };
  }

  return { motionType: "status_report_or_letter", rationale: "Low/unknown risk → keep it tight, preserve goodwill" };
}

router.get("/next-filing", async (req, res) => {
  if (!requireApiKey(req, res)) return;

  // Pull from dashboard status by calling local server route handler via fetch.
  // This keeps logic close to ops truth without duplicating storage.
  try {
    const base = `http://127.0.0.1:${Number(process.env.UI_PORT || 3001)}`;
    const url = `${base}/api/dashboard/status`;
    const r = await fetch(url, { headers: { "x-api-key": String(req.headers["x-api-key"] || "") } });
    const payload = r.ok ? await r.json() : { items: [] };
    const items = Array.isArray(payload?.items) ? payload.items : [];

    // Score by risk + recency.
    const scoreRisk = (risk) => {
      const x = s(risk).toLowerCase();
      if (x === "critical") return 4;
      if (x === "high") return 3;
      if (x === "medium") return 2;
      if (x === "low") return 1;
      return 0;
    };

    const scored = items
      .map((it) => {
        const score = scoreRisk(it?.riskLevel) * 10 + (it?.paused ? -5 : 0) + Math.min(9, Number(it?.stage ?? 0));
        return { it, score };
      })
      .sort((a, b) => b.score - a.score);

    const top = scored[0]?.it || null;
    if (!top) {
      return res.json({ ok: true, suggestion: null, note: "No active dashboard items." });
    }

    const choice = pickNextMotion({ stage: top.stage, riskLevel: top.riskLevel });

    res.json({
      ok: true,
      suggestion: {
        caseId: top.caseId ?? null,
        creditor: top.creditor ?? null,
        stage: top.stage,
        riskLevel: top.riskLevel ?? null,
        motionType: choice.motionType,
        rationale: choice.rationale,
        disclaimer: "Automation heuristic only; not legal advice. Review with counsel.",
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: "strategy_failed", details: String(err?.message ?? err) });
  }
});

export default router;
