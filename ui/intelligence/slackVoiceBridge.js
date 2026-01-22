import { eventBus } from "../core/eventBus.js";

let started = false;

function safeStr(v) {
  return v == null ? "" : String(v);
}

export function startSlackVoiceBridge() {
  if (started) return;
  started = true;

  console.log("[SlackVoiceBridge] Online");

  eventBus.on("enforcement.case.created", (evt) => {
    const creditor = safeStr(evt?.creditor).trim() || "(unknown)";
    eventBus.emit("briefing.voice", {
      channel: evt?.slack?.channel || evt?.channel || process.env.SLACK_DEFAULT_CHANNEL,
      title: "Enforcement Case Opened",
      subdir: "briefings",
      text: `New enforcement case opened for ${creditor}. Timeline initialized.`,
    });
  });

  eventBus.on("timeline.deadline.imminent", (evt) => {
    const creditor = safeStr(evt?.creditor).trim() || "(unknown)";
    eventBus.emit("briefing.voice", {
      channel: evt?.channel || process.env.SLACK_DEFAULT_CHANNEL,
      title: "Deadline Approaching",
      subdir: "briefings",
      text: `${creditor} deadline is approaching. Action required.`,
    });
  });
}

// Side-effect: start on import
startSlackVoiceBridge();
