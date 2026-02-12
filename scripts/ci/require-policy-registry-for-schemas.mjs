#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isCoveredBySnapshot } from "./schema-policy-registry-matcher.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function repoRootFromHere() {
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
const schemasRoot = path.join(root, "schemas", "browser"); // scoped
const snapshotPath = path.join(root, "src", "policy", "policyRegistry.snapshot.json");

if (!fs.existsSync(schemasRoot)) {
  console.error(`Policy registry gate failed: missing ${schemasRoot}`);
  process.exit(1);
}
if (!fs.existsSync(snapshotPath)) {
  console.error(`Policy registry gate failed: missing snapshot at ${snapshotPath}`);
  process.exit(1);
}

const snapshot = readJson(snapshotPath); // expects { actions:[], prefixes:[] }

const schemaFiles = walk(schemasRoot)
  .filter((p) => p.endsWith(".json"))
  .map((p) => path.relative(root, p).replaceAll("\\", "/"));

const missing = [];
for (const rel of schemaFiles) {
  if (!isCoveredBySnapshot(rel, snapshot)) missing.push(rel);
}

if (missing.length) {
  console.error("Policy registry gate failed: Schema coverage missing:");
  for (const m of missing) console.error(`- ${m}`);
  process.exit(1);
}

console.log(`OK: POLICY_REGISTRY covers ${schemaFiles.length} schema file(s) (schemas/browser/**).`);
process.exit(0);
