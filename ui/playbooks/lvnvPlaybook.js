import { channelFor, emitPlaybookHeader, safeName } from "./playbookUtils.js";

export default {
  name: "lvnv",

  matches(name = "") {
    return /lvnv|portfolio recovery|midland|cavalry/i.test(String(name || ""));
  },

  activate(eventBus) {
    eventBus.on("creditor.classified", async (c = {}) => {
      if (!this.matches(c.name)) return;

      const channel = channelFor("JUNK_DEBT", "#junk-debt");
      const creditor = safeName(c.name) || "LVNV";

      emitPlaybookHeader(eventBus, {
        channel,
        title: "💀 Junk Debt Buyer Detected — Playbook Activated",
        summary: `Entity: ${creditor}\nType: ${c.type || "unknown"}\nRisk: ${c.risk || "unknown"}`,
        voiceText: `Junk debt buyer detected: ${creditor}. Drafting debt validation letter.`,
        voicePersona: "scribe",
      });

      // Trigger a DV draft (more explicit than the generic classifier->doc generator listener).
      eventBus.emit("doc.generate.debtValidation", {
        creditor,
        classification: c,
        channel,
      });

      // Start chain with a tailored strategy
      eventBus.emit("enforcement.chain.start", {
        creditor,
        strategy: "junk-debt-default",
        initialDoc: "debt_validation",
        channel,
        persona: "scribe",
      });
    });

    eventBus.on("enforcement.overdue", async ({ creditor } = {}) => {
      if (!this.matches(creditor)) return;
      const channel = channelFor("JUNK_DEBT", "#junk-debt");

      eventBus.emit("enforcement.event", {
        channel,
        creditor,
        status: "Overdue — failure to validate / respond",
        details: "Playbook: junk-debt-default.",
      });

      eventBus.emit("doc.generate.noticeOfFault", { creditor, channel });
    });
  },
};
