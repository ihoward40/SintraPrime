import { eventBus } from "../core/eventBus.js";
import { SlackClient } from "../services/SlackClient.js";
import { pickChannelForEvent } from "../config/channelMap.js";
import { synthesizeAndSendToSlack } from "../services/elevenlabs-speech.js";

let slack = null;
let warnedSlackDisabled = false;

let voiceBriefingsDisabledUntilMs = 0;
let lastVoiceBriefingWarnAtMs = 0;

function nowMs() {
  return Date.now();
}

function warnVoiceBriefingsOnce(msg) {
  const now = nowMs();
  if (now - lastVoiceBriefingWarnAtMs < 5 * 60 * 1000) return;
  lastVoiceBriefingWarnAtMs = now;
  console.warn(msg);
}

function slackTokenPresent() {
  return Boolean(process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN);
}

function warnSlackDisabledOnce() {
  if (warnedSlackDisabled) return;
  warnedSlackDisabled = true;
  console.warn("[UI] ⚠️ SLACK_BOT_TOKEN not set; Slack delivery disabled.");
}

function getSlack() {
  if (slack) return slack;
  if (!slackTokenPresent()) {
    warnSlackDisabledOnce();
    return null;
  }
  slack = new SlackClient({ defaultChannel: pickChannelForEvent("default", {}) });
  return slack;
}

async function withSlack(handlerName, fn) {
  try {
    const s = getSlack();
    if (!s) return;
    await fn(s);
  } catch (err) {
    console.warn(`[UI] ⚠️ Slack handler '${handlerName}' failed: ${err?.message || String(err)}`);
  }
}

function safeJson(v) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// CASE EVENTS
eventBus.on("case.update", async (payload) => {
  await withSlack("case.update", async (s) => {
    const channel = payload?.channel || pickChannelForEvent("case.update", payload);
    await s.postCaseUpdate({
      channel,
      caseId: payload?.caseId,
      title: payload?.title,
      summary: payload?.summary,
      link: payload?.link,
      idempotencyKey: payload?.idempotency_key,
    });
  });
});

// ENFORCEMENT EVENTS
eventBus.on("enforcement.event", async (payload) => {
  await withSlack("enforcement.event", async (s) => {
    const channel = payload?.channel || pickChannelForEvent("enforcement.event", payload);
    await s.postEnforcementEvent({
      channel,
      creditor: payload?.creditor,
      status: payload?.status,
      details: payload?.details,
      link: payload?.link,
      idempotencyKey: payload?.idempotency_key,
    });
  });
});

// TIKTOK LEADS
eventBus.on("tiktok.lead", async (payload) => {
  await withSlack("tiktok.lead", async (s) => {
    const channel = payload?.channel || pickChannelForEvent("tiktok.lead", payload);
    await s.postTikTokLead({
      channel,
      username: payload?.username,
      comment: payload?.comment,
      link: payload?.link,
      autoReply: payload?.autoReply || payload?.auto_reply,
      idempotencyKey: payload?.idempotency_key,
    });
  });
});

// SYSTEM ERRORS
eventBus.on("system.error", async (payload) => {
  await withSlack("system.error", async (s) => {
    const channel = payload?.channel || pickChannelForEvent("system.error", payload);
    await s.postSystemAlert({
      channel,
      source: payload?.source,
      error: payload?.error,
      context: payload?.context ? safeJson(payload?.context) : null,
      idempotencyKey: payload?.idempotency_key,
    });
  });
});

// GOVERNOR DECISIONS
eventBus.on("governor.decision", async (payload) => {
  await withSlack("governor.decision", async (s) => {
    const channel = payload?.channel || process.env.SLACK_GOVERNOR_CHANNEL || pickChannelForEvent("default", {});
    const final = String(payload?.final || payload?.decision?.final || "unknown").toUpperCase();
    const actionId = String(payload?.actionId || payload?.decision?.actionId || "");
    const type = String(payload?.request?.type || payload?.decision?.request?.type || "unknown");
    const reason = String(payload?.reason || payload?.decision?.reason || "");
    const violations = payload?.violations || payload?.decision?.violations;
    const v = Array.isArray(violations) && violations.length ? `\nViolations: ${violations.join(", ")}` : "";
    await s.sendText(channel, `🛡️ *Governor Decision*\nAction: \`${actionId}\`\nType: *${type}*\nFinal: *${final}*\nReason: ${reason || "(n/a)"}${v}`);
  });
});

