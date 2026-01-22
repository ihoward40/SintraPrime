import express from "express";
import { adminAuth } from "../middleware/adminAuth.js";
import {
  completeParalegalTask,
  getParalegalState,
  resetParalegalState,
  upsertParalegalCase,
} from "../services/paralegalState.js";
import { eventBus } from "../core/eventBus.js";

const router = express.Router();

// Read-only state is safe to expose locally; if you want to lock it down in prod,
// set PARALEGAL_STATE_REQUIRE_ADMIN=1.
router.use((req, res, next) => {
  const requireAdmin = String(process.env.PARALEGAL_STATE_REQUIRE_ADMIN || "").trim() === "1";
  if (!requireAdmin) return next();
  return adminAuth(req, res, next);
});

router.get("/paralegal/state", (_req, res) => {
  const state = getParalegalState();
  res.json({
    ok: true,
    tasks: state.tasks,
    cases: state.cases,
    count: { tasks: state.tasks.length, cases: state.cases.length },
  });
});

router.get("/paralegal/summary", (_req, res) => {
  const state = getParalegalState();
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const cases = Array.isArray(state.cases) ? state.cases : [];

  const openTasks = tasks.filter((t) => String(t?.status || "").toLowerCase() !== "done");
  const doneTasks = tasks.filter((t) => String(t?.status || "").toLowerCase() === "done");
  const openCases = cases.filter((c) => String(c?.status || "").toLowerCase() !== "closed");
  const closedCases = cases.filter((c) => String(c?.status || "").toLowerCase() === "closed");

  const recentTasks = openTasks
    .slice()
    .sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")))
    .slice(0, 10);

  const recentCases = openCases
    .slice()
    .sort((a, b) => String(b?.updatedAt || b?.createdAt || "").localeCompare(String(a?.updatedAt || a?.createdAt || "")))
    .slice(0, 10);

  return res.json({
    ok: true,
    now: new Date().toISOString(),
    count: {
      tasks: tasks.length,
      tasksOpen: openTasks.length,
      tasksDone: doneTasks.length,
      cases: cases.length,
      casesOpen: openCases.length,
      casesClosed: closedCases.length,
    },
    recent: { tasks: recentTasks, cases: recentCases },
  });
});

router.get("/paralegal/cases", (req, res) => {
  const state = getParalegalState();
  const cases = Array.isArray(state.cases) ? state.cases : [];
  const q = String(req.query.q || "").trim().toLowerCase();
  const status = String(req.query.status || "").trim().toLowerCase();

  const filtered = cases
    .filter((c) => {
      if (!q) return true;
      const hay = JSON.stringify({
        id: c?.id,
        creditor: c?.creditor,
        domain: c?.domain,
        reference: c?.reference,
        status: c?.status,
      })
        .toLowerCase()
        .replace(/\s+/g, " ");
      return hay.includes(q);
    })
    .filter((c) => {
      if (!status) return true;
      return String(c?.status || "").toLowerCase() === status;
    })
    .sort((a, b) => String(b?.updatedAt || b?.createdAt || "").localeCompare(String(a?.updatedAt || a?.createdAt || "")));

  return res.json({ ok: true, cases: filtered, total: filtered.length });
});

router.get("/paralegal/tasks", (req, res) => {
  const state = getParalegalState();
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const q = String(req.query.q || "").trim().toLowerCase();
  const status = String(req.query.status || "").trim().toLowerCase(); // open|done

  const filtered = tasks
    .filter((t) => {
      if (!q) return true;
      const hay = JSON.stringify({
        id: t?.id,
        title: t?.title,
        description: t?.description,
        caseId: t?.caseId,
        type: t?.type,
        status: t?.status,
      })
        .toLowerCase()
        .replace(/\s+/g, " ");
      return hay.includes(q);
    })
    .filter((t) => {
      if (!status) return true;
      const s = String(t?.status || "").toLowerCase();
      if (status === "open") return s !== "done";
      if (status === "done") return s === "done";
      return s === status;
    })
    .sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));

  return res.json({ ok: true, tasks: filtered, total: filtered.length });
});

router.post("/paralegal/task/complete", express.json(), (req, res) => {
  const id = String(req.body?.id || "").trim();
  if (!id) return res.status(400).json({ ok: false, error: "id required" });

  const task = completeParalegalTask(eventBus, id);
  if (!task) return res.status(404).json({ ok: false, error: "Task not found" });
  return res.json({ ok: true, task });
});

router.post("/paralegal/reset", (req, res) => {
  resetParalegalState();
  eventBus.emit("paralegal.state.reset", { at: new Date().toISOString() });
  return res.json({ ok: true });
});

router.post("/paralegal/case/:id/packet", express.json(), (req, res) => {
  const caseKey = String(req.params.id || "").trim();
  if (!caseKey) return res.status(400).json({ ok: false, error: "case id required" });

  const state = getParalegalState();
  const caseObj = (state.cases || []).find((c) => String(c?.id || "") === caseKey) || null;
  if (!caseObj) return res.status(404).json({ ok: false, error: "Case not found" });

  const payload = {
    caseKey,
    requestedAt: new Date().toISOString(),
    requestedBy: String(req.headers["x-sintra-admin"] || "").trim() ? "admin" : req.ip,
    options: req.body?.options || null,
  };

  upsertParalegalCase(eventBus, caseKey, { packetRequestedAt: payload.requestedAt });
  eventBus.emit("paralegal.case.packet.requested", payload);

  return res.json({ ok: true, emitted: true, payload });
});

export default router;
