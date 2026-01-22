import fs from "node:fs";
import crypto from "node:crypto";
import { WebClient } from "@slack/web-api";
import { eventBus } from "../core/eventBus.js";
import { withSlackPostRateLimit } from "./slackRateLimiter.js";
import {
  classifySlackError,
  getSlackHealth,
  isSlackTemporarilyDisabled,
  noteSlackFailure,
  noteSlackSuccess,
  setSlackTokenPresent,
} from "./slackHealth.js";
import { tryRefreshSlackTokenIfEnabled } from "./slackTokenRefresh.js";

function slackOffline() {
  return String(process.env.SLACK_OFFLINE || "").trim() === "1";
}

function requireSlackToken() {
  const token = process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN || null;
  if (!token) {
    if (slackOffline()) return null;
    throw new Error("Missing SLACK_BOT_TOKEN");
  }

  // Common misconfig: pasting an Incoming Webhook URL where a bot token should go.
  if (String(token).includes("hooks.slack.com/services/")) {
    if (slackOffline()) return null;
    throw new Error(
      "SLACK_BOT_TOKEN looks like an Incoming Webhook URL. Set SLACK_ALERT_WEBHOOK=<hooks.slack.com/...> and set SLACK_BOT_TOKEN to an xoxb- token.",
    );
  }
  return token;
}

let cachedClient = null;
function slack() {
  if (cachedClient) return cachedClient;
  if (slackOffline()) return null;
  if (isSlackTemporarilyDisabled()) {
    return null;
  }
  const token = requireSlackToken();
  if (!token) return null;
  cachedClient = new WebClient(token);
  return cachedClient;
}

export function resetSlackServiceClient() {
  cachedClient = null;
  cachedBotUserId = null;
}

let cachedBotUserId = null;
export async function getBotUserId() {
  if (cachedBotUserId) return cachedBotUserId;
  setSlackTokenPresent(true);

  const client = slack();
  if (!client) return null;

  try {
    const res = await client.auth.test();
    const id = res?.user_id;
    if (!id) throw new Error("Slack auth.test did not return user_id");
    cachedBotUserId = id;
    noteSlackSuccess("auth.test");
    return id;
  } catch (err) {
    noteSlackFailure(err, "auth.test");
    const info = classifySlackError(err);
    eventBus.emit("slack.error", { op: "auth.test", info, code: info.code, error: info.code || info.message });
    if (info.auth_problem) {
      return null;
    }
    throw err;
  }
}

export async function authTestNow() {
  setSlackTokenPresent(Boolean(process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN));
  const client = slack();
  if (!client) {
    return { ok: false, offline: slackOffline(), disabled: isSlackTemporarilyDisabled(), error: "offline_or_disabled" };
  }

  try {
    const res = await client.auth.test();
    noteSlackSuccess("auth.test");
    return { ok: true, result: res };
  } catch (err) {
    noteSlackFailure(err, "auth.test");
    const info = classifySlackError(err);
    eventBus.emit("slack.error", { op: "auth.test", info, code: info.code, error: info.code || info.message });
    return { ok: false, error: info.code || "unknown", message: info.message };
  }
}

export async function maybeRefreshSlackToken({ reason } = {}) {
  try {
    const refreshed = await tryRefreshSlackTokenIfEnabled();
    if (!refreshed?.ok || !refreshed.access_token) {
      return { ok: false, reason: refreshed?.reason || "refresh_failed", error: refreshed?.slack_error || null };
    }

    // Update current process env so all subsequent WebClient creations use the latest token.
    process.env.SLACK_BOT_TOKEN = refreshed.access_token;
    if (refreshed.refresh_token) process.env.SLACK_REFRESH_TOKEN = refreshed.refresh_token;

    resetSlackServiceClient();
    noteSlackSuccess("oauth.refresh");

    eventBus.emit("slack.token.refreshed", {
      at: new Date().toISOString(),
      reason: String(reason || "unknown"),
    });

    return { ok: true, access_token: refreshed.access_token, refresh_token: refreshed.refresh_token || null };
  } catch (e) {
    return { ok: false, reason: "exception", error: String(e?.message || e) };
  }
}

