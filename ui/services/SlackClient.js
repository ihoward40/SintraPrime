import fs from "node:fs";
import crypto from "node:crypto";
import { WebClient } from "@slack/web-api";
import { eventBus } from "../core/eventBus.js";
import { classifySlackError, isSlackTemporarilyDisabled, noteSlackFailure, noteSlackSuccess } from "./slackHealth.js";
import { tryRefreshSlackTokenIfEnabled } from "./slackTokenRefresh.js";
import { withSlackPostRateLimit } from "./slackRateLimiter.js";

function looksLikeChannelId(input) {
  const s = String(input || "").trim();
  return /^[CGD][A-Z0-9]{6,}$/i.test(s);
}

function normalizeChannelName(input) {
  const s = String(input || "").trim();
  if (!s) return null;
  return s.startsWith("#") ? s.slice(1) : s;
}

export class SlackClient {
  constructor(options = {}) {
    const token = options.token || process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN || null;
    const offline = String(process.env.SLACK_OFFLINE || "").trim() === "1";
    if (!token) {
      if (offline) {
        this.token = null;
        this.defaultChannel = options.defaultChannel || "#all-ikesolutions";
        this.client = null;
        this._botUserId = null;
        this._dedupeWindowMs = typeof options.dedupeWindowMs === "number" ? options.dedupeWindowMs : 5 * 60 * 1000;
        this._recentKeys = new Map();
        return;
      }
      throw new Error("SLACK_BOT_TOKEN is missing in environment");
    }

    // Common misconfig: pasting an Incoming Webhook URL where a bot token should go.
    if (String(token).includes("hooks.slack.com/services/")) {
      if (offline) {
        this.token = null;
        this.defaultChannel = options.defaultChannel || "#all-ikesolutions";
        this.client = null;
        this._botUserId = null;
        this._dedupeWindowMs = typeof options.dedupeWindowMs === "number" ? options.dedupeWindowMs : 5 * 60 * 1000;
        this._recentKeys = new Map();
        return;
      }
      throw new Error(
        "SLACK_BOT_TOKEN looks like an Incoming Webhook URL. Set SLACK_ALERT_WEBHOOK=<hooks.slack.com/...> and set SLACK_BOT_TOKEN to an xoxb- token.",
      );
    }

    this.token = token;
    this.defaultChannel = options.defaultChannel || "#all-ikesolutions";
    this.client = new WebClient(this.token);

    this._botUserId = null;

    // in-memory dedupe window
    this._dedupeWindowMs = typeof options.dedupeWindowMs === "number" ? options.dedupeWindowMs : 5 * 60 * 1000;
    this._recentKeys = new Map();
  }

  async _call(op, fn, { allowRefresh = true } = {}) {
    if (String(process.env.SLACK_OFFLINE || "").trim() === "1") {
      return { ok: false, offline: true, op };
    }

    if (!this.client) {
      return { ok: false, offline: true, op };
    }

    if (isSlackTemporarilyDisabled()) {
      return { ok: false, disabled: true, op };
    }

    try {
      const out = op === "chat.postMessage" ? await withSlackPostRateLimit(fn) : await fn();
      noteSlackSuccess(op);
      return out;
    } catch (err) {
      noteSlackFailure(err, op);
      const info = classifySlackError(err);

      eventBus.emit("slack.error", { op, info, code: info.code, error: info.code || info.message });

      // Best-effort refresh support (only works if Slack issued a refresh token).
      if (allowRefresh && info.token_expired) {
        try {
          const refreshed = await tryRefreshSlackTokenIfEnabled();
          if (refreshed.ok && refreshed.access_token) {
            this.token = refreshed.access_token;
            this.client = new WebClient(this.token);
            // Update this process env so other Slack surfaces can reuse the refreshed token.
            process.env.SLACK_BOT_TOKEN = this.token;
            if (refreshed.refresh_token) process.env.SLACK_REFRESH_TOKEN = refreshed.refresh_token;
            const retryOut = await this._call(op, fn, { allowRefresh: false });
            return retryOut;
          }
        } catch {
          // fall through
        }
      }

      if (info.auth_problem) {
        // Soft-fail: keep the UI server alive even if Slack tokens are expired.
        // This prevents startup crashes from unhandled Slack promise rejections.
        return {
          ok: false,
          auth_problem: true,
          code: info.code || "unknown",
          message: `Slack auth failed (${info.code || "unknown"}). Reinstall Slack app and update SLACK_BOT_TOKEN.`,
          op,
        };
      }

      throw err;
    }
  }

