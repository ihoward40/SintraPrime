import { eventBus } from "../core/eventBus.js";

let started = false;

function safeStr(v) {
  return v == null ? "" : String(v);
}

function enabled() {
  return String(process.env.SLACK_AUTO_ENFORCE_ON_CREDITOR || "").trim() === "1";
}

function mkCaseId(creditor, ts) {
  const c = safeStr(creditor).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || "case";
  const t = safeStr(ts).trim() || Date.now().toString(36);
  return `AUTO-${c}-${t}`.slice(0, 64);
}

export function startSlackEnforcementBus() {
  if (started) return;
  started = true;

  console.log(`[SlackEnforceBus] Online (auto=${enabled() ? "ON" : "OFF"})`);

  eventBus.on("creditor.observed", (evt) => {
    if (!enabled()) return;

    const creditor = safeStr(evt?.name).trim();
    if (!creditor) return;

    const channel = evt?.context?.channel || undefined;

    eventBus.emit("enforcement.chain.start", {
      creditor,
      raw: evt?.raw || evt,
      source: evt?.source || "slack",
      strategy: "auto",
      initialDoc: "initial-notice",
      caseId: mkCaseId(creditor, evt?.context?.ts),
      channel,
      persona: "slack-auto",
    });
  });
}

// Side-effect: start on import
startSlackEnforcementBus();
