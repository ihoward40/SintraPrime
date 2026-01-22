import { runPublishDueSchedulesOnce } from "./jobs/publish_due_schedules.mjs";

const intervalMs = process.env.SOCIALOS_WORKER_INTERVAL_MS
  ? Number(process.env.SOCIALOS_WORKER_INTERVAL_MS)
  : 5000;

console.log(`SocialOS worker starting (interval ${intervalMs}ms)`);

async function tick() {
  try {
    const out = await runPublishDueSchedulesOnce();
    if (out.processed) {
      console.log(`Processed ${out.processed} due schedules`);
    }
  } catch (e) {
    console.error("Worker tick failed", e);
  }
}

await tick();
setInterval(tick, intervalMs);
