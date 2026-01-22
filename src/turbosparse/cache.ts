import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function cacheKey(parts: { system: string; user: string; toolSig?: string }): string {
  const h = crypto.createHash("sha256");
  h.update(parts.system ?? "");
  h.update("\n---\n");
  h.update(parts.user ?? "");
  h.update("\n---\n");
  h.update(parts.toolSig ?? "");
  return h.digest("hex");
}

export function readCache(runDir: string, key: string): any | null {
  const p = path.join(runDir, "cache", `${key}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

export function writeCache(runDir: string, key: string, payload: any) {
  const dir = path.join(runDir, "cache");
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `${key}.json`);
  fs.writeFileSync(p, JSON.stringify(payload, null, 2));
}
