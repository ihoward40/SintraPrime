// scripts/ci/generate-required-policy-hits-from-registry.mjs
// Contract: required policy coverage is derived from POLICY_REGISTRY + governed schemas,
// not from source scans. This prevents dead/untested registry entries.
//
// Usage:
//   node --import tsx ./scripts/ci/generate-required-policy-hits-from-registry.mjs --out .tmp/required-policy-hits.registry.json

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import {
  isGovernedActionSchemaPath,
  actionFromGovernedSchemaPath,
} from "./schema-policy-registry-matcher.mjs";

function policyIdFromSource(src) {
  const kind = src?.kind ? String(src.kind) : "?";
  const base =
    kind === "prefix"
      ? `prefix:${String(src?.prefix || "")}`
      : `action:${String(src?.action || "")}`;
  return `${base}|cap=${String(src?.capability || "")}|tier=${String(src?.tier || "")}`;
}

function appendStepSummary(lines) {
  const p = process.env.GITHUB_STEP_SUMMARY;
  if (!p) return;
  try {
    fs.appendFileSync(p, lines.join("\n") + "\n", "utf8");
  } catch {
    // Best-effort only.
  }
}

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

function resolveGitDir(repoRootAbs) {
  const dotGit = path.join(repoRootAbs, ".git");
  if (!fs.existsSync(dotGit)) return null;
  const st = fs.lstatSync(dotGit);
  if (st.isDirectory()) return dotGit;
  if (st.isFile()) {
    // Worktrees/submodules: .git is a file like: "gitdir: <path>"
    const txt = fs.readFileSync(dotGit, "utf8");
    const m = txt.match(/^gitdir:\s*(.+)\s*$/m);
    if (!m) return null;
    const gitDir = m[1].trim();
    return path.isAbsolute(gitDir) ? gitDir : path.resolve(repoRootAbs, gitDir);
  }
  return null;
}

function readGitIndexPaths(repoRootAbs) {
  const gitDir = resolveGitDir(repoRootAbs);
  if (!gitDir) return null;
  const indexPath = path.join(gitDir, "index");
  if (!fs.existsSync(indexPath)) return null;

  const buf = fs.readFileSync(indexPath);
  if (buf.length < 12) return null;
  if (buf.toString("ascii", 0, 4) !== "DIRC") return null;

  const version = buf.readUInt32BE(4);
  if (version !== 2 && version !== 3) return null;

  const entries = buf.readUInt32BE(8);
  let off = 12;
  const out = [];

  for (let i = 0; i < entries; i++) {
    const entryStart = off;
    // Fixed header is 62 bytes for v2/v3 entries.
    if (off + 62 > buf.length) return null;
    off += 62;

    // flags (2 bytes) were at the end of the fixed header.
    const flags = buf.readUInt16BE(off - 2);
    const extended = (flags & 0x4000) !== 0;
    if (extended) {
      if (off + 2 > buf.length) return null;
      off += 2;
    }

    const nul = buf.indexOf(0x00, off);
    if (nul === -1) return null;
    const p = buf.toString("utf8", off, nul);
    out.push(p);
    off = nul + 1;

    // Pad so *entry length* is a multiple of 8.
    while ((off - entryStart) % 8 !== 0) off++;
  }

  return out;
}

function toRepoPathPosix(repoRootAbs, fileAbs) {
  const rel = path.relative(repoRootAbs, fileAbs);
  return rel.split(path.sep).join("/");
}

function addSource(sources, hit, src) {
  if (!sources[hit]) sources[hit] = [];
  sources[hit].push(src);
}

function sha256Text(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
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
  const trackedIndex = readGitIndexPaths(repoRootAbs);
  const trackedSchemas = Array.isArray(trackedIndex)
    ? trackedIndex
        .map((p) => p.split(path.sep).join("/"))
        .filter((p) => p.startsWith(`${schemasRootRel.replace(/\/+$/, "")}/`))
    : null;

  const preferTracked = Array.isArray(trackedSchemas) && trackedSchemas.length > 0;
  const schemaFiles = (preferTracked
    ? trackedSchemas
    : walkFilesAbs(schemasRootAbs).map((abs) => toRepoPathPosix(repoRootAbs, abs)))
    .filter((p) => p.toLowerCase().endsWith(".json"));

  const governedSchemas = schemaFiles.filter(isGovernedActionSchemaPath);
  const actions = [...new Set(governedSchemas.map(actionFromGovernedSchemaPath))].sort();

  const requiredHits = new Set();
  const sources = {};
  const registryPolicyIds = new Set();

  for (const action of actions) {
    const entries = registryEntriesForAction(action);
    if (!Array.isArray(entries) || entries.length === 0) {
      // Schema→registry lock should prevent this, but fail-closed.
      die(`No POLICY_REGISTRY entries found for action derived from schemas: ${action}`);
    }

    for (const e of entries) {
      const src = {
        policy_id: null,
        kind: e.kind,
        action: e.kind === "action" ? e.action : undefined,
        prefix: e.kind === "prefix" ? e.prefix : undefined,
        capability: e.capability,
        tier: e.tier,
      };
      src.policy_id = policyIdFromSource(src);
      registryPolicyIds.add(String(src.policy_id));

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
    registry_policy_ids: Array.from(registryPolicyIds).sort(),
    meta: {
      required_hits_count: Array.from(requiredHits).length,
      sources_count: Array.from(registryPolicyIds).length,
      registry_policy_ids_count: Array.from(registryPolicyIds).length,
    },
  };

  const outPath = path.resolve(repoRootAbs, String(args.outPath));
  const metaPath = String(outPath).replace(/\.json$/i, ".meta.json");

  writeJson(outPath, out);
  writeJson(metaPath, {
    generated_at: out.generated_at,
    required_hits_count: out.required_hits.length,
    sources_count: registryPolicyIds.size,
    registry_policy_ids_count: registryPolicyIds.size,
    out_file: toRepoPathPosix(repoRootAbs, outPath),
    out_sha256: sha256Text(fs.readFileSync(outPath, "utf8")),
  });
  const uniquePolicyIds = new Set();
  for (const srcs of Object.values(sources)) {
    if (!Array.isArray(srcs)) continue;
    for (const s of srcs) uniquePolicyIds.add(policyIdFromSource(s));
  }

  appendStepSummary([
    "### Required policy hits (registry-derived)",
    "",
    `- required_hits_count: ${out.required_hits.length}`,
    `- sources_count: ${uniquePolicyIds.size}`,
    `- governed_actions_count: ${actions.length}`,
    `- output: ${toRepoPathPosix(repoRootAbs, outPath)}`,
    `- meta: ${toRepoPathPosix(repoRootAbs, metaPath)}`,
    "",
  ]);

  console.log(
    `OK: wrote ${out.required_hits.length} required hit(s) for ${actions.length} governed action(s) -> ${toRepoPathPosix(repoRootAbs, outPath)}`
  );
}

await main();
