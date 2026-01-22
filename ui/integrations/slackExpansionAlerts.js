import { eventBus } from "../core/eventBus.js";
import { SlackClient } from "../services/SlackClient.js";
import { pickChannelForEvent } from "../config/channelMap.js";
import { sendSlackAlertWebhook } from "../services/slackAlertWebhook.js";

let slack = null;
let started = false;

function slackTokenPresent() {
  return Boolean(process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN);
}

function getSlack() {
  if (slack) return slack;
  if (!slackTokenPresent()) return null;
  slack = new SlackClient({ defaultChannel: pickChannelForEvent("default", {}) });
  return slack;
}

async function maybeAlertWebhookFallback({ handlerName, text }) {
  // Emergency-only fallback when bot token isn't available.
  // Incoming webhooks are one-way; keep messages simple.
  try {
    await sendSlackAlertWebhook({ text: `[SintraPrime:${handlerName}] ${String(text || "").trim()}` });
  } catch {
    // ignore
  }
}

async function withSlack(handlerName, fn) {
  try {
    const s = getSlack();
    if (!s) return;
    await fn(s);
  } catch (err) {
    console.warn(`[UI] ⚠️ Slack expansion alert '${handlerName}' failed: ${err?.message || String(err)}`);
  }
}

function buildCaseBlocks({ creditor, caseId, stage }) {
  const cid = String(caseId || "").trim();
  const c = String(creditor || "unknown");
  const st = String(stage || "intake");

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*New Enforcement Case*\nCreditor: *${c}*\nCase ID: \`${cid || "pending"}\`\nStage: *${st}*`,
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Open Case" },
          style: "primary",
          action_id: "case_open",
          value: cid,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Escalate" },
          style: "danger",
          action_id: "case_escalate",
          value: cid,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Create Task" },
          action_id: "case_task",
          value: cid,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Mark Resolved" },
          action_id: "case_resolved",
          value: cid,
        },
      ],
    },
  ];
}

export function startSlackExpansionAlerts() {
  // Keep this lightweight: only attach listeners once.
  if (started) return;
  started = true;

  // If your enforcement chain emits this event, you get clickable Slack actions.
  eventBus.on("enforcement.case.created", async (payload) => {
    await withSlack("enforcement.case.created", async (s) => {
      const channel = payload?.channel || process.env.SLACK_DEFAULT_CHANNEL || pickChannelForEvent("enforcement.event", payload);
      const channel_id = String(channel || "").trim().startsWith("#") ? await s.resolveChannelId(channel) : channel;
      const text = `⚖️ New enforcement case opened for *${String(payload?.creditor || "unknown")}*`;
      await s._call("chat.postMessage", () =>
        s.client.chat.postMessage({
          channel: channel_id,
          text,
          blocks: buildCaseBlocks({ creditor: payload?.creditor, caseId: payload?.caseId, stage: payload?.stage }),
        }),
      );
    });

    if (!slackTokenPresent()) {
      const creditor = String(payload?.creditor || "unknown");
      await maybeAlertWebhookFallback({
        handlerName: "enforcement.case.created",
        text: `New enforcement case opened for ${creditor}.`,
      });
    }
  });

  eventBus.on("timeline.deadline.imminent", async (payload) => {
    await withSlack("timeline.deadline.imminent", async (s) => {
      const channel = payload?.channel || process.env.SLACK_DEFAULT_CHANNEL || pickChannelForEvent("default", {});
      const creditor = String(payload?.creditor || "");
      const due = String(payload?.dueDate || payload?.due || payload?.deadline || "");
      const action = String(payload?.action || payload?.label || "Prepare response");
      const text = `⏰ *Deadline Alert*\n${creditor ? `Creditor: *${creditor}*\n` : ""}Due: *${due || "(unknown)"}*\nAction: ${action}`;
      await s.sendText(channel, text);
    });

    if (!slackTokenPresent()) {
      const creditor = String(payload?.creditor || "");
      const due = String(payload?.dueDate || payload?.due || payload?.deadline || "");
      const action = String(payload?.action || payload?.label || "Prepare response");
      await maybeAlertWebhookFallback({
        handlerName: "timeline.deadline.imminent",
        text: `Deadline alert${creditor ? ` for ${creditor}` : ""}: due=${due || "(unknown)"}, action=${action}`,
      });
    }
  });
}

// Side-effect: register handlers on import (server imports integrations for wiring).
startSlackExpansionAlerts();
