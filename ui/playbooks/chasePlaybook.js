import { channelFor, emitPlaybookHeader, safeName } from "./playbookUtils.js";

export default {
  name: "chase",

  matches(name = "") {
    return /chase|jpmorgan|early warning|ews/i.test(String(name || ""));
  },

  activate(eventBus) {
    eventBus.on("creditor.classified", async (c = {}) => {
      if (!this.matches(c.name)) return;

      const channel = channelFor("CHASE_EWS", "#ews-chase");
      const creditor = safeName(c.name) || "Chase/EWS";

      emitPlaybookHeader(eventBus, {
        channel,
        title: "🔵 Chase/EWS Detected — Playbook Activated",
        summary: `Entity: ${creditor}\nType: ${c.type || "unknown"}\nRisk: ${c.risk || "unknown"}`,
        voiceText: "Chase or Early Warning detected. Initiating bank reporting enforcement.",
        voicePersona: "guardian",
      });

      eventBus.emit("enforcement.chain.start", {
        creditor,
        strategy: "bank-reporting-default",
        initialDoc: "validation_of_adverse_action",
        channel,
        persona: "guardian",
      });
    });

    eventBus.on("enforcement.overdue", async ({ creditor } = {}) => {
      if (!this.matches(creditor)) return;
      const channel = channelFor("CHASE_EWS", "#ews-chase");

      eventBus.emit("enforcement.event", {
        channel,
        creditor,
        status: "Overdue — failed to respond within statutory limits",
        details: "Playbook: bank-reporting-default.",
      });

      eventBus.emit("doc.generate.noticeOfFault", { creditor, channel });
    });
  },
};
