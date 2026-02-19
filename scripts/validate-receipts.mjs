#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
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

function parseArgs(argv) {
  const out = {
    receiptsDir: "receipts",
    schemaPath: "receipts/schema.v1.json",
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--receipts") out.receiptsDir = argv[++i] || out.receiptsDir;
    else if (a === "--schema") out.schemaPath = argv[++i] || out.schemaPath;
    else fail(`Unknown arg: ${a}`);
  }
  return out;
}

function printHelp() {
  process.stdout.write("Usage: node scripts/validate-receipts.mjs [options]\n\n");
  process.stdout.write("Validates receipts/*.json against receipts/schema.v1.json.\n\n");
  process.stdout.write("Options:\n");
  process.stdout.write("  --receipts <dir>    default: receipts\n");
  process.stdout.write("  --schema <path>     default: receipts/schema.v1.json\n");
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

  const receiptFiles = listReceiptJsonFiles(receiptsDir);
  if (!receiptFiles.length) {
    process.stdout.write("No receipts found to validate.\n");
    process.exit(0);
  }

  let ok = true;
  for (const filePath of receiptFiles) {
    const doc = readJson(filePath);
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
