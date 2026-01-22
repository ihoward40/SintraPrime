import express from "express";
import {
  sendSlackMessage,
  uploadSlackFile,
  ensureBotInChannel,
  resolveChannelId,
  formatCaseUpdate,
  formatEnforcementEvent,
  formatTikTokLead,
  formatSystemError,
  shouldDedupe,
  makeDedupeKey,
} from "../services/slack.service.js";
import { synthesizeAndSendToSlack } from "../services/elevenlabs-speech.js";

const router = express.Router();

function s(value) {
  const out = String(value ?? "").trim();
  return out.length ? out : null;
}

router.post("/send", async (req, res) => {
  try {
    const channel = s(req.body?.channel) || s(req.body?.channel_id) || s(req.body?.channelId);
    const text = String(req.body?.text ?? "");
    const thread_ts = s(req.body?.thread_ts);

    if (!channel) return res.status(400).json({ ok: false, error: "Missing channel" });
    if (!text.trim()) return res.status(400).json({ ok: false, error: "Missing text" });

    const idempotencyKey =
      s(req.get("Idempotency-Key")) ||
      s(req.body?.idempotency_key) ||
      makeDedupeKey({ channel, text, thread_ts });

    const d = shouldDedupe(idempotencyKey);
    if (d.dedupe) return res.json({ ok: true, status: "deduped", idempotency_key: idempotencyKey });

    const result = await sendSlackMessage({ channel, text, thread_ts });
    res.json({ ok: true, status: "sent", idempotency_key: idempotencyKey, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) });
  }
});

router.post("/file", async (req, res) => {
  try {
    const channel_in = s(req.body?.channel_id) || s(req.body?.channelId) || s(req.body?.channel);
    const filePath = s(req.body?.filePath) || s(req.body?.file_path);
    const title = s(req.body?.title);
    const initial_comment = s(req.body?.initial_comment) || s(req.body?.comment);

    if (!channel_in) return res.status(400).json({ ok: false, error: "Missing channel_id (or channel name)" });
    if (!filePath) return res.status(400).json({ ok: false, error: "Missing filePath" });

    const channel_id = await resolveChannelId(channel_in);
    const result = await uploadSlackFile({ channel_id, filePath, title, initial_comment });
    res.json({ ok: true, status: "uploaded", result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) });
  }
});

router.post("/join", async (req, res) => {
  try {
    const channel = s(req.body?.channel) || s(req.body?.channel_id) || s(req.body?.channelId);
    if (!channel) return res.status(400).json({ ok: false, error: "Missing channel" });

    const result = await ensureBotInChannel({ channel });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) });
  }
});

router.post("/case-update", async (req, res) => {
  try {
    const channel = s(req.body?.channel) || s(req.body?.channel_id) || s(req.body?.channelId);
    const caseId = s(req.body?.caseId) || s(req.body?.case_id);
    if (!channel) return res.status(400).json({ ok: false, error: "Missing channel" });
    if (!caseId) return res.status(400).json({ ok: false, error: "Missing caseId" });

    const text = formatCaseUpdate({
      caseId,
      title: s(req.body?.title),
      summary: s(req.body?.summary),
      link: s(req.body?.link) || s(req.body?.url),
    });

    const idempotencyKey =
      s(req.get("Idempotency-Key")) ||
      s(req.body?.idempotency_key) ||
      makeDedupeKey({ kind: "case-update", channel, caseId, text });

    const d = shouldDedupe(idempotencyKey);
    if (d.dedupe) return res.json({ ok: true, status: "deduped", idempotency_key: idempotencyKey });

    const result = await sendSlackMessage({ channel, text });
    res.json({ ok: true, status: "sent", idempotency_key: idempotencyKey, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) });
  }
});

