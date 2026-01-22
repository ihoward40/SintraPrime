import { eventBus } from "../../core/eventBus.js";
import { SlackClient } from "../../services/SlackClient.js";
import { pickChannelForEvent } from "../../config/channelMap.js";
import { classifyLegalIntent } from "./paralegalIntent.js";
import { buildDraftRequest } from "./paralegalDraftBuilder.js";
import { scoreDraftText } from "./paralegalQa.js";
import { notionLogParalegalEvent } from "../../integrations/notionParalegal.js";

let started = false;
let slack = null;
let _openai = null;

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
    console.warn(`[UI] ⚠️ Paralegal '${handlerName}' Slack post failed: ${err?.message || String(err)}`);
  }
}

async function getOpenAI() {
  if (_openai) return _openai;
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key) return null;
  const mod = await import("openai");
  const OpenAI = mod?.default || mod?.OpenAI;
  _openai = new OpenAI({ apiKey: key });
  return _openai;
}

function paralegalChannel(slackEvt) {
  return (
    safeStr(slackEvt?.channel_id).trim() ||
    safeStr(slackEvt?.channel).trim() ||
    safeStr(process.env.SLACK_PARALEGAL_CHANNEL || "").trim() ||
    safeStr(process.env.SLACK_DEFAULT_CHANNEL || "").trim() ||
    pickChannelForEvent("default", {})
  );
}

function recommendExhibits(text, intent) {
  const lc = safeStr(text).toLowerCase();
  const ex = [];

  ex.push("Original notice/letter (PDF or screenshot)");
  ex.push("Proof of payment (receipt, bank statement, confirmation email)");
  ex.push("Account history + billing statements" );

  if (lc.includes("shutoff") || lc.includes("disconnect")) ex.push("Service shutoff timeline (dates + screenshots)");
  if (lc.includes("credit") || lc.includes("report")) ex.push("Credit reports (all 3 bureaus)" );
  if (lc.includes("ews") || lc.includes("early warning")) ex.push("Early Warning file extract / denial screenshots" );

  if (safeStr(intent?.domain).includes("consumer")) ex.push("Prior disputes / responses (CFPB, bureaus, furnisher)" );
  if (safeStr(intent?.domain).includes("tax")) ex.push("IRS notices (CP-series), transcripts, offset letters" );

  // dedupe
  return Array.from(new Set(ex)).slice(0, 10);
}

function buildBriefFallback(text, intent) {
  const exhibits = recommendExhibits(text, intent);
  return [
    `Domain: *${safeStr(intent?.domainLabel)}*`,
    `Motion Type: *${safeStr(intent?.motionTypeLabel)}*`,
    "",
    "*Immediate next moves*",
    "1) Confirm facts + dates and collect exhibits",
    "2) Draft notice/complaint (review required)",
    "3) Start enforcement timeline and calendar deadlines",
    "",
    "*Suggested exhibits*",
    ...exhibits.map((e) => `• ${e}`),
  ].join("\n");
}

async function generateBrief(text, intent) {
  const client = await getOpenAI();
  if (!client) return { ok: true, summary: buildBriefFallback(text, intent), model: null };

  const ai = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "You are SintraPrime Autonomous Paralegal. Produce a concise, action-oriented legal brief. Never instruct filing without human review. Output: (1) Issue summary, (2) Applicable playbook, (3) Deadlines, (4) Evidence/exhibits needed, (5) Recommended next 3 actions. Be practical.",
      },
      { role: "user", content: safeStr(text) },
    ],
  });

  const summary = safeStr(ai?.choices?.[0]?.message?.content).trim() || "(No brief returned.)";
  return { ok: true, summary, model: process.env.OPENAI_MODEL || "gpt-4.1-mini" };
}

