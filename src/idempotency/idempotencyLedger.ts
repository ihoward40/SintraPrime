import fs from "node:fs";
import path from "node:path";

const DIR = "runs/idempotency";

function safeFilePart(input: string): string {
  const s = String(input ?? "");
  const cleaned = s.replace(/[\\/<>:\"|?*\x00-\x1F]/g, "_");
  return cleaned.slice(0, 200);
}

export function getIdempotencyRecord(key: string) {
  const safeKey = String(key ?? "").trim();
  if (!safeKey) return null;

  const file = path.join(DIR, `${safeFilePart(safeKey)}.json`);
  if (!fs.existsSync(file)) return null;

  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeIdempotencyRecord(key: string, record: any) {
  const safeKey = String(key ?? "").trim();
  if (!safeKey) throw new Error("idempotency key required");

  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `${safeFilePart(safeKey)}.json`);
  fs.writeFileSync(file, JSON.stringify(record, null, 2));
  return file;
}