  makeDedupeKey(parts) {
    const raw = JSON.stringify(parts ?? {});
    return crypto.createHash("sha256").update(raw).digest("hex");
  }

  shouldDedupe(key) {
    const k = String(key || "").trim();
    if (!k) return false;

    const now = Date.now();
    for (const [rk, ts] of this._recentKeys.entries()) {
      if (now - ts > this._dedupeWindowMs) this._recentKeys.delete(rk);
    }

    if (this._recentKeys.has(k)) return true;
    this._recentKeys.set(k, now);
    return false;
  }

  async getBotUserId() {
    if (this._botUserId) return this._botUserId;
    const res = await this._call("auth.test", () => this.client.auth.test());
    const id = res?.user_id;
    if (!id) throw new Error("Slack auth.test did not return user_id");
    this._botUserId = id;
    return id;
  }

  async resolveChannelId(channelOrName) {
    const raw = String(channelOrName || "").trim();
    if (!raw) throw new Error("Missing channel");
    if (looksLikeChannelId(raw)) return raw;

    const name = normalizeChannelName(raw);
    if (!name) throw new Error("Missing channel");

    let cursor = undefined;
    for (let i = 0; i < 20; i++) {
      const res = await this._call("conversations.list", () =>
        this.client.conversations.list({
          cursor,
          limit: 1000,
          exclude_archived: true,
          types: "public_channel,private_channel",
        }),
      );

      const chans = Array.isArray(res?.channels) ? res.channels : [];
      const hit = chans.find((c) => String(c?.name || "").toLowerCase() === name.toLowerCase());
      if (hit?.id) return hit.id;

      cursor = res?.response_metadata?.next_cursor || undefined;
      if (!cursor) break;
    }

    throw new Error(
      `Unable to resolve channel ID for '${raw}'. Provide a channel ID (C...) or grant channels:read/groups:read.`,
    );
  }

  async sendText(channel, text, thread_ts = null) {
    const raw = String(channel || this.defaultChannel).trim();
    let ch = raw.startsWith("#") ? raw.slice(1) : raw;
    const msg = String(text || "");
    if (!ch) throw new Error("Missing channel");
    if (!msg.trim()) throw new Error("Missing text");

    // Best-effort: attempt resolution to ID for channel names (with or without '#').
    if (!looksLikeChannelId(ch)) {
      try {
        ch = await this.resolveChannelId(raw);
      } catch {
        // keep 'ch' as provided
      }
    }

    return this._call("chat.postMessage", () =>
      this.client.chat.postMessage({
        channel: ch,
        text: msg,
        ...(thread_ts ? { thread_ts } : {}),
      }),
    );
  }

  async uploadFile({ channel, filePath, title, initial_comment }) {
    const channel_id = await this.resolveChannelId(channel);
    const fp = String(filePath || "").trim();
    if (!fp) throw new Error("Missing filePath");
    if (!fs.existsSync(fp)) throw new Error(`File does not exist: ${fp}`);

    return this._call("files.uploadV2", () =>
      this.client.files.uploadV2({
        channel_id,
        file: fs.createReadStream(fp),
        title: title ? String(title) : undefined,
        initial_comment: initial_comment ? String(initial_comment) : undefined,
      }),
    );
  }

  async ensureBotInChannel(channelId) {
    const ch = String(channelId || "").trim();
    if (!ch) throw new Error("Missing channelId");

    const botUserId = await this.getBotUserId();

    // membership check
    try {
      const members = await this._call("conversations.members", () => this.client.conversations.members({ channel: ch, limit: 1000 }));
      if (Array.isArray(members?.members) && members.members.includes(botUserId)) {
        return { status: "already_member", channel: ch, bot_user_id: botUserId };
      }
    } catch {
      // ignore and proceed to join attempt
    }

    // join attempt (public channels)
    try {
      const result = await this._call("conversations.join", () => this.client.conversations.join({ channel: ch }));
      return { status: "joined", channel: ch, bot_user_id: botUserId, result };
    } catch (e) {
      const code = String(e?.data?.error || e?.code || "");
      const msg = String(e?.message || e);
      return { status: "error", channel: ch, bot_user_id: botUserId, error: code || msg };
    }
  }

