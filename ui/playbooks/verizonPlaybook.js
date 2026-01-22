import { channelFor, emitPlaybookHeader, safeName } from "./playbookUtils.js";

export default {
  name: "verizon",

  matches(name = "") {
    return /verizon/i.test(String(name || ""));
  },

  activate(eventBus) {
    // When classified
    eventBus.on("creditor.classified", async (c = {}) => {
      if (!this.matches(c.name)) return;

      const channel = channelFor("verizon", "#verizon-watch");
      const creditor = safeName(c.name) || "Verizon";

      emitPlaybookHeader(eventBus, {
        channel,
        title: "🟥 Verizon Detected — Playbook Activated",
        summary: `Type: ${c.type || "unknown"}\nRisk: ${c.risk || "unknown"}`,
        voiceText: "Verizon detected. Initiating telco administrative process.",
        voicePersona: "dragon",
      });

      // Start creditor-specific chain
      eventBus.emit("enforcement.chain.start", {
        creditor,
        strategy: "telco-default",
        initialDoc: "billing_error_notice",
        channel,
        persona: "dragon",
      });
    });

    // Overdue timers
    eventBus.on("enforcement.overdue", async ({ creditor } = {}) => {
      if (!this.matches(creditor)) return;
      const channel = channelFor("verizon", "#verizon-watch");

      eventBus.emit("enforcement.event", {
        channel,
        creditor,
        status: "Overdue — statutory response window expired",
        details: "Playbook: Verizon telco-default.",
      });

      eventBus.emit("doc.generate.noticeOfFault", { creditor, channel });

      eventBus.emit("briefing.voice", {
        channel,
        character: "judge",
        subdir: "autonomous/playbooks/verizon",
        outputDir: "output/audio",
        title: "Verizon Overdue — Notice of Fault",
        initial_comment: "🎤 *Verizon Overdue (Judge)*",
        text: "Verizon has dishonored by failure to respond. Preparing Notice of Fault.",
      });
    });
  },
};
