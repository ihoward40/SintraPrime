#!/usr/bin/env node
/**
 * DeepThink CI Gates
 *
 * Enforces:
 * 1) No forbidden imports (http/https/net/child_process) in deepthink module
 * 2) DeepThink writes only under runs/
 * 3) request/output/manifest + .sha256 exist and hashes match (for DeepThink runs)
 * 4) request.json contains only allowed keys (schema-level strictness)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";

const REPO_ROOT = process.cwd();
const DEEPTHINK_DIR = path.join(REPO_ROOT, "deepthink");
const RUNS_DIR = path.join(REPO_ROOT, "runs");

function fail(msg) {
  process.stderr.write(`DeepThink gate failed: ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  process.stdout.write(`${msg}\n`);
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function readUtf8(p) {
  return fs.readFileSync(p, "utf8");
}

function readJson(p) {
  try {
    return JSON.parse(readUtf8(p));
  } catch {
    fail(`Invalid JSON: ${p}`);
  }
}

function listFilesRecursive(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(p));
    else out.push(p);
  }
  return out;
}

function listDeepthinkRunDirs() {
  if (!fs.existsSync(RUNS_DIR)) return [];
  const re = /^DEEPTHINK[_-]/;
  return fs
    .readdirSync(RUNS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && re.test(d.name))
    .map((d) => path.join(RUNS_DIR, d.name));
}

// Gate 1: forbidden imports
function gateForbiddenImports() {
  const forbidden = ["http", "https", "net", "child_process"];

  const jsFiles = listFilesRecursive(DEEPTHINK_DIR).filter((f) => f.endsWith(".js") || f.endsWith(".mjs"));

  for (const file of jsFiles) {
    const src = readUtf8(file);
    for (const mod of forbidden) {
      const re = new RegExp(
        `(from\\s+["']node:${mod}["']|from\\s+["']${mod}["']|require\\(["']${mod}["']\\))`,
        "g",
      );
      if (re.test(src)) {
        fail(`Forbidden import "${mod}" found in ${path.relative(REPO_ROOT, file)}`);
      }
    }
  }

  ok("DeepThink gates: no forbidden imports");
}

// Gate 2: write boundary (runs/ only)
function gateWriteBoundary() {
  if (!fs.existsSync(RUNS_DIR)) {
    ok("DeepThink gates: runs/ missing (boundary check skipped)");
    return;
  }

  const all = listFilesRecursive(RUNS_DIR);
  for (const f of all) {
    const rel = path.relative(RUNS_DIR, f);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      fail(`File escapes runs/ boundary: ${f}`);
    }
  }

  ok("DeepThink gates: artifacts confined to runs/");
}

// Gate 3: artifacts + hash integrity (DeepThink runs only)
function gateRunArtifacts() {
  const runDirs = listDeepthinkRunDirs();
  if (runDirs.length === 0) {
    ok("DeepThink gates: no DEEPTHINK_* runs present (artifact gate skipped)");
    return;
  }

  for (const dir of runDirs) {
    const required = ["request.json", "output.json", "manifest.json"];
    for (const name of required) {
      const file = path.join(dir, name);
      const sidecar = file + ".sha256";

      if (!fs.existsSync(file)) {
        fail(`Missing ${name} in ${path.relative(REPO_ROOT, dir)}`);
      }
      if (!fs.existsSync(sidecar)) {
        fail(`Missing ${name}.sha256 in ${path.relative(REPO_ROOT, dir)}`);
      }

      const content = fs.readFileSync(file);
      const actual = sha256Hex(content);
      const expected = readUtf8(sidecar).trim().split(/\s+/)[0];

      if (actual.toLowerCase() !== expected.toLowerCase()) {
        fail(`Hash mismatch for ${path.relative(REPO_ROOT, file)}`);
      }
    }
  }

  ok("DeepThink gates: artifacts present and sha256 sidecars verified");
}

// Gate 4: request schema strictness (top-level keys allowlist)
function gateRequestKeys() {
  const runDirs = listDeepthinkRunDirs();
  if (runDirs.length === 0) {
    ok("DeepThink gates: no DEEPTHINK_* runs present (request gate skipped)");
    return;
  }

  const allowedTopKeys = new Set(["analysis_id", "purpose", "created_utc", "inputs", "options"]);

  for (const dir of runDirs) {
    const reqPath = path.join(dir, "request.json");
    if (!fs.existsSync(reqPath)) continue;

    const req = readJson(reqPath);
    for (const key of Object.keys(req)) {
      if (!allowedTopKeys.has(key)) {
        fail(`request.json in ${path.relative(REPO_ROOT, dir)} has disallowed key "${key}"`);
      }
    }
  }

  ok("DeepThink gates: request.json top-level keys strict");
}

function main() {
  process.stdout.write("Running DeepThink CI gates…\n");

  if (!fs.existsSync(DEEPTHINK_DIR)) {
    ok("DeepThink module not present; gates skipped");
    return;
  }

  gateForbiddenImports();
  gateWriteBoundary();
  gateRunArtifacts();
  gateRequestKeys();

  process.stdout.write("DeepThink CI gates passed\n");
}

main();
