#!/usr/bin/env node
/**
 * hash-evidence.mjs
 *
 * Computes the SHA-256 hash of an evidence file for chain-of-custody recording.
 *
 * Usage:
 *   node scripts/case/hash-evidence.mjs <file_path>
 *
 * Output: SHA-256 hex string (64 characters) — safe to record in EVIDENCE-MANIFEST.json
 *
 * Governance: This script is read-only. It computes and prints a hash;
 * it does not modify any file or transmit any data.
 */

import fs from "node:fs";
import crypto from "node:crypto";
import process from "node:process";

function sha256File(p) {
  const buf = fs.readFileSync(p);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

const filePath = process.argv[2];
if (!filePath) {
  process.stderr.write("Usage: node scripts/case/hash-evidence.mjs <file_path>\n");
  process.exit(2);
}

if (!fs.existsSync(filePath)) {
  process.stderr.write(`Error: File not found: ${filePath}\n`);
  process.exit(1);
}

const hash = sha256File(filePath);
process.stdout.write(`${hash}  ${filePath}\n`);
