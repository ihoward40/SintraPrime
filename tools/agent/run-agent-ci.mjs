#!/usr/bin/env node
/**
 * Full orchestrator CI smoke:
 * agent -> verify-run -> cleanup (always)
 *
 * Contract: single JSON line on success/failure.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { emitOneLineJSON } from "./emit-jsonl.mjs";

function fail(code, msg, extra = {}) {
  emitOneLineJSON({ ok: false, error: String(msg), ...(extra && typeof extra === "object" ? extra : {}) });
  process.exit(code);
}

const repoRoot = process.cwd();
const runsRoot = process.env.RUNS_ROOT || "runs";

const agentPath = path.join(repoRoot, "tools", "agent", "agent.mjs");

const verifyWrapperPreferred = path.join(repoRoot, "tools", "verify-run-wrapper.mjs");
const verifyWrapperFallback = path.join(repoRoot, "scripts", "verify-run-wrapper.mjs");
const verifyWrapper = fs.existsSync(verifyWrapperPreferred) ? verifyWrapperPreferred : verifyWrapperFallback;

const repoVerifyRunJs = path.join(repoRoot, "verify-run.js");
const fallbackVerifier = path.join(repoRoot, "tools", "verify-run", "verify-run.mjs");

function runNode(args) {
  return spawnSync(process.execPath, args, { cwd: repoRoot, encoding: "utf8" });
}

function parseJsonFromStdout(stdout, ctx) {
  const s = String(stdout || "").trim();
  if (!s) fail(2, `No output from ${ctx}`);

  // Best case: the stdout is a single JSON payload.
  try {
    return JSON.parse(s);
  } catch {
    // continue
  }

  // Common case for verify-run.js: pretty-printed multi-line JSON.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const candidate = s.slice(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // continue
    }
  }

  // Fallback: walk lines from bottom to top and parse the first valid JSON line.
  const lines = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(lines[i]);
    } catch {
      // continue
    }
  }

  fail(2, `Non-JSON output from ${ctx}`, { raw: lines.slice(-1)[0] || null });
}

function resolveRunDirAbs(runDirMaybeRel) {
  if (!runDirMaybeRel) return null;
  const p = String(runDirMaybeRel);
  return path.isAbsolute(p) ? p : path.join(repoRoot, p);
}

function extractBundle(agentJson) {
  return (
    agentJson?.create?.bundle ||
    agentJson?.create?.output ||
    agentJson?.bundle?.bundle ||
    agentJson?.bundle ||
    null
  );
}

let runDir = null;

try {
  const agentRes = runNode([agentPath, "--text", "agent ci smoke", "--runs-root", runsRoot]);
  const agentJson = parseJsonFromStdout(agentRes.stdout, "agent");
  if (agentRes.status !== 0 || agentJson?.ok !== true) {
    fail(agentRes.status || 1, "agent failed", { agent: agentJson, stderr: String(agentRes.stderr || "").trim() || null });
  }

  const runId = agentJson?.run_id;
  runDir = agentJson?.run_dir;

  if (!runDir || !runId) {
    fail(2, "agent output missing run_dir/run_id", { agent: agentJson });
  }

  const verifyArgs = fs.existsSync(repoVerifyRunJs)
    ? [verifyWrapper, "--run-id", runId, "--runs-root", runsRoot, "--json"]
    : [fallbackVerifier, "--run-id", runId, "--runs-root", runsRoot, "--json"];

  const verifyRes = runNode(verifyArgs);
  const verifyJson = parseJsonFromStdout(verifyRes.stdout, "verify-run");

  if (verifyRes.status !== 0 || verifyJson?.ok !== true) {
    fail(verifyRes.status || 1, "verify-run failed", { verify: verifyJson, stderr: String(verifyRes.stderr || "").trim() || null });
  }

  emitOneLineJSON({
    ok: true,
    run_id: runId,
    run_dir: runDir,
    manifest_sha256: agentJson?.manifest_sha256 || agentJson?.rehash?.manifest_sha256 || agentJson?.create?.manifest_sha256 || null,
    bundle: extractBundle(agentJson),
    runs_root: runsRoot,
  });
} finally {
  const runDirAbs = resolveRunDirAbs(runDir);
  if (runDirAbs && fs.existsSync(runDirAbs)) {
    try {
      fs.rmSync(runDirAbs, { recursive: true, force: true });
    } catch {
      // Keep contract: no extra output.
    }
  }
}
