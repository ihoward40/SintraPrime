import { eventBus } from "../core/eventBus.js";
import * as calendar from "../integrations/googleCalendar.js";

let started = false;

function safeStr(v) {
  return v == null ? "" : String(v);
}

export function startSlackCalendarBridge() {
  if (started) return;
  started = true;

  console.log("[SlackCalendarBridge] Online");

  eventBus.on("timeline.deadline.imminent", async (evt) => {
    try {
      await calendar.createEvent({
        summary: `Deadline: ${safeStr(evt?.creditor).trim() || "(unknown)"}`,
        description: safeStr(evt?.action).trim() || "",
        date: safeStr(evt?.dueDate || evt?.due || evt?.deadline).trim() || "",
      });
    } catch (err) {
      console.warn(`[SlackCalendarBridge] Calendar create failed: ${err?.message || String(err)}`);
    }
  });
}

// Side-effect: start on import
startSlackCalendarBridge();