async function generateDraft(text, intent) {
  const client = await getOpenAI();
  if (!client) {
    const fallback = [
      "DRAFT – REVIEW REQUIRED",
      `Domain: ${safeStr(intent?.domainLabel)}`,
      "",
      "FACTS:",
      safeStr(text),
      "",
      "ISSUES:",
      "- Identify disputed charges/reporting and dates",
      "- Confirm proof of payment and prior dispute attempts",
      "",
      "REQUESTED RELIEF:",
      "- Correct account / stop shutoff / correct reporting",
      "- Provide written explanation and itemization",
      "",
      "EXHIBITS NEEDED:",
      ...recommendExhibits(text, intent).map((e) => `- ${e}`),
    ].join("\n");
    return { ok: true, text: fallback, model: null };
  }

  const ai = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "You are SintraPrime Autonomous Paralegal. Draft a formal complaint/notice/letter suitable for attorney review. Include headings: FACTS, ISSUES, REQUESTED RELIEF, EXHIBITS, DEADLINES. Mark clearly: 'DRAFT – REVIEW REQUIRED'. Do not claim to be a lawyer. Keep it professional and specific but avoid hallucinating unknown facts.",
      },
      {
        role: "user",
        content: `Context:\n${safeStr(text)}\n\nIntent:\n${JSON.stringify(intent)}`,
      },
    ],
  });

  const out = safeStr(ai?.choices?.[0]?.message?.content).trim() || "(No draft returned.)";
  return { ok: true, text: out, model: process.env.OPENAI_MODEL || "gpt-4.1-mini" };
}

async function postDraftToSlack({ channel, userName, intent, draftText, notionUrl, notionId }) {
  const ch = safeStr(channel).trim() || pickChannelForEvent("default", {});
  const header = `📝 *Draft Generated (REVIEW REQUIRED)*\nDomain: *${safeStr(intent?.domainLabel)}*\nRequested by: *${safeStr(userName) || "(unknown)"}*`;

  const short = draftText.length > 2600 ? `${draftText.slice(0, 2600)}…` : draftText;

  await withSlack("draft.post", async (s) => {
    const channel_id = String(ch || "").trim().startsWith("#") ? await s.resolveChannelId(ch) : ch;
    await s._call("chat.postMessage", () =>
      s.client.chat.postMessage({
        channel: channel_id,
        text: header,
        blocks: [
          { type: "section", text: { type: "mrkdwn", text: header } },
          { type: "section", text: { type: "mrkdwn", text: `\n\`\`\`\n${short}\n\`\`\`` } },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Approve Draft" },
                style: "primary",
                action_id: "paralegal_approve_draft",
                value: safeStr(notionId) || "draft",
              },
              {
                type: "button",
                text: { type: "plain_text", text: "Reject" },
                style: "danger",
                action_id: "paralegal_reject_draft",
                value: safeStr(notionId) || "draft",
              },
              ...(notionUrl
                ? [
                    {
                      type: "button",
                      text: { type: "plain_text", text: "Edit in Notion" },
                      url: notionUrl,
                      action_id: "paralegal_edit_notion",
                    },
                  ]
                : []),
              {
                type: "button",
                text: { type: "plain_text", text: "Send to CFPB Queue" },
                action_id: "paralegal_send_cfpb_queue",
                value: safeStr(notionId) || "draft",
              },
            ],
          },
        ],
      }),
    );
  });
}