router.post("/enforcement", async (req, res) => {
  try {
    const channel = s(req.body?.channel) || s(req.body?.channel_id) || s(req.body?.channelId);
    if (!channel) return res.status(400).json({ ok: false, error: "Missing channel" });

    const text = formatEnforcementEvent({
      creditor: s(req.body?.creditor),
      status: s(req.body?.status),
      details: s(req.body?.details),
      link: s(req.body?.link) || s(req.body?.url),
    });

    const idempotencyKey =
      s(req.get("Idempotency-Key")) ||
      s(req.body?.idempotency_key) ||
      makeDedupeKey({ kind: "enforcement", channel, text });

    const d = shouldDedupe(idempotencyKey);
    if (d.dedupe) return res.json({ ok: true, status: "deduped", idempotency_key: idempotencyKey });

    const result = await sendSlackMessage({ channel, text });
    res.json({ ok: true, status: "sent", idempotency_key: idempotencyKey, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) });
  }
});

router.post("/tiktok-lead", async (req, res) => {
  try {
    const channel = s(req.body?.channel) || s(req.body?.channel_id) || s(req.body?.channelId);
    if (!channel) return res.status(400).json({ ok: false, error: "Missing channel" });

    const text = formatTikTokLead({
      username: s(req.body?.username),
      comment: s(req.body?.comment),
      link: s(req.body?.link) || s(req.body?.url),
      autoReply: s(req.body?.autoReply) || s(req.body?.auto_reply),
    });

    const idempotencyKey =
      s(req.get("Idempotency-Key")) ||
      s(req.body?.idempotency_key) ||
      makeDedupeKey({ kind: "tiktok-lead", channel, text });

    const d = shouldDedupe(idempotencyKey);
    if (d.dedupe) return res.json({ ok: true, status: "deduped", idempotency_key: idempotencyKey });

    const result = await sendSlackMessage({ channel, text });
    res.json({ ok: true, status: "sent", idempotency_key: idempotencyKey, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) });
  }
});

router.post("/error", async (req, res) => {
  try {
    const channel = s(req.body?.channel) || s(req.body?.channel_id) || s(req.body?.channelId);
    if (!channel) return res.status(400).json({ ok: false, error: "Missing channel" });

    const source = s(req.body?.source) || "unknown";
    const error = s(req.body?.error) || s(req.body?.message) || "(no error)";
    const context = s(req.body?.context);

    const text = formatSystemError({ source, error, context });

    const idempotencyKey =
      s(req.get("Idempotency-Key")) ||
      s(req.body?.idempotency_key) ||
      makeDedupeKey({ kind: "error", channel, source, error });

    const d = shouldDedupe(idempotencyKey);
    if (d.dedupe) return res.json({ ok: true, status: "deduped", idempotency_key: idempotencyKey });

    const result = await sendSlackMessage({ channel, text });
    res.json({ ok: true, status: "sent", idempotency_key: idempotencyKey, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) });
  }
});

router.post("/voice-briefing", async (req, res) => {
  try {
    const channel = s(req.body?.channel) || s(req.body?.channel_id) || s(req.body?.channelId);
    const text = s(req.body?.text);
    if (!channel) return res.status(400).json({ ok: false, error: "Missing channel" });
    if (!text) return res.status(400).json({ ok: false, error: "Missing text" });

    const idempotencyKey =
      s(req.get("Idempotency-Key")) ||
      s(req.body?.idempotency_key) ||
      makeDedupeKey({ kind: "voice-briefing", channel, text });

    const d = shouldDedupe(idempotencyKey);
    if (d.dedupe) return res.json({ ok: true, status: "deduped", idempotency_key: idempotencyKey });

    const out = await synthesizeAndSendToSlack({
      text,
      slackChannel: channel,
      character: s(req.body?.character) || s(req.body?.persona) || s(req.body?.voice),
      eventType: s(req.body?.eventType) || s(req.body?.event_type) || s(req.body?.event) || s(req.body?.type),
      filename: s(req.body?.filename),
      subdir: s(req.body?.subdir) || "briefings",
      title: s(req.body?.title),
      initial_comment: s(req.body?.initial_comment) || s(req.body?.comment),
    });

    res.json({ ok: true, status: "sent", idempotency_key: idempotencyKey, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) });
  }
});

export default router;
