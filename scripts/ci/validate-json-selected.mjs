#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function listJsonFiles(dirPath) {
  const out = [];
  if (!fs.existsSync(dirPath)) return out;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dirPath, ent.name);
    if (ent.isDirectory()) {
      out.push(...listJsonFiles(full));
      continue;
    }
    if (!ent.isFile()) continue;

    const name = ent.name.toLowerCase();
    if (!name.endsWith(".json")) continue;
    if (name.endsWith(".json.sha256")) continue;

    out.push(full);
  }
  return out;
}

const root = process.cwd();

// Keep this list intentionally small + high-signal.
const roots = [
  path.join(root, "schemas"),
  path.join(root, "config"),
  path.join(root, "automations"),
  path.join(root, "agents"),
  path.join(root, "notion", "schemas"),
];

const files = roots.flatMap(listJsonFiles).sort((a, b) => a.localeCompare(b));

let ok = true;
for (const filePath of files) {
  const rel = path.relative(root, filePath).replace(/\\/g, "/");
  try {
    const text = fs.readFileSync(filePath, "utf8");
    // Some schema stubs are intentionally empty; treat them as skipped.
    if (text.trim() === "") continue;
    JSON.parse(text);
  } catch (err) {
    const msg = err && typeof err === "object" && "message" in err ? String(err.message) : String(err);
    console.error(`[validate-json] ${rel} parse error: ${msg}`);
    ok = false;
  }
}

if (!ok) process.exit(1);
