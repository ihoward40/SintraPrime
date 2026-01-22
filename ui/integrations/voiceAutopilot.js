import crypto from "node:crypto";
import { eventBus } from "../core/eventBus.js";

function enabled() {
  const raw = String(process.env.SLACK_VOICE_AUTOPILOT || process.env.VOICE_AUTOPILOT || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function safeStr(v) {
  return v == null ? "" : String(v);
}

function pickChannel(evt) {
  return (
    evt?.channel ||
    evt?.slack?.channel ||
    process.env.SLACK_PARALEGAL_CHANNEL ||
    process.env.SLACK_DEFAULT_CHANNEL ||
    ""
  );
}

const RECENT = new Map();
function shouldDedupe(key, windowMs = 60_000) {
  const now = Date.now();
  const until = RECENT.get(key) || 0;
  if (now < until) return true;
  RECENT.set(key, now + windowMs);
  return false;
}

function dedupeKey(parts) {
  const raw = parts.map((p) => safeStr(p)).join("|");
  return crypto.createHash("sha1").update(raw).digest("hex");
}

function emitVoice(eventType, payload) {
  const channel = pickChannel(payload);
  const text = safeStr(payload?.voiceText || payload?.text || payload?.summary).trim();
  if (!channel || !text) return;

  const k = dedupeKey([eventType, channel, text]);
  if (shouldDedupe(k)) return;

  eventBus.emit("briefing.voice", {
    channel,
    eventType,
    title: safeStr(payload?.title) || "SintraPrime Voice Update",
    subdir: safeStr(payload?.subdir) || "autopilot",
    text,
    thread_ts: payload?.thread_ts,
  });
}

let started = false;
export function startVoiceAutopilot() {
  if (started) return;
  started = true;

  if (!enabled()) {
    return;
  }

  console.log("[VoiceAutopilot] Online (SLACK_VOICE_AUTOPILOT=1)");

  // Enforcement pipeline (dragon)
  eventBus.on("enforcement.event", (evt = {}) => {
    const creditor = safeStr(evt?.creditor).trim() || "(unknown creditor)";
    const status = safeStr(evt?.status).trim() || "update";
    emitVoice("enforcement.event", {
      ...evt,
      title: "Enforcement Update",
      voiceText: `Enforcement update for ${creditor}. Status: ${status}.`,
    });
  });

  eventBus.on("enforcement.case.created", (evt = {}) => {
    const creditor = safeStr(evt?.creditor).trim() || "(unknown creditor)";
    emitVoice("enforcement.case.created", {
      ...evt,
      title: "Enforcement Case Opened",
      voiceText: `New enforcement case opened for ${creditor}.`,
    });
  });

  // Litigation / filings (judge)
  eventBus.on("doc.generated", (evt = {}) => {
    const type = safeStr(evt?.type).trim() || "document";
    const creditor = safeStr(evt?.creditor).trim() || "(unknown creditor)";
    emitVoice("doc.generated", {
      ...evt,
      title: "Document Generated",
      voiceText: `${type} generated for ${creditor}.`,
    });
  });

  eventBus.on("filing.draft.ready", (evt = {}) => {
    const type = safeStr(evt?.type).trim() || "filing";
    const creditor = safeStr(evt?.creditor).trim() || "(unknown creditor)";
    emitVoice("filing.draft.ready", {
      ...evt,
      title: "Filing Draft Ready",
      voiceText: `${type} draft is ready for ${creditor}.`,
    });
  });

  // Prediction / intel (oracle)
  eventBus.on("behavior.predicted", (evt = {}) => {
    const creditor = safeStr(evt?.creditor).trim() || "(unknown creditor)";
    const prediction = safeStr(evt?.prediction?.summary || evt?.prediction).trim();
    if (!prediction) return;
    emitVoice("behavior.predicted", {
      ...evt,
      title: "Risk Prediction",
      voiceText: `Prediction update for ${creditor}. ${prediction}`,
    });
  });

  // Paralegal actions (shadow)
  for (const name of [
    "paralegal.draft.approve.requested",
    "paralegal.draft.reject.requested",
    "paralegal.draft.sendToQueue.requested",
  ]) {
    eventBus.on(name, (evt = {}) => {
      emitVoice(name, {
        ...evt,
        title: "Paralegal Action",
        voiceText: `Paralegal action received: ${name.replace(/^paralegal\./, "").replace(/\./g, " ")}.`,
      });
    });
  }

  // TikTok leads (oracle)
  eventBus.on("tiktok.lead", (evt = {}) => {
    const username = safeStr(evt?.username).trim() || "(unknown user)";
    emitVoice("tiktok.lead", {
      ...evt,
      title: "TikTok Lead",
      voiceText: `New TikTok lead from ${username}.`,
    });
  });
}

// Side-effect: start on import
startVoiceAutopilot();
