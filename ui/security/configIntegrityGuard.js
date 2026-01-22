import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { eventBus } from "../core/eventBus.js";

function hashFile(absPath) {
  try {
    const buf = fs.readFileSync(absPath);
    return crypto.createHash("sha256").update(buf).digest("hex");
  } catch {
    return null;
  }
}

function parseWatchFiles() {
  const defaults = [
    "control/config.yaml",
    "ui/server.js",
    "package.json",
    "tsconfig.json",
  ];

  const raw = String(process.env.SECURITY_WATCH_FILES || "").trim();
  const rels = raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : defaults;

  return rels.map((p) => path.resolve(process.cwd(), p));
}

let baseline = new Map();

export function startConfigIntegrityGuard() {
  const enabled = String(process.env.SECURITY_CONFIG_GUARD || "1").trim() === "1";
  if (!enabled) return;

  const files = parseWatchFiles();
  const intervalMs = Math.max(5_000, Number(process.env.SECURITY_CONFIG_GUARD_INTERVAL_MS || 60_000));

  baseline = new Map(files.map((p) => [p, hashFile(p)]));

  setInterval(() => {
    for (const abs of files) {
      const oldHash = baseline.get(abs);
      const newHash = hashFile(abs);
      if (!oldHash && !newHash) continue;
      if (oldHash !== newHash) {
        const ev = {
          path: abs,
          oldHash,
          newHash,
          ts: new Date().toISOString(),
        };
        eventBus.emit("security.config.drift", ev);
        baseline.set(abs, newHash);
      }
    }
  }, intervalMs);
}
