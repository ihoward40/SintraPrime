#!/usr/bin/env node
/**
 * sanitize-secrets.mjs
 * Redacts key-shaped secrets from a file (writes a sanitized copy).
 * Output contract: one-line JSON (help/version are human-readable).
 */

import fs from "node:fs";
import path from "node:path";

const TOOL = "sanitize-secrets";
const VERSION = "0.1.0";

function usage() {
  return [
    `${TOOL} ${VERSION}`,
    "",
    "Usage:",
    "  node scripts/ci/sanitize-secrets.mjs --in <path> [--out <path>]",
    "",
    "Writes a sanitized copy of the input file with any key-shaped secrets replaced.",
    "It never prints the secret values.",
    "",
    "Flags:",
    "  --in <path>        Input file (required)",
    "  --out <path>       Output file (default: <in>.sanitized<ext>)",
    "  --help, -h         Show help and exit 0",
    "  --version          Show version and exit 0",
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
  const out = { inPath: null, outPath: null };

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

    if (a === "--in" && argv[i + 1]) {
      out.inPath = path.resolve(String(argv[++i]));
      continue;
    }

    if (a === "--out" && argv[i + 1]) {
      out.outPath = path.resolve(String(argv[++i]));
      continue;
    }

    fail("Unknown argument", { arg: a }, 1);
  }

  if (!out.inPath) fail("Missing --in", {}, 1);
  return out;
}

const RULES = [
  { name: "openai_project_key", re: /(?<![A-Za-z0-9])sk-proj-[A-Za-z0-9]{20,}(?![A-Za-z0-9])/g, repl: "sk-proj-REDACTED" },
  { name: "openai_key", re: /(?<![A-Za-z0-9])sk-[A-Za-z0-9]{20,}(?![A-Za-z0-9])/g, repl: "sk-REDACTED" },
  { name: "elevenlabs_key", re: /(?<![A-Za-z0-9])sk_[A-Za-z0-9]{20,}(?![A-Za-z0-9])/g, repl: "sk_REDACTED" },
  { name: "slack_bot_token", re: /(?<![A-Za-z0-9])xoxb-[A-Za-z0-9-]{20,}(?![A-Za-z0-9])/g, repl: "xoxb-REDACTED" },
];

function defaultOutPath(inPath) {
  const dir = path.dirname(inPath);
  const ext = path.extname(inPath);
  const base = path.basename(inPath, ext);
  return path.join(dir, `${base}.sanitized${ext || ".txt"}`);
}

function main() {
  const { inPath, outPath } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(inPath)) fail("Input not found", { in: inPath }, 1);

  const original = fs.readFileSync(inPath, "utf8");
  let sanitized = original;

  const counts = {};
  for (const r of RULES) {
    r.re.lastIndex = 0;
    const m = sanitized.match(r.re);
    const c = m ? m.length : 0;
    counts[r.name] = c;
    if (c > 0) sanitized = sanitized.replaceAll(r.re, r.repl);
  }

  const out = outPath || defaultOutPath(inPath);
  fs.writeFileSync(out, sanitized, "utf8");

  emit({
    ok: true,
    tool: TOOL,
    in: inPath,
    out,
    changed: sanitized !== original,
    counts,
  });
}

main();
