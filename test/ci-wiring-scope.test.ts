import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  computeWiringScope,
  extractChangedFilesFromPrFilesJson,
  normalizeRepoPath,
  partitionByPrefixes,
} from "../scripts/ci/wiring-scope-core.mjs";

test("wiring-scope: PR files JSON -> deterministic runtime-adjacent partition", () => {
  const prFiles = JSON.parse(
    fs.readFileSync("test/fixtures/pr-files.sample.json", "utf8"),
  );

  const changed = extractChangedFilesFromPrFilesJson(prFiles);

  // Mirrors the workflow's runtime-adjacent prefixes.
  const runtimePrefixes = ["agent-mode-engine", "src", "scripts", "make", "notion"];

  const res = partitionByPrefixes(changed, runtimePrefixes);

  assert.ok(res.match.includes("src/policy/checkPolicy.ts"));
  assert.ok(res.match.includes("scripts/ci/no-policy-code-literals.mjs"));

  assert.ok(res.rest.includes("README.md"));
  assert.ok(res.rest.includes("docs/DEPLOYMENT_GUIDE.md"));

  // Deterministic ordering.
  assert.deepEqual(res.match, [...res.match].sort());
  assert.deepEqual(res.rest, [...res.rest].sort());
});

test("wiring-scope: normalizeRepoPath fail-closed", () => {
  assert.equal(normalizeRepoPath(""), "");
  assert.equal(normalizeRepoPath("/etc/passwd"), "");
  assert.equal(normalizeRepoPath("C:\\Windows\\win.ini"), "");
  assert.equal(normalizeRepoPath("../secrets.env"), "");
  assert.equal(normalizeRepoPath("src\\policy\\checkPolicy.ts"), "src/policy/checkPolicy.ts");
});

test("wiring-scope: fails closed on traversal", () => {
  const res = computeWiringScope(["../pwn.txt"], {
    allowPrefixes: ["src"],
    denyPrefixes: [".github/workflows"],
  });
  assert.equal(res.deny[0]?.reason, "INVALID_PATH");
});

test("wiring-scope: deny wins over allow on overlap", () => {
  const res = computeWiringScope([".github/workflows/x.yml"], {
    allowPrefixes: [".github"],
    denyPrefixes: [".github/workflows"],
  });
  assert.equal(res.deny[0]?.reason, "DENYLIST");
});

test("wiring-scope wrapper: emits stable WIRING_SCOPE_CONTEXT when env vars exist", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wiring-scope-test-"));
  const wiringScopeDoc = path.join(tmpDir, "wiring-scope.md");
  fs.writeFileSync(wiringScopeDoc, "# wiring scope\n");

  const env = {
    ...process.env,
    PR_FILES_JSON_PATH: "test/fixtures/pr-files.sample.json",
    RUNTIME_ADJACENT_PREFIXES: "agent-mode-engine\nsrc\nscripts\nmake\nnotion",
    WIRING_SCOPE_DOC_PATH: wiringScopeDoc,
    WIRING_SCOPE_REPO: "owner/repo",
    WIRING_SCOPE_PR_NUMBER: "22",
  };

  const res = spawnSync(
    process.execPath,
    ["scripts/ci/require-wiring-scope-from-pr-files.mjs"],
    { env, encoding: "utf8" },
  );

  assert.equal(res.status, 0, res.stderr || "wrapper exited non-zero");
  assert.match(
    res.stdout,
    /^WIRING_SCOPE_CONTEXT repo=owner\/repo pr=22 changed_files_count=\d+$/m,
  );
});

test("wiring-scope wrapper: requires PR_FILES_JSON_PATH even if PR_FILES_JSON exists", () => {
  const env = {
    ...process.env,
    PR_FILES_JSON: JSON.stringify([
      { filename: "src/policy/checkPolicy.ts" },
    ]),
    RUNTIME_ADJACENT_PREFIXES: "src",
    WIRING_SCOPE_DOC_PATH: "docs/governance/wiring-scope.md",
  };

  // Clear PR_FILES_JSON_PATH to prove the wrapper is path-only.
  delete env.PR_FILES_JSON_PATH;

  const res = spawnSync(
    process.execPath,
    ["scripts/ci/require-wiring-scope-from-pr-files.mjs"],
    { env, encoding: "utf8" },
  );

  assert.notEqual(res.status, 0, "expected wrapper to fail without PR_FILES_JSON_PATH");
  assert.match(
    (res.stderr || "") + (res.stdout || ""),
    /Missing PR_FILES_JSON_PATH/,
  );
});

test("wiring-scope wrapper: runs with PATH empty (no git/gh/npm dependency)", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "wiring-scope-test-offline-"));
  const wiringScopeDoc = path.join(tmpDir, "wiring-scope.md");
  fs.writeFileSync(wiringScopeDoc, "# wiring scope\n");

  const env = {
    ...process.env,
    PATH: "",
    PR_FILES_JSON_PATH: "test/fixtures/pr-files.sample.json",
    RUNTIME_ADJACENT_PREFIXES: "agent-mode-engine\nsrc\nscripts\nmake\nnotion",
    WIRING_SCOPE_DOC_PATH: wiringScopeDoc,
    // If the wrapper tried to invoke npm, it would fail in a way that's obvious.
    npm_config_registry: "http://127.0.0.1:9",
  };

  const res = spawnSync(
    process.execPath,
    ["scripts/ci/require-wiring-scope-from-pr-files.mjs"],
    { env, encoding: "utf8" },
  );

  assert.equal(res.status, 0, res.stderr || "wrapper exited non-zero");
  assert.match(res.stdout, /^WIRING_SCOPE_CHANGED_FILES_COUNT=\d+$/m);
});

test("wiring-scope wrapper: does not import child_process", () => {
  const src = fs.readFileSync(
    "scripts/ci/require-wiring-scope-from-pr-files.mjs",
    "utf8",
  );

  // Static lock: prevent sneaking in git/gh/subprocess dependencies.
  assert.doesNotMatch(src, /node:child_process|\bchild_process\b/);
  assert.doesNotMatch(src, /\bspawn(Sync)?\b|\bexec(Sync)?\b/);
});
