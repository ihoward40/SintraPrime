// scripts/ci/generate-required-policy-hits-from-registry.mjs
// Contract: required policy coverage is derived from POLICY_REGISTRY + governed schemas,
// not from source scans. This prevents dead/untested registry entries.
//
// Usage:
//   node --import tsx ./scripts/ci/generate-required-policy-hits-from-registry.mjs --out .tmp/required-policy-hits.registry.json

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import {
  isGovernedActionSchemaPath,
  actionFromGovernedSchemaPath,
} from "./schema-policy-registry-matcher.mjs";

function die(msg, code = 2) {
  console.error(msg);
  process.exit(code);
}

function parseArgs(argv) {
  const out = { outPath: null, schemasRoot: "schemas" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") out.outPath = argv[i + 1] || out.outPath;
    if (a === "--schemas-root") out.schemasRoot = argv[i + 1] || out.schemasRoot;
    if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

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

function tryGitTrackedFiles(repoRootAbs, schemasRootRel) {
  try {
    const out = execSync(`git ls-files -z -- ${schemasRootRel}`, {
      cwd: repoRootAbs,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString("utf8")
      .split("\u0000")
      .map((s) => s.trim())
      .filter(Boolean);
    if (out.length === 0) return null;
    return out;
  } catch {
    return null;
  }
}

function toRepoPathPosix(repoRootAbs, fileAbs) {
  const rel = path.relative(repoRootAbs, fileAbs);
  return rel.split(path.sep).join("/");
}

function addSource(sources, hit, src) {
  if (!sources[hit]) sources[hit] = [];
  sources[hit].push(src);
}

async function loadPolicyRegistryApi() {
  try {
    const url = new URL("../../src/policy/policyRegistry.ts", import.meta.url);
    const mod = await import(url.href);
    if (typeof mod.registryEntriesForAction !== "function") {
      throw new Error("registryEntriesForAction export missing");
    }
    return {
      registryEntriesForAction: mod.registryEntriesForAction,
    };
  } catch (e) {
    console.error("❌ Failed importing src/policy/policyRegistry.ts.");
    console.error("Run this as:");
    console.error("  node --import tsx ./scripts/ci/generate-required-policy-hits-from-registry.mjs --out <file>");
    console.error(String(e));
    process.exit(2);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      "Usage: node --import tsx ./scripts/ci/generate-required-policy-hits-from-registry.mjs --out <file> [--schemas-root <dir>]"
    );
    process.exit(0);
  }

  if (!args.outPath || String(args.outPath).startsWith("--")) {
    die("--out <file> is required");
  }

  const repoRootAbs = process.cwd();
  const schemasRootAbs = path.resolve(repoRootAbs, String(args.schemasRoot || "schemas"));
  if (!fs.existsSync(schemasRootAbs)) {
    die(`schemas root not found: ${schemasRootAbs}`);
  }

  const { registryEntriesForAction } = await loadPolicyRegistryApi();

  const schemasRootRel = toRepoPathPosix(repoRootAbs, schemasRootAbs);
  const tracked = tryGitTrackedFiles(repoRootAbs, schemasRootRel);
  const schemaFiles = (tracked ?? walkFilesAbs(schemasRootAbs).map((abs) => toRepoPathPosix(repoRootAbs, abs)))
    .filter((p) => p.toLowerCase().endsWith(".json"));

  const governedSchemas = schemaFiles.filter(isGovernedActionSchemaPath);
  const actions = [...new Set(governedSchemas.map(actionFromGovernedSchemaPath))].sort();

  const requiredHits = new Set();
  const sources = {};

  for (const action of actions) {
    const entries = registryEntriesForAction(action);
    if (!Array.isArray(entries) || entries.length === 0) {
      // Schema→registry lock should prevent this, but fail-closed.
      die(`No POLICY_REGISTRY entries found for action derived from schemas: ${action}`);
    }

    for (const e of entries) {
      const src = {
        kind: e.kind,
        action: e.kind === "action" ? e.action : undefined,
        prefix: e.kind === "prefix" ? e.prefix : undefined,
        capability: e.capability,
        tier: e.tier,
      };

      if (e.allow === true) {
        const hit = `${action}\tALLOW\tALLOW`;
        requiredHits.add(hit);
        addSource(sources, hit, src);
      }

      for (const code of Array.isArray(e.denyCodes) ? e.denyCodes : []) {
        const hit = `${action}\tDENY\t${String(code)}`;
        requiredHits.add(hit);
        addSource(sources, hit, src);
      }

      for (const code of Array.isArray(e.approvalCodes) ? e.approvalCodes : []) {
        const hit = `${action}\tAPPROVAL_REQUIRED\t${String(code)}`;
        requiredHits.add(hit);
        addSource(sources, hit, src);
      }
    }
  }

  const out = {
    kind: "RequiredPolicyHitsFromRegistry",
    generated_at: new Date().toISOString(),
    governed_actions: actions,
    required_hits: Array.from(requiredHits).sort(),
    sources,
  };

  const outPath = path.resolve(repoRootAbs, String(args.outPath));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(`OK: wrote ${out.required_hits.length} required hit(s) for ${actions.length} governed action(s) -> ${toRepoPathPosix(repoRootAbs, outPath)}`);
}

await main();
