import fs from "node:fs";
import path from "node:path";
import { getIncidents } from "../security/securityIncidentLogger.js";
import { getThreatState } from "../security/threatEngine.js";
import { getSecurityProfile } from "../security/securityProfile.js";

const OUTPUT_DIR = path.resolve(process.cwd(), "data", "security-binders");

function ensureDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function safeTimestampForFile(nowMs) {
  return new Date(nowMs).toISOString().replace(/[:.]/g, "-");
}

export function generateSecurityBinder({ windowMinutes = 60 } = {}) {
  ensureDir();
  const now = Date.now();
  const minutes = Math.max(1, Math.min(24 * 60, Number(windowMinutes || 60)));
  const cutoff = now - minutes * 60_000;

  const all = getIncidents({ limit: 1000 });
  const recent = all.filter((i) => {
    const t = Date.parse(i?.ts);
    return Number.isFinite(t) && t >= cutoff;
  });

  const meta = {
    generatedAt: new Date(now).toISOString(),
    windowMinutes: minutes,
    threat: getThreatState(),
    profile: getSecurityProfile(),
    incidentCount: recent.length,
  };

  const binder = {
    meta,
    incidents: recent,
  };

  const fileName = `security-binder_${safeTimestampForFile(now)}.json`;
  const fullPath = path.join(OUTPUT_DIR, fileName);
  fs.writeFileSync(fullPath, JSON.stringify(binder, null, 2), "utf8");

  return { path: fullPath, binder };
}
