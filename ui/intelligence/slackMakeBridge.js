import { eventBus } from "../core/eventBus.js";
import { sendMakeTrigger } from "../integrations/makeClient.js";

let started = false;

export function startSlackMakeBridge() {
  if (started) return;
  started = true;

  console.log("[SlackMakeBridge] Online");

  eventBus.on("creditor.observed", async (evt) => {
    try {
      await sendMakeTrigger({
        type: "creditorMention",
        payload: evt,
      });
    } catch (err) {
      console.warn(`[SlackMakeBridge] creditorMention failed: ${err?.message || String(err)}`);
    }
  });

  eventBus.on("enforcement.case.created", async (evt) => {
    try {
      await sendMakeTrigger({
        type: "caseCreated",
        payload: evt,
      });
    } catch (err) {
      console.warn(`[SlackMakeBridge] caseCreated failed: ${err?.message || String(err)}`);
    }
  });
}

// Side-effect: start on import
startSlackMakeBridge();
