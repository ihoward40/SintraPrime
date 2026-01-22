import fs from "node:fs";
import path from "node:path";

import { eventBus } from "../core/eventBus.js";
import { createParalegalTask, upsertParalegalCase } from "../services/paralegalState.js";

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[AutonomousParalegal] ${msg}`);
}

function enabled() {
  const v = String(process.env.PARALEGAL_AUTONOMOUS || "").trim();
  return v === "1" || v.toLowerCase() === "true";
}

function safeStr(v) {
  return v == null ? "" : String(v);
}

function tryLoadSlackContext() {
  // Prefer newest Phase-2 artifacts (repo-native)
  const latestDir = path.resolve(process.cwd(), "runs", "slack_graph", "latest");
  const graphPath = path.join(latestDir, "graph.json");
  const evidencePath = path.join(latestDir, "paralegal_evidence_pack.jsonl");

  let context = { graph: null, evidenceCount: 0 };

  try {
    if (fs.existsSync(graphPath)) {
      context.graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
    }
  } catch {
    // ignore
  }

  try {
    if (fs.existsSync(evidencePath)) {
      const raw = fs.readFileSync(evidencePath, "utf8").trim();
      context.evidenceCount = raw ? raw.split(/\r?\n/).filter(Boolean).length : 0;
    }
  } catch {
    // ignore
  }

  return context;
}

function normalizeCreditorName(evt) {
  const name = safeStr(evt?.name || evt?.creditor || "").trim();
  if (!name) return "";
  return name.toUpperCase();
}

function start() {
  if (!enabled()) {
    log("Disabled (set PARALEGAL_AUTONOMOUS=1 to enable)");
    return;
  }

  log("Starting Autonomous Paralegal mode…");

  const ctx = tryLoadSlackContext();
  eventBus.emit("paralegal.slack.context.ready", { evidenceCount: ctx.evidenceCount, hasGraph: Boolean(ctx.graph) });
  if (ctx.graph || ctx.evidenceCount) log(`Loaded ${ctx.evidenceCount} Slack events for context.`);

  // Creditor observed -> create case + draft packet task
  eventBus.on("creditor.observed", (evt = {}) => {
    const creditor = normalizeCreditorName(evt);
    if (!creditor) return;

    const caseKey = `cred:${creditor}`;
    const caseObj = upsertParalegalCase(eventBus, caseKey, {
      domain: "creditor",
      creditor,
      reference: evt?.reference || null,
      event: { type: "creditor.observed", at: new Date().toISOString(), payload: evt },
    });

    createParalegalTask(eventBus, {
      kind: "draft_enforcement_packet",
      label: `Draft enforcement packet for ${creditor}`,
      domain: "creditor",
      creditor,
      priority: "high",
      source: evt?.source || "creditor.observed",
      caseId: caseObj?.id || caseKey,
      metadata: { channel: evt?.channel || evt?.channel_id || null, context: evt?.context || null },
    });
  });

  // Enforcement case created/opened -> exhibits task
  function onEnforcementCaseCreated(evt = {}) {
    const creditor = normalizeCreditorName(evt);
    const caseId = safeStr(evt?.caseId || "").trim() || null;
    const caseKey = caseId ? `enf:${caseId}` : creditor ? `enf:${creditor}` : `enf:${Date.now()}`;

    const caseObj = upsertParalegalCase(eventBus, caseKey, {
      domain: "enforcement",
      creditor: creditor || null,
      reference: evt?.reference || null,
      status: "open",
      event: { type: "enforcement.case.created", at: new Date().toISOString(), payload: evt },
    });

    createParalegalTask(eventBus, {
      kind: "assemble_exhibits",
      label: `Assemble exhibits for ${caseObj?.id || caseKey}`,
      domain: "enforcement",
      creditor: caseObj?.creditor || null,
      priority: "high",
      source: "enforcement.case.created",
      caseId: caseObj?.id || caseKey,
      metadata: { channel: evt?.channel || null },
    });
  }

  eventBus.on("enforcement.case.created", onEnforcementCaseCreated);
  eventBus.on("enforcement.case.opened", onEnforcementCaseCreated);

  // AI argument ready -> hearing prep task
  eventBus.on("ai.argument.ready", (evt = {}) => {
    const creditor = normalizeCreditorName(evt);
    const caseId = safeStr(evt?.caseId || "").trim() || null;
    const caseKey = caseId ? `arg:${caseId}` : creditor ? `arg:${creditor}` : `arg:${Date.now()}`;

    const caseObj = upsertParalegalCase(eventBus, caseKey, {
      domain: "argument",
      creditor: creditor || null,
      reference: evt?.reference || null,
      status: "open",
      event: { type: "ai.argument.ready", at: new Date().toISOString(), payload: evt },
    });

    createParalegalTask(eventBus, {
      kind: "hearing_prep_packet",
      label: "Prepare hearing packet from AI argument (human review)",
      domain: "argument",
      creditor: caseObj?.creditor || null,
      priority: "high",
      source: "ai.argument.ready",
      caseId: caseObj?.id || caseKey,
      metadata: { channel: evt?.channel || null },
    });
  });

  // Verdict submitted -> follow-up task
  eventBus.on("case.verdict.submitted", (evt = {}) => {
    const creditor = normalizeCreditorName(evt);
    const caseId = safeStr(evt?.caseId || "").trim() || null;
    const caseKey = caseId ? `vrd:${caseId}` : creditor ? `vrd:${creditor}` : `vrd:${Date.now()}`;

    const caseObj = upsertParalegalCase(eventBus, caseKey, {
      domain: "verdict",
      creditor: creditor || null,
      reference: evt?.reference || null,
      status: "open",
      event: { type: "case.verdict.submitted", at: new Date().toISOString(), payload: evt },
    });

    createParalegalTask(eventBus, {
      kind: "post_verdict_followups",
      label: "Create post-verdict follow-ups (deadlines, notices, next actions)",
      domain: "verdict",
      creditor: caseObj?.creditor || null,
      priority: "high",
      source: "case.verdict.submitted",
      caseId: caseObj?.id || caseKey,
      metadata: { channel: evt?.channel || null },
    });
  });

  // Draft approvals from Slack interactivity -> filing queue task (still human-controlled)
  eventBus.on("paralegal.draft.approve.requested", (evt = {}) => {
    createParalegalTask(eventBus, {
      kind: "review_approved_draft",
      label: "Review approved draft and queue filing (human step)",
      domain: "paralegal",
      priority: "high",
      source: "slack.interactivity",
      metadata: { value: evt?.value || null, user: evt?.user || null, channel: evt?.channel || null },
    });
  });

  eventBus.on("paralegal.draft.reject.requested", (evt = {}) => {
    createParalegalTask(eventBus, {
      kind: "revise_rejected_draft",
      label: "Revise draft after rejection (human step)",
      domain: "paralegal",
      priority: "medium",
      source: "slack.interactivity",
      metadata: { value: evt?.value || null, user: evt?.user || null, channel: evt?.channel || null },
    });
  });

  eventBus.on("paralegal.draft.sendToQueue.requested", (evt = {}) => {
    createParalegalTask(eventBus, {
      kind: "queue_for_cfpb",
      label: "Queue draft for CFPB workflow (human step)",
      domain: "paralegal",
      priority: "high",
      source: "slack.interactivity",
      metadata: { value: evt?.value || null, user: evt?.user || null, channel: evt?.channel || null },
    });
  });

  log("Event listeners registered.");
}

start();
