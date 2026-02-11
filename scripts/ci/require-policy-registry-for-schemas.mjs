// scripts/ci/require-policy-registry-for-schemas.mjs
// Contract: no governed action schema may exist without a matching POLICY_REGISTRY entry.
// Governed action schemas are: schemas/**/<action>.vN.json, excluding library dirs.
//
// Usage:
//   node ./scripts/ci/require-policy-registry-for-schemas.mjs

import fs from "node:fs";
import path from "node:path";

import {
  isGovernedActionSchemaPath,
  actionFromGovernedSchemaPath,
} from "./schema-policy-registry-matcher.mjs";

function walkFilesAbs(rootAbs) {
  const out = [];
  const stack = [rootAbs];

  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(cur, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".git") continue;
        stack.push(abs);
        continue;
      }
      if (e.isFile()) out.push(abs);
    }
  }

  return out;
}

function toRepoPathPosix(repoRootAbs, fileAbs) {
  const rel = path.relative(repoRootAbs, fileAbs);
  return rel.split(path.sep).join("/");
}

function loadPolicyRegistryFromSnapshot(repoRootAbs) {
  const p = path.join(repoRootAbs, "src", "policy", "policyRegistry.snapshot.json");
  if (!fs.existsSync(p)) {
    console.error("Failed loading policy registry snapshot:");
    console.error(`  Missing file: ${toRepoPathPosix(repoRootAbs, p)}`);
    console.error("Expected a JSON file containing either:");
    console.error("  - an array of entries, OR");
    console.error("  - an object with { policy_registry: [...] }");
    process.exit(2);
  }

  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    if (Array.isArray(raw)) return raw;
    const reg = raw?.policy_registry;
    if (Array.isArray(reg)) return reg;
    throw new Error("policy registry snapshot invalid: expected array or { policy_registry: array }");
  } catch (e) {
    console.error("Failed parsing policy registry snapshot:");
    console.error(`  ${toRepoPathPosix(repoRootAbs, p)}`);
    console.error(String(e));
    process.exit(2);
  }
}

function registryCoversAction(registry, action) {
  for (const e of registry) {
    if (!e || typeof e !== "object") continue;
    if (e.kind === "action" && e.action === action) return true;
    if (e.kind === "prefix" && typeof e.prefix === "string" && action.startsWith(e.prefix)) return true;
  }
  return false;
}

const repoRootAbs = process.cwd();

const schemaRootAbs = path.join(repoRootAbs, "schemas");
if (!fs.existsSync(schemaRootAbs)) {
  console.log("OK: no schemas/ directory present");
  process.exit(0);
}

const allFilesAbs = walkFilesAbs(schemaRootAbs);
const schemaRepoPaths = allFilesAbs
  .map((abs) => toRepoPathPosix(repoRootAbs, abs))
  .filter((p) => p.endsWith(".json"));

const governedSchemas = schemaRepoPaths.filter(isGovernedActionSchemaPath);
const governedActions = [...new Set(governedSchemas.map(actionFromGovernedSchemaPath))].sort();

if (governedActions.length === 0) {
  console.log("OK: no governed action schemas found under schemas/");
  process.exit(0);
}

const POLICY_REGISTRY = loadPolicyRegistryFromSnapshot(repoRootAbs);

const missing = [];
for (const action of governedActions) {
  if (!registryCoversAction(POLICY_REGISTRY, action)) {
    const files = governedSchemas.filter((p) => actionFromGovernedSchemaPath(p) === action);
    missing.push({ action, files });
  }
}

if (missing.length) {
  console.error("Missing POLICY_REGISTRY coverage:");
  for (const m of missing) {
    console.error(`- action: ${m.action}`);
    for (const f of m.files) {
      console.error(`  - ${f}`);
    }
  }
  console.error("Fix: add a matching entry in src/policy/policyRegistry.snapshot.json (kind: 'action') or a covering prefix rule (kind: 'prefix').");
  process.exit(1);
}

console.log(`OK: POLICY_REGISTRY covers ${governedActions.length} governed schema action(s)`);
process.exit(0);
