#!/usr/bin/env node
/**
 * Agent CI output contract test
 *
 * Validates the public surface of tools/agent/run-agent-ci.mjs:
 * - stdout is exactly ONE non-empty line
 * - that line is valid JSON
 * - required keys exist (success vs failure)
 *
 * Flags:
 *   --strict-stderr   Fail if runner writes anything to stderr
 *   --help, -h        Print usage and exit 0 (human-readable)
 *   --version         Print version string and exit 0 (human-readable)
 *
 * Output contract:
 *   One JSON line on pass/fail (help/version are human-readable).
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { emitOneLineJSON } from "./emit-jsonl.mjs";
import { AGENT_INTERFACE, AGENT_INTERFACE_VERSION } from "./interface-version.mjs";
import { readAgentInterfaceVersions } from "./interface-doc-sync.mjs";

const VERSION = "0.1.0";

function usage() {
  return [
    `agent-contract ${VERSION}`,
    "",
    "Usage:",
    "  node tools/agent/agent-contract.mjs [--strict-stderr]",
    "",
    "Flags:",
    "  --strict-stderr   Fail if runner writes anything to stderr",
    "  --help, -h        Show this help and exit 0",
    "  --version         Show version and exit 0",
  ].join("\n");
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}

if (process.argv.includes("--version")) {
  process.stdout.write(`agent-contract ${VERSION}\n`);
  process.exit(0);
}

const STRICT_STDERR = process.argv.includes("--strict-stderr");

function oneLine(obj) {
  emitOneLineJSON(obj);
}

function die(code, msg, extra = {}) {
  oneLine({ ok: false, contract_ok: false, error: String(msg), ...extra });
  process.exit(code);
}

function assert(cond, msg, extra = {}) {
  if (!cond) die(1, msg, extra);
}

const repoRoot = process.cwd();
const runner = path.join(repoRoot, "tools", "agent", "run-agent-ci.mjs");

assert(fs.existsSync(runner), "Missing CI smoke runner", { expected: runner });

// Doc↔code sync check (extra-hard mode): fail if docs/INTERFACES.md disagrees with tools/agent/interface-version.mjs
const sync = readAgentInterfaceVersions(repoRoot);
assert(sync.ok, "interface doc mismatch", {
  code_version: sync.codeVersion,
  docs_version: sync.docsVersion,
});

// Deprecation blocks parser smoke: ensure at least the smoke block exists.
const interfacesDocSrc = fs.readFileSync(sync.docsPath, "utf8");
assert(
  interfacesDocSrc.includes("key: __smoke_test_deprecation_block__"),
  "missing deprecation smoke block in docs/INTERFACES.md",
  { expected_key: "__smoke_test_deprecation_block__" }
);

// Deprecation rollup artifact must exist and include at least one block.
// This ensures the deprecation checker isn't silently producing empty rollups.
const rollupPath = path.join(repoRoot, "artifacts", "deprecation-rollup.json");
assert(fs.existsSync(rollupPath), "missing deprecation rollup artifact", {
  expected: "artifacts/deprecation-rollup.json",
});

let rollup;
try {
  rollup = JSON.parse(fs.readFileSync(rollupPath, "utf8"));
} catch {
  die(2, "deprecation rollup is not valid JSON", { expected: "artifacts/deprecation-rollup.json" });
}

assert(rollup && typeof rollup === "object", "deprecation rollup must be an object");
assert(rollup.interface === AGENT_INTERFACE, "deprecation rollup interface mismatch", {
  expected: AGENT_INTERFACE,
  got: rollup.interface ?? null,
});
assert(rollup.interface_version === AGENT_INTERFACE_VERSION, "deprecation rollup interface_version mismatch", {
  expected: AGENT_INTERFACE_VERSION,
  got: rollup.interface_version ?? null,
});
assert(
  typeof rollup.counts?.blocks === "number" && rollup.counts.blocks >= 1,
  "deprecation rollup must include counts.blocks >= 1",
  { got: rollup.counts?.blocks ?? null }
);

const res = spawnSync(process.execPath, [runner], {
  cwd: repoRoot,
  encoding: "utf8",
});

const stdout = String(res.stdout || "");
const stderr = String(res.stderr || "");

if (STRICT_STDERR) {
  assert(stderr.trim().length === 0, "stderr must be empty (strict)", {
    stderr_preview: stderr.slice(0, 500),
    runner_exit: res.status,
  });
}

const lines = stdout
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

assert(lines.length === 1, "stdout must be exactly one JSON line", {
  lines_count: lines.length,
  lines_preview: lines.slice(0, 3),
  stderr_preview: stderr.slice(0, 500),
  runner_exit: res.status,
});

let obj;
try {
  obj = JSON.parse(lines[0]);
} catch {
  die(2, "stdout line is not valid JSON", { raw: lines[0].slice(0, 500) });
}

assert(typeof obj.ok === "boolean", "JSON must contain boolean `ok`", {
  keys: Object.keys(obj || {}),
});

assert(obj.interface === AGENT_INTERFACE, "interface mismatch", {
  expected: AGENT_INTERFACE,
  got: obj.interface ?? null,
});

assert(obj.interface_version === AGENT_INTERFACE_VERSION, "interface_version mismatch", {
  expected: AGENT_INTERFACE_VERSION,
  got: obj.interface_version ?? null,
});

if (obj.ok === true) {
  assert(typeof obj.run_id === "string" && obj.run_id.length > 0, "ok:true must include run_id");
  assert(typeof obj.run_dir === "string" && obj.run_dir.length > 0, "ok:true must include run_dir");
} else {
  assert(typeof obj.error === "string" && obj.error.length > 0, "ok:false must include error");
}

oneLine({
  ok: true,
  contract_ok: true,
  strict_stderr: STRICT_STDERR,
  runner_exit: res.status,
  run_id: obj.run_id ?? null,
  run_dir: obj.run_dir ?? null,
});

process.exit(0);
