import os from "node:os";
import { eventBus } from "../core/eventBus.js";

export function startSystemVision() {
  const intervalMs = Math.max(1_000, Number(process.env.VISION_SYSTEM_INTERVAL_MS || 5_000));
  const loadAlert = Number(process.env.VISION_SYSTEM_LOAD_ALERT || 3);

  setInterval(() => {
    const memTotal = os.totalmem();
    const memFree = os.freemem();

    const state = {
      load1m: Array.isArray(os.loadavg?.()) ? os.loadavg()[0] : 0,
      memoryUsed: memTotal - memFree,
      memoryTotal: memTotal,
      uptimeSec: os.uptime(),
      timestamp: new Date().toISOString(),
    };

    eventBus.emit("vision.system.metrics", state);

    if (Number(state.load1m || 0) > loadAlert) {
      eventBus.emit("vision.alert.load", { load1m: state.load1m, timestamp: state.timestamp });
    }
  }, intervalMs);
}
