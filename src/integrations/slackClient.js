// src/integrations/slackClient.js
// Compatibility helper for patches that expect a safeCall() wrapper
// emitting Slack failures onto the shared event bus.

import { sharedEventBus as bus } from "../core/eventBus.js";

export async function safeCall(cb) {
  try {
    return await cb();
  } catch (err) {
    console.log("[Slack] API error:", err?.data?.error || err?.message || String(err));
    bus.emit("slack.error", err);
    return null;
  }
}
