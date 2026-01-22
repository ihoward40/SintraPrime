import path from "node:path";
import crypto from "node:crypto";
import { appendJsonl, readJsonl } from "../services/jsonlStore.js";

const RUNS_DIR = path.resolve(process.cwd(), "runs");
const ACTIONS_LOG = path.join(RUNS_DIR, "governor-actions.jsonl");
const DECISIONS_LOG = path.join(RUNS_DIR, "governor-decisions.jsonl");

const PENDING = new Map(); // actionId -> action

function nowIso() {
  return new Date().toISOString();
}

export function newActionId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}

export function enqueueAction(req) {
  const actionId = String(req?.actionId || "").trim() || newActionId();
  const action = {
    actionId,
    status: "pending",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    req: { ...(req || {}), actionId },
    decision: null,
  };
  PENDING.set(actionId, action);
  appendJsonl(ACTIONS_LOG, { ts: nowIso(), kind: "governor.action.enqueued", actionId, action });
  return action;
}

export function setDecision(actionId, decision) {
  const id = String(actionId || "").trim();
  if (!id) return null;
  const slot = PENDING.get(id) || null;
  const updated = {
    ...(slot || { actionId: id, createdAt: nowIso(), req: null }),
    status: decision?.final || decision?.status || "unknown",
    updatedAt: nowIso(),
    decision: decision || null,
  };
  PENDING.delete(id);
  appendJsonl(DECISIONS_LOG, { ts: nowIso(), kind: "governor.decision", actionId: id, decision: decision || null });
  appendJsonl(ACTIONS_LOG, { ts: nowIso(), kind: "governor.action.resolved", actionId: id, action: updated });
  return updated;
}

export function listPending() {
  return Array.from(PENDING.values()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function getPending(actionId) {
  const id = String(actionId || "").trim();
  if (!id) return null;
  return PENDING.get(id) || null;
}

export function listRecentDecisions(limit = 50) {
  const n = Math.max(1, Math.min(500, Number(limit || 50)));
  return readJsonl(DECISIONS_LOG, { limit: n, newestFirst: true });
}

export function listRecentActions(limit = 50) {
  const n = Math.max(1, Math.min(500, Number(limit || 50)));
  return readJsonl(ACTIONS_LOG, { limit: n, newestFirst: true });
}
