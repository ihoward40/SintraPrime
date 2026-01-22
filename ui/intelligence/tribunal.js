import path from "node:path";
import { eventBus } from "../core/eventBus.js";
import { appendJsonl } from "../services/jsonlStore.js";
import { logTribunalDecision } from "../integrations/notionTribunal.js";

const RUNS_DIR = path.resolve(process.cwd(), "runs");
const TRIBUNAL_LOG = path.join(RUNS_DIR, "tribunal-decisions.jsonl");

const PENDING = new Map(); // actionId -> { req, votes, timeout }

function nowIso() {
  return new Date().toISOString();
}

function ensureSlot(actionId, req) {
  if (!PENDING.has(actionId)) {
    const timeoutMs = Math.max(1000, Math.min(60_000, Number(process.env.TRIBUNAL_TIMEOUT_MS || 10_000)));
    PENDING.set(actionId, {
      req,
      votes: {},
      timeout: setTimeout(() => {
        finalize(actionId, true);
      }, timeoutMs),
    });
  }
  return PENDING.get(actionId);
}

function handleVote(votePayload) {
  const actionId = String(votePayload?.actionId || "").trim();
  const agent = String(votePayload?.agent || "").trim();
  if (!actionId || !agent) return;

  const slot = PENDING.get(actionId);
  if (!slot) return;

  slot.votes[agent] = votePayload;
  if (slot.votes.risk && slot.votes.strategy && slot.votes.compliance) {
    finalize(actionId, false);
  }
}

function tallyVotes(votes) {
  let approve = 0;
  let deny = 0;
  let throttle = 0;
  for (const v of Object.values(votes || {})) {
    if (!v) continue;
    if (v.vote === "approve") approve += 1;
    else if (v.vote === "deny") deny += 1;
    else if (v.vote === "throttle") throttle += 1;
  }
  return { approve, deny, throttle };
}

function finalize(actionId, partial) {
  const slot = PENDING.get(actionId);
  if (!slot) return;

  clearTimeout(slot.timeout);
  PENDING.delete(actionId);

  const { req, votes } = slot;
  const tally = tallyVotes(votes);

  let final;
  if (tally.deny >= 2) final = "deny";
  else if (tally.approve >= 2) final = "approve";
  else if (tally.throttle >= 2) final = "throttle";
  else final = "override_required";

  const decision = {
    actionId,
    final,
    tally,
    votes,
    partial,
    decidedAt: nowIso(),
  };

  appendJsonl(TRIBUNAL_LOG, { ts: nowIso(), kind: "tribunal.decision", actionId, decision, request: req });
  logTribunalDecision(req, decision).catch(() => {});

  eventBus.emit("tribunal.decision", { request: req, decision });
}

export function startTribunal() {
  eventBus.on("tribunal.action.review", (req) => {
    const actionId = String(req?.actionId || "").trim();
    if (!actionId) return;
    ensureSlot(actionId, req);

    eventBus.emit("tribunal.risk.review", req);
    eventBus.emit("tribunal.strategy.review", req);
    eventBus.emit("tribunal.compliance.review", req);
  });

  eventBus.on("tribunal.vote.risk", handleVote);
  eventBus.on("tribunal.vote.strategy", handleVote);
  eventBus.on("tribunal.vote.compliance", handleVote);
}
