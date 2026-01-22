import { eventBus } from "../core/eventBus.js";
import { notionCreateCase } from "../integrations/notionCases.js";
import { SlackClient } from "../services/SlackClient.js";
import { pickChannelForEvent } from "../config/channelMap.js";

let slack = null;
let started = false;

function safeStr(v) {
  return v == null ? "" : String(v);
}

function slackTokenPresent() {
  return Boolean(process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN);
}

function getSlack() {
  if (slack) return slack;
  if (!slackTokenPresent()) return null;
  slack = new SlackClient({ defaultChannel: pickChannelForEvent("default", {}) });
  return slack;
}

async function withSlack(handlerName, fn) {
  try {
    const s = getSlack();
    if (!s) return;
    await fn(s);
  } catch (err) {
    console.warn(`[UI] ⚠️ SlackNotionBridge '${handlerName}' failed: ${err?.message || String(err)}`);
  }
}

const dedupe = new Map();
const DEDUPE_MS = Number(process.env.SLACK_NOTION_DEDUPE_MS || 2 * 60 * 1000);

function shouldDedupe(key) {
  const k = safeStr(key).trim();
  if (!k) return false;
  const now = Date.now();
  for (const [rk, ts] of dedupe.entries()) {
    if (now - ts > DEDUPE_MS) dedupe.delete(rk);
  }
  if (dedupe.has(k)) return true;
  dedupe.set(k, now);
  return false;
}

function mkCaseId({ creditor, ts } = {}) {
  const c = safeStr(creditor).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || "case";
  const t = safeStr(ts).trim() || Date.now().toString(36);
  return `SLK-${c}-${t}`.slice(0, 64);
}

function emitSlackRequested({ creditor, channel, userName, user_id, caseId, source, raw } = {}) {
  const c = safeStr(creditor).trim();
  if (!c) return;

  const cid = safeStr(caseId).trim() || mkCaseId({ creditor: c, ts: raw?.ts || raw?.context?.ts });
  const key = `${c}|${cid}|${safeStr(channel).trim()}`;
  if (shouldDedupe(key)) return;

  eventBus.emit("enforcement.slack.requested", {
    creditor: c,
    caseId: cid,
    userName: userName || null,
    user_id: user_id || null,
    channel: channel || null,
    source: source || "slack",
    raw: raw || null,
  });
}

