import fs from "node:fs";
import process from "node:process";
import {
  extractChangedFilesFromPrFilesJson,
  partitionByPrefixes,
} from "./wiring-scope-core.mjs";

// Fail-closed, path-only input contract:
// - PR_FILES_JSON_PATH is required.
// - PR_FILES_JSON is intentionally ignored (do not add env-json fallbacks).
const PR_FILES_JSON_PATH = process.env.PR_FILES_JSON_PATH?.trim();
if (!PR_FILES_JSON_PATH) throw new Error("Missing PR_FILES_JSON_PATH");
// Guard against “helpful” reintroduction of env-based JSON inputs.
// This script must remain offline + deterministic.
if ("PR_FILES_JSON" in process.env) delete process.env.PR_FILES_JSON;

function readJson() {
  return JSON.parse(fs.readFileSync(PR_FILES_JSON_PATH, "utf8"));
}

function readPrefixes(envName) {
  const v = (process.env[envName] || "").trim();
  if (!v) return [];
  return v
    .split(/\r?\n/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

// New behavior (matches workflow):
// - Parse PR files JSON -> changed file list (deterministic)
// - Partition changed files into runtime-adjacent vs other
// - If runtime-adjacent files exist, require docs/governance/wiring-scope.md to exist
const runtimePrefixes = readPrefixes("RUNTIME_ADJACENT_PREFIXES");
if (runtimePrefixes.length === 0) {
  throw new Error("RUNTIME_ADJACENT_PREFIXES must be set (fail-closed)");
}

const wiringScopeDocPath =
  (process.env.WIRING_SCOPE_DOC_PATH || "docs/governance/wiring-scope.md").trim();

const prFiles = readJson();
if (!Array.isArray(prFiles)) {
  throw new Error(
    "PR files JSON must be an array (GitHub /pulls/<n>/files response shape)",
  );
}

const changed = extractChangedFilesFromPrFilesJson(prFiles);
console.log(`WIRING_SCOPE_CHANGED_FILES_COUNT=${changed.length}`);

// Optional: emit a canonical context line when repo/PR metadata is available.
// This keeps the tool's output grep-friendly even if workflow plumbing changes.
// Contract: workflow passes WIRING_SCOPE_REPO + WIRING_SCOPE_PR_NUMBER.
// If they're missing, omit context rather than guessing (keeps local runs honest).
const repo = String(process.env.WIRING_SCOPE_REPO || "").trim();
const pr = String(process.env.WIRING_SCOPE_PR_NUMBER || "").trim();
if (repo && pr) {
  console.log(`WIRING_SCOPE_CONTEXT repo=${repo} pr=${pr} changed_files_count=${changed.length}`);
}

// Fail-closed: if we couldn't extract any files, treat as an error.
// This catches auth/pagination/API weirdness that can otherwise look like
// "no runtime-adjacent changes" and silently pass.
if (changed.length === 0) {
  throw new Error(
    "No changed files extracted from PR files JSON (unexpected; check API/auth/pagination)",
  );
}
const parts = partitionByPrefixes(changed, runtimePrefixes);

console.log("WIRING_SCOPE_CHANGED:");
for (const f of changed) console.log(`- ${f}`);

console.log("WIRING_SCOPE_RUNTIME_ADJACENT:");
for (const f of parts.match) console.log(`- ${f}`);

console.log("WIRING_SCOPE_OTHER:");
for (const f of parts.rest) console.log(`- ${f}`);

if (parts.match.length === 0) {
  console.log("WIRING_SCOPE_RESULT: PASS (no runtime-adjacent changes)");
  process.exit(0);
}

if (!fs.existsSync(wiringScopeDocPath)) {
  console.error(
    `ERROR: Runtime-adjacent changes detected but ${wiringScopeDocPath} is missing.`,
  );
  console.error("Add the wiring scope doc and declare scope explicitly.");
  process.exit(1);
}

console.log("WIRING_SCOPE_RESULT: PASS (wiring scope doc present)");
