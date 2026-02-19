#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import childProcess from "node:child_process";
import process from "node:process";

import Ajv from "ajv/dist/2020.js";

function fail(msg) {
  process.stderr.write(`validate-receipts: ${msg}\n`);
  process.exit(1);
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    fail(`Invalid JSON: ${p}`);
  }
}

function listReceiptJsonFiles(receiptsDir) {
  const entries = fs.readdirSync(receiptsDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => n.endsWith(".json"))
    .filter((n) => n !== "schema.v1.json")
    .map((n) => path.join(receiptsDir, n));
}

function toPosixPath(p) {
  return String(p).split(path.sep).join("/");
}

function listGitTrackedReceiptJsonFiles(repoRoot, receiptsDir, schemaPath) {
  const receiptsDirRel = toPosixPath(path.relative(repoRoot, receiptsDir));
  const schemaRel = toPosixPath(path.relative(repoRoot, schemaPath));
  const pathspec = `:(glob)${receiptsDirRel}/*.json`;

  try {
    const out = childProcess.execFileSync("git", ["ls-files", "--", pathspec], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    return out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((p) => p !== schemaRel)
      .map((p) => path.resolve(repoRoot, p));
  } catch {
    return listReceiptJsonFiles(receiptsDir);
  }
}

function formatAjvErrors(errors) {
  if (!errors || !errors.length) return "";
  return errors
    .map((e) => {
      const where = e.instancePath || "<root>";
      const msg = e.message || "invalid";
      return `  - ${where}: ${msg}`;
    })
    .join("\n");
}

function enforceFilenameMatchesReceiptId(repoRoot, filePath, doc) {
  const rid = doc?.meta?.receipt_id;
  if (!rid) return [];

  const actual = path.basename(filePath);
  const expected = `${rid}.json`;
  if (actual === expected) return [];

  return [
    `filename mismatch: expected receipts/${expected} but found receipts/${actual}`,
  ];
}

function parseArgs(argv) {
  const out = {
    receiptsDir: "receipts",
    schemaPath: "receipts/schema.v1.json",
    includeUntracked: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--receipts") out.receiptsDir = argv[++i] || out.receiptsDir;
    else if (a === "--schema") out.schemaPath = argv[++i] || out.schemaPath;
    else if (a === "--include-untracked") out.includeUntracked = true;
    else fail(`Unknown arg: ${a}`);
  }
  return out;
}

function printHelp() {
  process.stdout.write("Usage: node scripts/validate-receipts.mjs [options]\n\n");
  process.stdout.write("Validates receipts JSON files against receipts/schema.v1.json.\n\n");
  process.stdout.write(
    "By default, validates only git-tracked receipts (so untracked local files under receipts/ won't break validation).\n\n",
  );
  process.stdout.write("Options:\n");
  process.stdout.write("  --receipts <dir>    default: receipts\n");
  process.stdout.write("  --schema <path>     default: receipts/schema.v1.json\n");
  process.stdout.write("  --include-untracked validate all receipts/*.json on disk (including untracked)\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const repoRoot = process.cwd();
  const receiptsDir = path.resolve(repoRoot, args.receiptsDir);
  const schemaPath = path.resolve(repoRoot, args.schemaPath);

  if (!fs.existsSync(receiptsDir)) fail(`Missing receipts dir: ${path.relative(repoRoot, receiptsDir)}`);
  if (!fs.existsSync(schemaPath)) fail(`Missing schema: ${path.relative(repoRoot, schemaPath)}`);

  const schema = readJson(schemaPath);
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);

  const receiptFiles = args.includeUntracked
    ? listReceiptJsonFiles(receiptsDir)
    : listGitTrackedReceiptJsonFiles(repoRoot, receiptsDir, schemaPath);
  if (!receiptFiles.length) {
    process.stdout.write("No receipts found to validate.\n");
    process.exit(0);
  }

  let ok = true;
  for (const filePath of receiptFiles) {
    const doc = readJson(filePath);

    const filenameErrors = enforceFilenameMatchesReceiptId(repoRoot, filePath, doc);
    if (filenameErrors.length) {
      ok = false;
      process.stderr.write(`INVALID: ${path.relative(repoRoot, filePath)}\n`);
      for (const e of filenameErrors) process.stderr.write(`  - ${e}\n`);
    }

    const valid = validate(doc);
    if (!valid) {
      ok = false;
      process.stderr.write(`INVALID: ${path.relative(repoRoot, filePath)}\n`);
      process.stderr.write(`${formatAjvErrors(validate.errors)}\n`);
    }
  }

  if (!ok) {
    process.exit(1);
  }

  process.stdout.write(`OK: ${receiptFiles.length} receipt(s) validated\n`);
}

main().catch((e) => fail(e?.stack || String(e)));
