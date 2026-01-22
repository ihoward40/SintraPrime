import fs from "node:fs";
import path from "node:path";

const RUNS_DIR = path.resolve(process.cwd(), "runs");
const TIMELINE_PATH = path.join(RUNS_DIR, "timeline.jsonl");

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

export function appendTimelineEvent(evt) {
  const e = evt && typeof evt === "object" ? evt : { type: "note", message: String(evt || "") };

  const row = {
    id: e.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: typeof e.ts === "number" && Number.isFinite(e.ts) ? e.ts : Date.now(),
    caseId: e.caseId != null ? String(e.caseId) : null,
    creditor: e.creditor != null ? String(e.creditor) : null,
    ownerNodeId: e.ownerNodeId != null ? String(e.ownerNodeId) : null,
    type: String(e.type || "event"),
    title: e.title != null ? String(e.title) : null,
    message: e.message != null ? String(e.message) : null,
    data: e.data ?? null,
  };

  ensureRunsDir();
  try {
    fs.appendFileSync(TIMELINE_PATH, `${JSON.stringify(row)}\n`, "utf8");
  } catch {
    // ignore
  }

  return row;
}

export function listTimelineEvents({ caseId = null, limit = 100, sinceTs = null } = {}) {
  const max = typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.min(1000, Math.floor(limit))) : 100;
  const since = typeof sinceTs === "number" && Number.isFinite(sinceTs) ? sinceTs : null;
  const caseIdStr = caseId != null && String(caseId).trim() ? String(caseId).trim() : null;

  try {
    if (!fs.existsSync(TIMELINE_PATH)) return [];
    const raw = fs.readFileSync(TIMELINE_PATH, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);

    const tail = lines.slice(Math.max(0, lines.length - 10000));

    const parsed = [];
    for (const line of tail) {
      const obj = safeJsonParse(line);
      if (!obj) continue;
      if (since != null && typeof obj.ts === "number" && obj.ts < since) continue;
      if (caseIdStr && String(obj.caseId || "").trim() !== caseIdStr) continue;
      parsed.push(obj);
    }

    parsed.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return parsed.slice(0, max);
  } catch {
    return [];
  }
}

export function getTimelinePath() {
  return TIMELINE_PATH;
}