export function startParalegalOrchestrator() {
  if (started) return;
  started = true;

  console.log("[ParalegalOrchestrator] Online");

  eventBus.on("paralegal.brief.requested", async (evt) => {
    try {
      const body = safeStr(evt?.body || evt?.text || "").trim();
      const intent = await classifyLegalIntent(body);

      const channel = paralegalChannel(evt);

      await notionLogParalegalEvent({
        type: "brief",
        intent,
        raw: body,
        user: evt?.user_name,
        status: "requested",
      }).catch(() => null);

      await withSlack("brief.working", async (s) => {
        await s.sendText(channel, `📚 Working on your legal brief for *${safeStr(intent?.domainLabel)}*…`);
      });

      const brief = await generateBrief(body, intent);

      await notionLogParalegalEvent({
        type: "brief-output",
        intent,
        raw: body,
        user: evt?.user_name,
        status: "drafted",
        draftText: brief.summary,
      }).catch(() => null);

      await withSlack("brief.completed", async (s) => {
        await s.sendText(channel, `📚 *Legal Brief Ready*\n${brief.summary}`);
      });
    } catch (err) {
      eventBus.emit("system.error", { source: "ParalegalOrchestrator.brief", error: safeStr(err?.message || err), context: evt || null });
    }
  });

  eventBus.on("paralegal.draft.requested", async (evt) => {
    try {
      const body = safeStr(evt?.body || evt?.text || "").trim();
      const intent = await classifyLegalIntent(body);
      const draftInput = await buildDraftRequest(body, intent);
      const channel = paralegalChannel(evt);

      await notionLogParalegalEvent({
        type: "draft",
        intent,
        raw: body,
        user: evt?.user_name,
        status: "requested",
      }).catch(() => null);

      await withSlack("draft.working", async (s) => {
        await s.sendText(channel, `📝 Building draft for *${safeStr(intent?.motionTypeLabel)}*…`);
      });

      // If we have a deterministic doc generator hook for this template, trigger it.
      if (draftInput.docGeneratorEvent) {
        eventBus.emit(draftInput.docGeneratorEvent, {
          creditor: safeStr(intent?.creditorKey || intent?.domainLabel || "unknown"),
          classification: { name: safeStr(intent?.creditorKey || "unknown"), intent },
          channel,
        });
      }

      const draft = await generateDraft(body, intent);
      const qa = scoreDraftText(draft.text);

      const notion = await notionLogParalegalEvent({
        type: "draft-output",
        intent,
        raw: body,
        user: evt?.user_name,
        status: "needs-review",
        score: qa.score,
        redFlags: qa.flags,
        draftText: draft.text,
        linkedCaseId: evt?.caseId || null,
      }).catch(() => null);

      await postDraftToSlack({
        channel,
        userName: evt?.user_name,
        intent,
        draftText: draft.text,
        notionUrl: notion?.url || null,
        notionId: notion?.id || null,
      });

      await withSlack("draft.qa", async (s) => {
        const flags = qa.flags.length ? qa.flags.join(", ") : "none";
        await s.sendText(channel, `🧪 *Draft QA Check*\nScore: *${qa.score}*/100\nRed flags: _${flags}_\nIntent: *${safeStr(intent?.domainLabel)}* / *${safeStr(intent?.motionTypeLabel)}*`);
      });
    } catch (err) {
      eventBus.emit("system.error", { source: "ParalegalOrchestrator.draft", error: safeStr(err?.message || err), context: evt || null });
    }
  });

  eventBus.on("paralegal.nextstep.requested", async (evt) => {
    try {
      const body = safeStr(evt?.body || evt?.text || "").trim();
      const intent = await classifyLegalIntent(body);
      const channel = paralegalChannel(evt);

      await withSlack("nextstep.working", async (s) => {
        await s.sendText(channel, "🧭 Analyzing case history to suggest the next filing/action…");
      });

      const client = await getOpenAI();
      let summary;
      if (client) {
        const ai = await client.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                "You are SintraPrime Autonomous Paralegal. Recommend the next best procedural step and why. Include: (1) Next action, (2) Deadline/clock considerations, (3) Risks, (4) Required exhibits. Never advise filing without human review.",
            },
            { role: "user", content: `Input:\n${body}\n\nIntent:\n${JSON.stringify(intent)}` },
          ],
        });
        summary = safeStr(ai?.choices?.[0]?.message?.content).trim();
      }

      if (!summary) {
        summary = buildBriefFallback(body, intent);
      }

      await notionLogParalegalEvent({
        type: "next-step",
        intent,
        raw: body,
        user: evt?.user_name,
        status: "drafted",
        draftText: summary,
      }).catch(() => null);

      await withSlack("nextstep.completed", async (s) => {
        await s.sendText(channel, `🧭 *Recommended Next Step*\nDomain: *${safeStr(intent?.domainLabel)}*\n\n${summary}`);
      });
    } catch (err) {
      eventBus.emit("system.error", { source: "ParalegalOrchestrator.nextstep", error: safeStr(err?.message || err), context: evt || null });
    }
  });

  // Safety: clicks only emit events; nothing files automatically.
  eventBus.on("paralegal.draft.approve.requested", (evt) => {
    eventBus.emit("case.update", {
      channel: evt?.channel || undefined,
      caseId: "PARALEGAL",
      title: "Draft approved (human) — action required",
      summary: `Draft approved in Slack. Notion: ${safeStr(evt?.notionId || "(n/a)")}. Next step: route to filing queue manually or via a gated workflow.`,
    });
  });
}

// Side-effect: start on import
startParalegalOrchestrator();
