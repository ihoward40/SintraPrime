#!/usr/bin/env node
// Ajv compile gate for Draft 2020-12 schema meta.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function repoRootFromHere() {
  // scripts/ci -> repo root
  return path.resolve(__dirname, "..", "..");
}

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const root = repoRootFromHere();
const targetDir = path.join(root, "schemas", "browser");
if (!fs.existsSync(targetDir)) {
  console.error(`FAIL: missing schemas/browser directory at ${targetDir}`);
  process.exit(1);
}

const ajv = new Ajv2020({
  strict: false,
  allErrors: true,
});

const files = walk(targetDir).filter((p) => p.endsWith(".json"));
try {
  for (const f of files) {
    const schema = readJson(f);
    ajv.compile(schema);
  }
} catch (err) {
  console.error("Ajv compile gate failed:", err?.message || err);
  process.exit(1);
}

console.log(`OK: AJV compiled ${files.length} schema JSON files (schemas/browser/**).`);
process.exit(0);