  formatCaseUpdate({ caseId, title, summary, link }) {
    const lines = [`📁 *Case Update* — \`${String(caseId || "").trim()}\``];
    if (title) lines.push(`*Title:* ${String(title)}`);
    if (summary) lines.push(`*Summary:* ${String(summary)}`);
    if (link) lines.push(`<${String(link)}|View Record>`);
    return lines.filter(Boolean).join("\n");
  }

  formatEnforcementEvent({ creditor, status, details, link }) {
    const lines = ["⚖️ *Enforcement Event*"];
    if (creditor) lines.push(`*Creditor:* ${String(creditor)}`);
    if (status) lines.push(`*Status:* ${String(status)}`);
    if (details) lines.push(`*Details:* ${String(details)}`);
    if (link) lines.push(`<${String(link)}|Record>`);
    return lines.filter(Boolean).join("\n");
  }

  formatTikTokLead({ username, comment, link, autoReply }) {
    const lines = ["📲 *New TikTok Lead*"];
    if (username) lines.push(`*User:* @${String(username).replace(/^@/, "")}`);
    if (comment) lines.push(`*Comment:* ${String(comment)}`);
    if (link) lines.push(`<${String(link)}|Open>`);
    if (autoReply) lines.push(`*Auto-Reply Draft:* ${String(autoReply)}`);
    return lines.filter(Boolean).join("\n");
  }

  formatSystemAlert({ source, error, context }) {
    const lines = [`🚨 *System Alert* — ${String(source || "unknown")}`];
    lines.push(`\n\`\`\`\n${String(error || "(no error)")}\n\`\`\``);
    if (context) lines.push(`*Context:* ${String(context)}`);
    return lines.join("\n");
  }

  async postCaseUpdate({ channel, caseId, title, summary, link, idempotencyKey }) {
    const ch = String(channel || this.defaultChannel).trim();
    const text = this.formatCaseUpdate({ caseId, title, summary, link });
    const key = String(idempotencyKey || "").trim() || this.makeDedupeKey({ kind: "case-update", ch, caseId, text });
    if (this.shouldDedupe(key)) return { status: "deduped", idempotency_key: key };
    const result = await this.sendText(ch, text);
    return { status: "sent", idempotency_key: key, result };
  }

  async postEnforcementEvent({ channel, creditor, status, details, link, idempotencyKey }) {
    const ch = String(channel || this.defaultChannel).trim();
    const text = this.formatEnforcementEvent({ creditor, status, details, link });
    const key = String(idempotencyKey || "").trim() || this.makeDedupeKey({ kind: "enforcement", ch, text });
    if (this.shouldDedupe(key)) return { status: "deduped", idempotency_key: key };
    const result = await this.sendText(ch, text);
    return { status: "sent", idempotency_key: key, result };
  }

  async postTikTokLead({ channel, username, comment, link, autoReply, idempotencyKey }) {
    const ch = String(channel || this.defaultChannel).trim();
    const text = this.formatTikTokLead({ username, comment, link, autoReply });
    const key = String(idempotencyKey || "").trim() || this.makeDedupeKey({ kind: "tiktok", ch, text });
    if (this.shouldDedupe(key)) return { status: "deduped", idempotency_key: key };
    const result = await this.sendText(ch, text);
    return { status: "sent", idempotency_key: key, result };
  }

  async postSystemAlert({ channel, source, error, context, idempotencyKey }) {
    const ch = String(channel || this.defaultChannel).trim();
    const text = this.formatSystemAlert({ source, error, context });
    const key = String(idempotencyKey || "").trim() || this.makeDedupeKey({ kind: "system", ch, source, error });
    if (this.shouldDedupe(key)) return { status: "deduped", idempotency_key: key };
    const result = await this.sendText(ch, text);
    return { status: "sent", idempotency_key: key, result };
  }
}
