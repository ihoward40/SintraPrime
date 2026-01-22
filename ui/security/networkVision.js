import { eventBus } from "../core/eventBus.js";

// Minute-bucket counters to detect spikes without keeping a huge request list.
const buckets = new Map(); // key = `${minute}:${ip}` -> count

function minuteKey(ts) {
  return Math.floor(ts / 60_000);
}

export function networkVision(req, _res, next) {
  const ip = String(req.ip || "unknown");
  const mk = minuteKey(Date.now());
  const key = `${mk}:${ip}`;
  buckets.set(key, (buckets.get(key) || 0) + 1);
  next();
}

export function startNetworkVisionAnomalyDetector() {
  const threshold = Math.max(20, Number(process.env.VISION_NETWORK_SPIKE_THRESHOLD || 120));

  setInterval(() => {
    const mk = minuteKey(Date.now());
    const prev = mk - 1;

    // Clean old buckets (keep last 3 minutes)
    for (const k of buckets.keys()) {
      const minute = Number(String(k).split(":")[0]);
      if (minute < mk - 3) buckets.delete(k);
    }

    // Check current minute only
    for (const [k, count] of buckets.entries()) {
      const [minute, ip] = String(k).split(":");
      const m = Number(minute);
      if (m !== mk) continue;
      if (Number(count) >= threshold) {
        const lastKey = `${prev}:${ip}`;
        const lastCount = Number(buckets.get(lastKey) || 0);
        eventBus.emit("vision.network.traffic-spike", {
          ip,
          count,
          lastMinuteCount: lastCount,
          threshold,
          occurredAt: new Date().toISOString(),
        });
      }
    }
  }, 5_000);
}