export async function sendSlackMessage({ channel, text, blocks, thread_ts }) {
  const raw = String(channel || "").trim();
  let ch = raw.startsWith("#") ? raw.slice(1) : raw;
  const msg = String(text || "");
  if (!ch) throw new Error("Missing channel");
  if (!msg.trim() && !blocks) throw new Error("Missing text (or blocks)");

  setSlackTokenPresent(true);
  const client = slack();
  if (!client) {
    return { ok: false, offline: slackOffline(), disabled: isSlackTemporarilyDisabled(), skipped: true };
  }

  // Best-effort: if caller gave a channel name (with or without '#'), try to resolve to an ID (requires channels:read).
  if (!looksLikeChannelId(ch)) {
    try {
      ch = await resolveChannelId(raw);
    } catch {
      // fall back to original value
    }
  }

  try {
    const result = await withSlackPostRateLimit(() =>
      client.chat.postMessage({
        channel: ch,
        text: msg,
        blocks,
        thread_ts,
      }),
    );
    noteSlackSuccess("chat.postMessage");
    return result;
  } catch (err) {
    noteSlackFailure(err, "chat.postMessage");
    const info = classifySlackError(err);
    eventBus.emit("slack.error", { op: "chat.postMessage", info, code: info.code, error: info.code || info.message });
    if (info.auth_problem) {
      return { ok: false, auth_problem: true, code: info.code || "unknown", skipped: true };
    }
    throw err;
  }
}

function normalizeChannelName(input) {
  const s = String(input || "").trim();
  if (!s) return null;
  return s.startsWith("#") ? s.slice(1) : s;
}

function looksLikeChannelId(input) {
  const s = String(input || "").trim();
  return /^[CGD][A-Z0-9]{6,}$/i.test(s);
}

/**
 * Resolve a channel ID from either:
 * - channel ID (C/G/D...)
 * - channel name (#name or name)
 */
export async function resolveChannelId(channelOrName) {
  const raw = String(channelOrName || "").trim();
  if (!raw) throw new Error("Missing channel");
  if (looksLikeChannelId(raw)) return raw;

  const name = normalizeChannelName(raw);
  if (!name) throw new Error("Missing channel");

  const client = slack();
  if (!client) throw new Error("Slack is offline/disabled; cannot resolve channel name to ID.");

  let cursor = undefined;
  for (let i = 0; i < 20; i++) {
    let res;
    try {
      res = await client.conversations.list({
        cursor,
        limit: 1000,
        exclude_archived: true,
        types: "public_channel,private_channel",
      });
      noteSlackSuccess("conversations.list");
    } catch (err) {
      noteSlackFailure(err, "conversations.list");
      throw err;
    }

    const chans = Array.isArray(res?.channels) ? res.channels : [];
    const hit = chans.find((c) => String(c?.name || "").toLowerCase() === name.toLowerCase());
    if (hit?.id) return hit.id;

    cursor = res?.response_metadata?.next_cursor || undefined;
    if (!cursor) break;
  }

  throw new Error(
    `Unable to resolve channel ID for '${raw}'. Provide a channel ID (C...) or grant channels:read so SintraPrime can resolve names.`,
  );
}

export async function uploadSlackFile({ channel_id, filePath, title, initial_comment, thread_ts }) {
  const cid = String(channel_id || "").trim();
  if (!cid) throw new Error("Missing channel_id");

  const fp = String(filePath || "").trim();
  if (!fp) throw new Error("Missing filePath");
  if (!fs.existsSync(fp)) throw new Error(`File does not exist: ${fp}`);

  const file = fs.createReadStream(fp);

  setSlackTokenPresent(true);
  try {
    const result = await slack().files.uploadV2({
      channel_id: cid,
      file,
      title: title ? String(title) : undefined,
      initial_comment: initial_comment ? String(initial_comment) : undefined,
      ...(thread_ts ? { thread_ts: String(thread_ts) } : {}),
    });
    noteSlackSuccess("files.uploadV2");
    return result;
  } catch (err) {
    noteSlackFailure(err, "files.uploadV2");
    const info = classifySlackError(err);
    if (info.auth_problem) {
      throw new Error(`Slack upload failed (${info.code || "unknown"}). Reinstall Slack app and update SLACK_BOT_TOKEN.`);
    }
    throw err;
  }
}

