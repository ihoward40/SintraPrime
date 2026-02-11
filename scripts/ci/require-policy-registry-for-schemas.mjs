// scripts/ci/require-policy-registry-for-schemas.mjs
// Contract: no governed action schema may exist without a matching POLICY_REGISTRY entry.
// Governed action schemas are: schemas/**/<action>.vN.json, excluding library dirs.
//
// Usage (CI):
//   node --import tsx ./scripts/ci/require-policy-registry-for-schemas.mjs

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
        // Skip common huge dirs
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

async function loadPolicyRegistry() {
  try {
    const url = new URL("../../src/policy/policyRegistry.ts", import.meta.url);
    const mod = await import(url.href);
    if (!mod?.POLICY_REGISTRY || !Array.isArray(mod.POLICY_REGISTRY)) {
      throw new Error("POLICY_REGISTRY export missing or not an array");
    }
    return mod.POLICY_REGISTRY;
  } catch (e) {
    console.error("❌ Failed importing src/policy/policyRegistry.ts.");
    console.error("Run this in CI/local as:");
    console.error("  node --import tsx ./scripts/ci/require-policy-registry-for-schemas.mjs");
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
  .filter((p) => p.toLowerCase().endsWith(".json"));

const governedSchemas = schemaRepoPaths.filter(isGovernedActionSchemaPath);
const governedActions = [...new Set(governedSchemas.map(actionFromGovernedSchemaPath))].sort();

if (governedSchemas.length === 0) {
  console.log("OK: no governed action schemas found");
  process.exit(0);
}

const POLICY_REGISTRY = await loadPolicyRegistry();

const missing = [];
for (const action of governedActions) {
  if (!registryCoversAction(POLICY_REGISTRY, action)) {
    const files = governedSchemas.filter((p) => actionFromGovernedSchemaPath(p) === action);
    missing.push({ action, files });
  }
}

if (missing.length > 0) {
  console.error("❌ Policy registry does not cover all governed action schemas.");
  console.error("");
  console.error(`Actions derived: ${governedActions.join(", ")}`);
  console.error("");
  console.error("Missing POLICY_REGISTRY coverage:");
  for (const m of missing) {
    console.error(`\nMissing action: ${m.action}`);
    console.error("Triggered by schema files:");
    for (const f of m.files) console.error(` - ${f}`);
  }
  console.error("");
  console.error("Fix: add a matching POLICY_REGISTRY entry (kind: 'action') or a covering prefix rule (kind: 'prefix') in src/policy/policyRegistry.ts.");
  process.exit(1);
}

console.log(`OK: POLICY_REGISTRY covers ${governedActions.length} governed schema action(s)`);
