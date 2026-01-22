import fs from "node:fs";
import path from "node:path";

export function ensureDir(absDir) {
  fs.mkdirSync(absDir, { recursive: true });
}

export function appendJsonl(absFile, obj) {
  ensureDir(path.dirname(absFile));
  fs.appendFileSync(absFile, JSON.stringify(obj) + "\n", "utf8");
}

export function readJsonl(absFile, { limit = 200, newestFirst = true } = {}) {
  if (!fs.existsSync(absFile)) return [];
  const raw = fs.readFileSync(absFile, "utf8").trim();
  if (!raw) return [];
  const lines = raw.split("\n").filter(Boolean);
  const slice = newestFirst ? lines.slice(-limit).reverse() : lines.slice(0, limit);
  const out = [];
  for (const line of slice) {
    try {
      out.push(JSON.parse(line));
    } catch {
      // ignore malformed lines
    }
  }
  return out;
}

export function safeReadJson(absFile, fallback = null) {
  try {
    if (!fs.existsSync(absFile)) return fallback;
    return JSON.parse(fs.readFileSync(absFile, "utf8"));
  } catch {
    return fallback;
  }
}

export function safeWriteJson(absFile, value) {
  ensureDir(path.dirname(absFile));
  fs.writeFileSync(absFile, JSON.stringify(value, null, 2) + "\n", "utf8");
}