export function getSlackStatus() {
  setSlackTokenPresent(Boolean(process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN));
  return getSlackHealth();
}

export function formatCaseUpdate({ caseId, title, summary, link }) {
  const lines = [`*Case Update* — \`${String(caseId || "").trim()}\``];
  if (title) lines.push(`*Title:* ${String(title)}`);
  if (summary) lines.push(`*Summary:* ${String(summary)}`);
  if (link) lines.push(`<${String(link)}|Open record>`);
  return lines.join("\n");
}

export function formatEnforcementEvent({ creditor, status, details, link }) {
  const lines = ["⚖️ *Enforcement Event*"];
  if (creditor) lines.push(`*Creditor:* ${String(creditor)}`);
  if (status) lines.push(`*Status:* ${String(status)}`);
  if (details) lines.push(`*Details:* ${String(details)}`);
  if (link) lines.push(`<${String(link)}|Open full record>`);
  return lines.join("\n");
}

export function formatTikTokLead({ username, comment, link, autoReply }) {
  const lines = ["📲 *New TikTok Lead*"];
  if (username) lines.push(`*User:* @${String(username).replace(/^@/, "")}`);
  if (comment) lines.push(`*Comment:* ${String(comment)}`);
  if (link) lines.push(`<${String(link)}|View on TikTok>`);
  if (autoReply) lines.push(`*Auto-Reply Draft:* ${String(autoReply)}`);
  return lines.join("\n");
}

export function formatSystemError({ source, error, context }) {
  const lines = [`🚨 *System Error* — ${String(source || "unknown")}`];
  lines.push(`\n\`\`\`\n${String(error || "(no error)")}\n\`\`\``);
  if (context) lines.push(`*Context:* ${String(context)}`);
  return lines.join("\n");
}

async function listAllMembers(channel) {
  const members = [];
  let cursor = undefined;

  for (let i = 0; i < 20; i++) {
    const res = await slack().conversations.members({ channel, cursor, limit: 1000 });
    if (Array.isArray(res?.members)) members.push(...res.members);
    cursor = res?.response_metadata?.next_cursor || undefined;
    if (!cursor) break;
  }

  return members;
}

export async function ensureBotInChannel({ channel }) {
  const ch = String(channel || "").trim();
  if (!ch) throw new Error("Missing channel");

  const botUserId = await getBotUserId();

  // If already a member, do nothing.
  try {
    const members = await listAllMembers(ch);
    if (members.includes(botUserId)) {
      return { status: "already_in_channel", channel: ch, bot_user_id: botUserId };
    }
  } catch (e) {
    // membership listing may fail for some channel types or perms; proceed to join attempt
  }

  // Public channels: bot can join itself.
  try {
    const joined = await slack().conversations.join({ channel: ch });
    return { status: "joined", channel: ch, bot_user_id: botUserId, result: joined };
  } catch (e) {
    const code = String(e?.data?.error || e?.code || "");
    const msg = String(e?.message || e);

    // Private channels require an admin/user invite; bots generally cannot self-join.
    if (
      code === "method_not_supported_for_channel_type" ||
      code === "channel_not_found" ||
      code === "not_in_channel" ||
      code === "missing_scope" ||
      code === "restricted_action"
    ) {
      return {
        status: "needs_invite",
        channel: ch,
        bot_user_id: botUserId,
        error: code || msg,
        hint: "If this is a private channel, invite the bot once from Slack, then this endpoint becomes idempotent.",
      };
    }

    return { status: "error", channel: ch, bot_user_id: botUserId, error: code || msg };
  }
}

// Optional light idempotency helper for routers calling /api/slack/send repeatedly.
const dedupeWindowMs = 5 * 60 * 1000;
const recentKeys = new Map();

export function shouldDedupe(key) {
  const k = String(key || "").trim();
  if (!k) return { dedupe: false };

  const now = Date.now();
  for (const [rk, ts] of recentKeys.entries()) {
    if (now - ts > dedupeWindowMs) recentKeys.delete(rk);
  }

  if (recentKeys.has(k)) return { dedupe: true };
  recentKeys.set(k, now);
  return { dedupe: false };
}

export function makeDedupeKey(parts) {
  const raw = JSON.stringify(parts ?? {});
  return crypto.createHash("sha256").update(raw).digest("hex");
}
