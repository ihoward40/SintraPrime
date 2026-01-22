#!/usr/bin/env node
/*
  Minimal fallback verifier.

  This is only used if the repository-level verify-run.js is missing.

  Contract:
    - Success: single-line JSON
    - Failure: single-line JSON
    - --help/-h and --version are human-readable and exit 0
*/

import fs from "node:fs";
import path from "node:path";

let OUTPUT_JSON = true;

function printJsonLine(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function helpText() {
  return (
    "Usage:\n" +
    "  node tools/verify-run/verify-run.mjs --run-id RUN-... [--runs-root runs] [--json]\n" +
    "  node tools/verify-run/verify-run.mjs --help|-h\n" +
    "  node tools/verify-run/verify-run.mjs --version\n"
  );
}

function die(code, msg, extra) {
  if (OUTPUT_JSON) {
    printJsonLine({ ok: false, error: String(msg), ...(extra && typeof extra === "object" ? extra : {}) });
  } else {
    process.stderr.write(`Error: ${msg}\n`);
  }
  process.exit(code);
}

function parseArgs(argv) {
  const out = {
    runId: null,
    runsRoot: "runs",
    json: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "--help" || a === "-h") {
      out.help = true;
      continue;
    }
    if (a === "--version") {
      out.version = true;
      continue;
    }
    if (a === "--json") {
      out.json = true;
      continue;
    }
    if (a === "--run-id" && argv[i + 1]) {
      out.runId = String(argv[++i]).trim();
      continue;
    }
    if (a === "--runs-root" && argv[i + 1]) {
      out.runsRoot = String(argv[++i]).trim();
      continue;
    }

    die(2, helpText());
  }

  if (out.help) {
    OUTPUT_JSON = false;
    process.stdout.write(helpText());
    process.exit(0);
  }

  if (out.version) {
    OUTPUT_JSON = false;
    process.stdout.write("verify-run-fallback 0.1.0\n");
    process.exit(0);
  }

  if (!out.runId) die(2, "Missing --run-id");

  return out;
}

function parseManifestSha256Text(text) {
  const t = String(text || "").trim();
  const m = t.match(/^sha256:([0-9a-f]{64})$/i);
  return m ? m[1].toLowerCase() : null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const runDir = path.join(args.runsRoot, args.runId);
  if (!fs.existsSync(runDir)) die(1, "Run dir not found", { run_dir: runDir });

  const manifestShaPath = path.join(runDir, "05_hash", "manifest_sha256.txt");
  if (!fs.existsSync(manifestShaPath)) die(1, "Missing 05_hash/manifest_sha256.txt", { run_dir: runDir });
  const manifestHex = parseManifestSha256Text(fs.readFileSync(manifestShaPath, "utf8"));
  if (!manifestHex) die(1, "Invalid manifest_sha256.txt", { run_dir: runDir });

  const ledgerPath = path.join(runDir, "06_ledger", "ledger.jsonl");
  if (!fs.existsSync(ledgerPath)) die(1, "Missing 06_ledger/ledger.jsonl", { run_dir: runDir });
  const ledgerSize = fs.statSync(ledgerPath).size;
  if (ledgerSize <= 0) die(1, "Empty ledger", { run_dir: runDir });

  printJsonLine({
    ok: true,
    kind: "VerifyRunFallback",
    run_id: args.runId,
    run_dir: runDir,
    manifest_sha256: `sha256:${manifestHex}`,
    ledger_bytes: ledgerSize,
  });
}

try {
  main();
} catch (e) {
  die(1, e instanceof Error ? e.message : String(e));
}
