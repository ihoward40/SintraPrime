import fs from "node:fs";
import path from "node:path";

const RUNS_DIR = path.resolve(process.cwd(), "runs");
const LOG_PATH = path.join(RUNS_DIR, "advisor-log.jsonl");

function ensureRunsDir() {
  try {
    if (!fs.existsSync(RUNS_DIR)) fs.mkdirSync(RUNS_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

function safeJsonParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export function appendAdvisorLog(entry) {
  const e = entry && typeof entry === "object" ? entry : { message: String(entry || "") };
  const row = {
    id: e.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: typeof e.ts === "number" && Number.isFinite(e.ts) ? e.ts : Date.now(),
    type: String(e.type || "note"),
    level: String(e.level || "info"),
    message: String(e.message || ""),
    data: e.data ?? null,
  };

  ensureRunsDir();

  try {
    fs.appendFileSync(LOG_PATH, `${JSON.stringify(row)}\n`, "utf8");
  } catch {
    // ignore
  }

  return row;
}

export function listAdvisorLog({ limit = 50, sinceTs = null } = {}) {
  const max = typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.floor(limit))) : 50;
  const since = typeof sinceTs === "number" && Number.isFinite(sinceTs) ? sinceTs : null;

  try {
    if (!fs.existsSync(LOG_PATH)) return [];
    const raw = fs.readFileSync(LOG_PATH, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    // Avoid worst-case memory blowups if the log grows large.
    const tail = lines.slice(Math.max(0, lines.length - 5000));

    const parsed = [];
    for (const line of tail) {
      const obj = safeJsonParse(line);
      if (!obj) continue;
      if (since != null && typeof obj.ts === "number" && obj.ts < since) continue;
      parsed.push(obj);
    }

    parsed.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return parsed.slice(0, max);
  } catch {
    return [];
  }
}

export function getAdvisorLogPath() {
  return LOG_PATH;
}