async function postTacticalSlackReply({ channel, creditor, caseId, notionId, notionUrl }) {
  const ch = safeStr(channel).trim() || pickChannelForEvent("enforcement.event", { creditor }) || process.env.SLACK_DEFAULT_CHANNEL;
  const text = `⚖️ Enforcement initialized for *${safeStr(creditor) || "(unknown)"}*`;

  await withSlack("tactical_reply", async (s) => {
    const channel_id = String(ch || "").trim().startsWith("#") ? await s.resolveChannelId(ch) : ch;
    await s._call("chat.postMessage", () =>
      s.client.chat.postMessage({
        channel: channel_id,
        text,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*New Case Created*\nCreditor: *${safeStr(creditor) || "(unknown)"}*\nCase ID: \`${safeStr(caseId) || "(pending)"}\`\nNotion: ${notionUrl ? `<${notionUrl}|Open>` : `\`${safeStr(notionId) || "(pending)"}\``}`,
            },
          },
          {
            type: "actions",
            elements: [
              { type: "button", text: { type: "plain_text", text: "Open Case" }, style: "primary", action_id: "case_open", value: safeStr(caseId) },
              { type: "button", text: { type: "plain_text", text: "Escalate" }, style: "danger", action_id: "case_escalate", value: safeStr(caseId) },
              { type: "button", text: { type: "plain_text", text: "Create Task" }, action_id: "case_task", value: safeStr(caseId) },
              { type: "button", text: { type: "plain_text", text: "Mark Resolved" }, action_id: "case_resolved", value: safeStr(caseId) },
            ],
          },
        ],
      }),
    );
  });
}

export function startSlackNotionBridge() {
  if (started) return;
  started = true;

  console.log("[SlackNotionBridge] Online");

  // Trigger on creditor mentions from Slack Events.
  eventBus.on("creditor.observed", (evt) => {
    if (evt?.source !== "slack.events") return;
    emitSlackRequested({
      creditor: evt?.name,
      channel: evt?.context?.channel,
      user_id: evt?.context?.user,
      userName: null,
      caseId: null,
      source: "slack.creditor.observed",
      raw: evt,
    });
  });

  // Trigger on /sintra enforce <creditor>
  eventBus.on("cmd.enforce.run", (evt) => {
    emitSlackRequested({
      creditor: evt?.creditor,
      channel: evt?.channel,
      userName: evt?.user,
      user_id: evt?.user_id,
      caseId: null,
      source: "slack.cmd.enforce.run",
      raw: evt,
    });
  });

  // Trigger on /sintra enforce-start <creditor> <caseId> ...
  eventBus.on("cmd.enforce.start", (evt) => {
    emitSlackRequested({
      creditor: evt?.creditor,
      channel: evt?.channel,
      userName: evt?.user,
      user_id: evt?.user_id,
      caseId: evt?.caseId,
      source: "slack.cmd.enforce.start",
      raw: evt,
    });
  });

  // Main ingestion handler
  eventBus.on("enforcement.slack.requested", async (evt) => {
    const creditor = safeStr(evt?.creditor).trim();
    if (!creditor) return;

    const caseId = safeStr(evt?.caseId).trim() || mkCaseId({ creditor, ts: evt?.raw?.ts });
    const requestedBy = safeStr(evt?.userName || evt?.user_id).trim() || "(unknown)";

    // 1) Create case in Notion (if configured)
    let notion;
    try {
      notion = await notionCreateCase({
        creditor,
        requestedBy,
        caseId,
        source: "slack",
        slack: { channel: evt?.channel, user: evt?.user_id },
      });
    } catch (err) {
      console.warn(`[SlackNotionBridge] Notion create failed: ${err?.message || String(err)}`);
      notion = { ok: false, error: err?.message || String(err) };
    }

    // 2) Link timeline (timelineEngine already records enforcement events)
    eventBus.emit("enforcement.event", {
      creditor,
      caseId,
      status: "Case Created",
      details: notion?.ok ? `Notion: ${notion.url || notion.id || "(created)"}` : `Notion skipped/failed: ${safeStr(notion?.reason || notion?.error || "unknown")}`,
      link: notion?.url || null,
      source: "slackNotionBridge",
    });

    // 3) Trigger enforcement engine
    const strategy = safeStr(evt?.raw?.strategy).trim() || "default";
    const initialDoc = safeStr(evt?.raw?.initialDoc).trim() || "initial-notice";

    eventBus.emit("enforcement.chain.start", {
      creditor,
      caseId,
      strategy,
      initialDoc,
      channel: evt?.channel || undefined,
      persona: "slack",
    });

    // 4) Emit case.created for downstream Slack blocks / Make / voice
    eventBus.emit("enforcement.case.created", {
      creditor,
      caseId,
      notionId: notion?.id || null,
      notionUrl: notion?.url || null,
      requestedBy,
      slack: evt,
    });

    // 5) Slack reply with next actions
    await postTacticalSlackReply({
      channel: evt?.channel,
      creditor,
      caseId,
      notionId: notion?.id,
      notionUrl: notion?.url,
    });

    eventBus.emit("case.update", {
      channel: evt?.channel || undefined,
      caseId,
      title: "Case ingested from Slack",
      summary: `Creditor: ${creditor}. Requested by: ${requestedBy}. Notion: ${notion?.url || notion?.id || "(n/a)"}.`,
      link: notion?.url || undefined,
    });
  });
}

// Side-effect: start on import
startSlackNotionBridge();
