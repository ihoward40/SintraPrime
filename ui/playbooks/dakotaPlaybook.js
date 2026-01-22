import { channelFor, emitPlaybookHeader, safeName } from "./playbookUtils.js";

export default {
  name: "dakota",

  matches(name = "") {
    return /dakota financial/i.test(String(name || ""));
  },

  activate(eventBus) {
    eventBus.on("creditor.classified", async (c = {}) => {
      if (!this.matches(c.name)) return;

      const channel = channelFor("DAKOTA", "#dakota-financial");
      const creditor = safeName(c.name) || "Dakota Financial";

      emitPlaybookHeader(eventBus, {
        channel,
        title: "🟩 Dakota Financial Detected — Playbook Activated",
        summary: "Enforcement case active.",
        voiceText: "Dakota Financial detected. Running secured party enforcement logic.",
        voicePersona: "scribe",
      });

      eventBus.emit("enforcement.chain.start", {
        creditor,
        strategy: "secured-party-default",
        initialDoc: "affidavit_material_facts",
        channel,
        persona: "scribe",
      });
    });

    eventBus.on("enforcement.overdue", async ({ creditor } = {}) => {
      if (!this.matches(creditor)) return;
      const channel = channelFor("DAKOTA", "#dakota-financial");

      eventBus.emit("enforcement.event", {
        channel,
        creditor,
        status: "Overdue — no rebuttal received",
        details: "Playbook: secured-party-default.",
      });

      eventBus.emit("doc.generate.noticeOfFault", { creditor, channel });
    });
  },
};
