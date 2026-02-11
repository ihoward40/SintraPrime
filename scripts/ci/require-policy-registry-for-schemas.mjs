// scripts/ci/require-policy-registry-for-schemas.mjs
import fs from "node:fs";
import path from "node:path";
import { repoRootFromHere, exists, readJson } from "./schema-policy-registry-matcher.mjs";

const root = repoRootFromHere();

const SCHEMAS_DIR = path.join(root, "schemas");
const SNAPSHOT_PATH = path.join(root, "src", "policy", "policyRegistry.snapshot.json");

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function actionNameFromSchemaPath(absPath) {
  const rel = absPath.slice(root.length + 1).replaceAll("\\\\", "/");
  const m = rel.match(/^schemas\/[^/]+\/(.+)\.json$/);
  return m ? m[1] : null;
}

function covers(registry, action) {
  const actions = registry.actions || [];
  const prefixes = registry.prefixes || [];

  if (actions.some((a) => a === action || a?.id === action)) return true;
  if (prefixes.some((p) => (typeof p === "string" ? action.startsWith(p) : action.startsWith(p?.prefix)))) return true;

  return false;
}

if (!exists(SCHEMAS_DIR)) {
  console.log("OK: no schemas/ directory present");
  process.exit(0);
}

if (!exists(SNAPSHOT_PATH)) {
  console.error(`FAIL: Missing policy registry snapshot: ${SNAPSHOT_PATH}`);
  process.exit(1);
}

const registry = readJson(SNAPSHOT_PATH);

const schemaFiles = walk(SCHEMAS_DIR)
  .filter((p) => p.endsWith(".json"))
  .filter((p) => /\.v\d+\.json$/i.test(path.basename(p)));

const missing = [];
for (const f of schemaFiles) {
  const action = actionNameFromSchemaPath(f);
  if (!action) continue;
  if (action.startsWith("_defs/") || action.includes("/_defs/")) continue;

  if (!covers(registry, action)) missing.push({ action, file: f.slice(root.length + 1) });
}

if (missing.length) {
  console.error("Missing POLICY_REGISTRY coverage:");
  for (const m of missing) console.error(`- ${m.action}\n  - ${m.file}`);
  process.exit(1);
}

console.log(`OK: POLICY_REGISTRY covers ${schemaFiles.length} schema file(s) via snapshot.`);
process.exit(0);
