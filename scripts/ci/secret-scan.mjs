#!/usr/bin/env node
/**
 * secret-scan.mjs
 * Lightweight secret scanner (best-effort).
 * Output contract: one-line JSON (help/version are human-readable).
 */

import fs from "node:fs";
import path from "node:path";

const TOOL = "secret-scan";
const VERSION = "0.1.0";

function usage() {
  return [
    `${TOOL} ${VERSION}`,
    "",
    "Usage:",
    "  node scripts/ci/secret-scan.mjs [--root <path>]",
    "",
    "Scans text-like files for key-shaped secrets (OpenAI/ElevenLabs/Slack).",
    "",
    "Flags:",
    "  --root <path>   Repo root (default: cwd)",
    "  --help, -h      Show help and exit 0",
    "  --version       Show version and exit 0",
  ].join("\n");
}

function emit(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function fail(msg, extra = {}, code = 2) {
  emit({ ok: false, tool: TOOL, error: String(msg), ...extra });
  process.exit(code);
}

function parseArgs(argv) {
  const out = { root: process.cwd() };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "--help" || a === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }

    if (a === "--version") {
      process.stdout.write(`${TOOL} ${VERSION}\n`);
      process.exit(0);
    }

    if (a === "--root" && argv[i + 1]) {
      out.root = path.resolve(String(argv[++i]));
      continue;
    }

    fail("Unknown argument", { arg: a }, 1);
  }

  return out;
}

const TEXT_EXTS = new Set([
  ".txt",
  ".log",
  ".md",
  ".json",
  ".jsonc",
  ".yml",
  ".yaml",
  ".env",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".py",
  ".ps1",
  ".sh",
]);

const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  "target",
  ".venv",
  ".pytest_cache",
]);

// Strict-ish: require 20+ chars so we don't flag random "sk_" identifiers.
const RULES = [
  { name: "openai_project_key", re: /(?<![A-Za-z0-9])sk-proj-[A-Za-z0-9]{20,}(?![A-Za-z0-9])/g },
  { name: "openai_key", re: /(?<![A-Za-z0-9])sk-[A-Za-z0-9]{20,}(?![A-Za-z0-9])/g },
  { name: "elevenlabs_key", re: /(?<![A-Za-z0-9])sk_[A-Za-z0-9]{20,}(?![A-Za-z0-9])/g },
  { name: "slack_bot_token", re: /(?<![A-Za-z0-9])xoxb-[A-Za-z0-9-]{20,}(?![A-Za-z0-9])/g },
];

function walk(dir, results) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (IGNORE_DIRS.has(ent.name)) continue;
      walk(p, results);
      continue;
    }
    if (!ent.isFile()) continue;

    const ext = path.extname(ent.name).toLowerCase();
    if (!TEXT_EXTS.has(ext)) continue;

    let st;
    try {
      st = fs.statSync(p);
    } catch {
      continue;
    }

    // Avoid scanning very large files.
    if (st.size > 2 * 1024 * 1024) continue;

    results.push(p);
  }
}

function main() {
  const { root } = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(root)) fail("Root not found", { root }, 1);

  const files = [];
  walk(root, files);

  const hits = [];

  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }

    const matchedRules = [];
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      if (rule.re.test(text)) {
        matchedRules.push(rule.name);
      }
    }

    if (matchedRules.length > 0) {
      hits.push({ file: path.relative(root, file).replaceAll("\\\\", "/"), rules: matchedRules });
    }
  }

  if (hits.length > 0) {
    fail("Key-shaped secret detected in workspace", { count: hits.length, hits }, 2);
  }

  emit({ ok: true, tool: TOOL, count: 0 });
}

main();
