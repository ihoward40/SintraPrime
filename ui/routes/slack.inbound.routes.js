import express from "express";
import { eventBus } from "../core/eventBus.js";
import { verifySlackRequest } from "../services/slack-signature.js";

const router = express.Router();

function verifyOrReject(req, res) {
  const signingSecret = String(process.env.SLACK_SIGNING_SECRET || "").trim();
  const allowUnverified = String(process.env.SLACK_ALLOW_UNVERIFIED || "").trim() === "1";

  if (!signingSecret) {
    if (allowUnverified) return { ok: true, reason: "unverified_allowed" };
    res.status(503).json({
      ok: false,
      error: "missing_SLACK_SIGNING_SECRET",
      hint: "Set SLACK_SIGNING_SECRET or set SLACK_ALLOW_UNVERIFIED=1 for local testing.",
    });
    return { ok: false, responded: true };
  }

  const ts = req.get("X-Slack-Request-Timestamp");
  const sig = req.get("X-Slack-Signature");
  const rawBody = req.rawBody || "";

  const v = verifySlackRequest({
    signingSecret,
    rawBody,
    timestamp: ts,
    signature: sig,
  });

  if (!v.ok) {
    res.status(401).json({ ok: false, error: "invalid_slack_signature", reason: v.reason });
    return { ok: false, responded: true };
  }

  return { ok: true };
}

function extractTextFromSlackEvent(event) {
  const t = String(event?.text || "");
  return t;
}

function extractCreditorsFromText(text) {
  const t = String(text || "").toLowerCase();
  if (!t.trim()) return [];

  const hits = new Set();
  const addIf = (id, re) => {
    if (re.test(t)) hits.add(id);
  };

  addIf("verizon", /\bverizon\b|\bfios\b|\bwireless\b/);
  addIf("chase", /\bchase\b|\bjpmorgan\b|\bj\.?p\.?\s*morgan\b/);
  addIf("wells", /\bwells\s*fargo\b|\bwells\b/);
  addIf("irs", /\birs\b|internal\s+revenue/);
  addIf("experian", /\bexperian\b/);
  addIf("equifax", /\bequifax\b/);
  addIf("transunion", /\btransunion\b/);
  addIf("dakota", /\bdakota\b|dakota\s+financial/);
  addIf("tiktok", /\btiktok\b|\bsoundon\b/);
  addIf("ews", /early\s+warning|\bews\b/);

  return Array.from(hits);
}

// Slack Events API (application/json). Capture raw body for signature verification.
router.post(
  "/events",
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf?.toString("utf8") || "";
    },
  }),
  async (req, res) => {
    const v = verifyOrReject(req, res);
    if (!v.ok) return;

    const body = req.body || {};

    // Slack URL verification handshake
    if (body.type === "url_verification") {
      return res.status(200).send(String(body.challenge || ""));
    }

    // Ack immediately so Slack doesn't retry.
    res.status(200).end();

    // Process async
    try {
      if (body.type !== "event_callback") return;

      const event = body.event || {};
      const eventType = String(event.type || "");
      const channel = String(event.channel || "");
      const user = String(event.user || "");
      const ts = String(event.ts || event.event_ts || "");
      const text = extractTextFromSlackEvent(event);

      // ignore bot events
      if (event.bot_id) return;

      eventBus.emit("slack.event.observed", {
        type: eventType,
        channel,
        user,
        ts,
        text,
        raw: event,
      });

      if (eventType === "app_mention" || eventType === "message") {
        eventBus.emit("slack.message.observed", {
          channel,
          user,
          ts,
          text,
          kind: eventType,
          raw: event,
        });

        const creditors = extractCreditorsFromText(text);
        for (const name of creditors) {
          eventBus.emit("creditor.observed", {
            name,
            source: "slack.events",
            context: {
              channel,
              user,
              ts,
              text,
              event_type: eventType,
            },
          });
        }
      }

      if (eventType === "reaction_added") {
        eventBus.emit("slack.reaction.added", { channel, user, ts, raw: event });
      }
    } catch (err) {
      console.warn(`[UI] ⚠️ Slack events handler failed: ${err?.message || String(err)}`);
    }
  },
);

// Slack Interactivity (application/x-www-form-urlencoded with payload JSON).
router.post(
  "/interact",
  express.urlencoded({
    extended: false,
    verify: (req, _res, buf) => {
      req.rawBody = buf?.toString("utf8") || "";
    },
  }),
  async (req, res) => {
    const v = verifyOrReject(req, res);
    if (!v.ok) return;

    // Ack quickly
    res.status(200).json({ ok: true });

    try {
      const payloadRaw = String(req.body?.payload || "");
      if (!payloadRaw.trim()) return;

      let payload;
      try {
        payload = JSON.parse(payloadRaw);
      } catch {
        return;
      }

      const type = String(payload?.type || "");
      const user = String(payload?.user?.id || "");
      const channel = String(payload?.channel?.id || "");
      const messageTs = String(payload?.message?.ts || "");
      const actions = Array.isArray(payload?.actions) ? payload.actions : [];

      eventBus.emit("slack.interactive", { type, user, channel, messageTs, raw: payload });

      if (type === "block_actions") {
        for (const a of actions) {
          const actionId = String(a?.action_id || "");
          const value = String(a?.value || "");
          eventBus.emit("slack.action", { actionId, value, user, channel, messageTs, raw: payload });

          if (actionId === "case_open") {
            eventBus.emit("case.open.requested", { source: "slack", caseId: value, userId: user });
          } else if (actionId === "case_escalate") {
            eventBus.emit("case.escalate.requested", { source: "slack", caseId: value, userId: user });
          } else if (actionId === "case_task") {
            eventBus.emit("case.task.create.requested", { source: "slack", caseId: value, userId: user });
          } else if (actionId === "case_resolved") {
            eventBus.emit("case.resolved.requested", { source: "slack", caseId: value, userId: user });
          } else if (actionId === "paralegal_approve_draft") {
            eventBus.emit("paralegal.draft.approve.requested", { source: "slack", notionId: value, userId: user, channel });
          } else if (actionId === "paralegal_reject_draft") {
            eventBus.emit("paralegal.draft.reject.requested", { source: "slack", notionId: value, userId: user, channel });
          } else if (actionId === "paralegal_send_cfpb_queue") {
            eventBus.emit("paralegal.draft.sendToQueue.requested", { source: "slack", queue: "cfpb", notionId: value, userId: user, channel });
          }
        }
      }

      if (type === "view_submission") {
        eventBus.emit("slack.view.submitted", { user, channel, raw: payload });
      }
    } catch (err) {
      console.warn(`[UI] ⚠️ Slack interactivity handler failed: ${err?.message || String(err)}`);
    }
  },
);

export default router;