// SECURITY ALERTS
eventBus.on("security.threat.level.changed", async (payload) => {
  await withSlack("security.threat.level.changed", async (s) => {
    const lvl = String(payload?.newLevel || "normal");
    if (lvl === "normal") return;
    const channel = process.env.SLACK_SECURITY_CHANNEL || pickChannelForEvent("default", {});
    await s.sendText(
      channel,
      `🧿 *Security Threat Level*\nLevel: *${lvl.toUpperCase()}*\nScore: ${String(payload?.score ?? "?")}`,
    );
  });
});

eventBus.on("security.ip.blocked.hit", async (payload) => {
  await withSlack("security.ip.blocked.hit", async (s) => {
    const channel = process.env.SLACK_SECURITY_CHANNEL || pickChannelForEvent("default", {});
    await s.sendText(channel, `🧱 Blocked IP hit: ${String(payload?.ip)}\n${String(payload?.method || "")} ${String(payload?.path || "")}`);
  });
});

eventBus.on("security.mode.changed", async (payload) => {
  await withSlack("security.mode.changed", async (s) => {
    const channel = process.env.SLACK_SECURITY_CHANNEL || pickChannelForEvent("default", {});
    const mode = String(payload?.mode || "normal");
    const reason = String(payload?.reason || "manual");
    await s.sendText(channel, `🛡️ Security mode set: *${mode.toUpperCase()}*\nReason: ${reason}`);
  });
});

eventBus.on("security.blue-team.breaker.tripped", async (payload) => {
  await withSlack("security.blue-team.breaker.tripped", async (s) => {
    const channel = process.env.SLACK_SECURITY_CHANNEL || pickChannelForEvent("default", {});
    const breaker = String(payload?.breaker || "unknown");
    await s.sendText(channel, `⛔ *Blue-Team Breaker Tripped*
Breaker: *${breaker.toUpperCase()}*
Host: ${String(payload?.host || "?")}`);
  });
});

eventBus.on("security.blue-team.anomaly", async (payload) => {
  await withSlack("security.blue-team.anomaly", async (s) => {
    const sev = String(payload?.severity || "medium");
    if (sev !== "high" && sev !== "critical") return;
    const channel = process.env.SLACK_SECURITY_CHANNEL || pickChannelForEvent("default", {});
    const kind = String(payload?.kind || "unknown");
    await s.sendText(
      channel,
      `🛡️ *Blue-Team Anomaly*
Kind: *${kind}*
Severity: *${sev.toUpperCase()}*\nHost: ${String(payload?.host || "?")}`,
    );
  });
});

// VOICE BRIEFINGS (ElevenLabs)
eventBus.on("briefing.voice", async (payload) => {
  if (nowMs() < voiceBriefingsDisabledUntilMs) return;
  if (!slackTokenPresent()) {
    warnSlackDisabledOnce();
    return;
  }
  const channel = payload?.channel || pickChannelForEvent("briefing.voice", payload);
  try {
    await synthesizeAndSendToSlack({
      text: payload?.text,
      slackChannel: channel,
      character: payload?.character,
      eventType: payload?.eventType || payload?.event_type || payload?.event || payload?.type,
      subdir: payload?.subdir || "briefings",
      title: payload?.title || "SintraPrime Voice Briefing",
      initial_comment: payload?.initial_comment,
      outputDir: payload?.outputDir,
      thread_ts: payload?.thread_ts,
    });
  } catch (err) {
    const msg = String(err?.message || err);
    // Common misconfig cases can spam logs if voice briefings are emitted frequently.
    const isConfigLike =
      msg.includes("voice_not_found") ||
      msg.includes("No voice ID configured") ||
      msg.includes("Missing ELEVENLABS_API_KEY") ||
      msg.includes("Voice temporarily disabled");

    if (isConfigLike) {
      voiceBriefingsDisabledUntilMs = nowMs() + 30 * 60 * 1000;
      warnVoiceBriefingsOnce(
        `[UI] ⚠️ Voice briefings disabled for 30m: ${msg} (fix config/voices.json or ELEVENLABS_API_KEY to re-enable)`,
      );
      return;
    }

    console.warn(`[UI] ⚠️ Slack voice briefing failed: ${msg}`);
  }
});
