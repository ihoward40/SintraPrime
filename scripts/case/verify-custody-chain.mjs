#!/usr/bin/env node
/**
 * verify-custody-chain.mjs
 *
 * Verifies the hash chain integrity of a case's CHAIN-OF-CUSTODY.jsonl log.
 *
 * Usage:
 *   node scripts/case/verify-custody-chain.mjs <CASE_ID>
 *
 * Example:
 *   node scripts/case/verify-custody-chain.mjs CASE-666234B709
 *
 * Exit codes:
 *   0  Chain valid
 *   3  Chain invalid (tamper detected or broken sequence)
 *   1  Internal error
 *   2  Usage error
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

// SHA-256 of the empty string — used as GENESIS prior_entry_hash
const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function sha256(str) {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

function usage() {
  process.stderr.write(
    "Usage: node scripts/case/verify-custody-chain.mjs <CASE_ID>\n"
  );
  process.exit(2);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage: node scripts/case/verify-custody-chain.mjs <CASE_ID>\n");
    process.exit(0);
  }

  const caseId = argv[0] && !argv[0].startsWith("-") ? argv[0].trim() : "";
  if (!caseId) usage();

  const logPath = path.join(REPO_ROOT, "cases", caseId, "audit", "CHAIN-OF-CUSTODY.jsonl");
  if (!fs.existsSync(logPath)) {
    process.stderr.write(`Error: Chain-of-custody log not found: ${logPath}\n`);
    process.exit(1);
  }

  const rawLines = fs.readFileSync(logPath, "utf8").split(/\r?\n/).filter(Boolean);
  const failures = [];
  let prevHash = EMPTY_SHA256;
  let expectedSeq = 1;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (e) {
      failures.push({ line: i + 1, error: "JSON parse error", raw: line.slice(0, 80) });
      continue;
    }

    // Check sequence
    if (entry.seq !== expectedSeq) {
      failures.push({ seq: entry.seq, expected_seq: expectedSeq, error: "Sequence gap or mismatch" });
    }
    expectedSeq = (entry.seq ?? expectedSeq) + 1;

    // Check prior_entry_hash
    const expectedPrior = i === 0 ? EMPTY_SHA256 : prevHash;
    if (entry.prior_entry_hash && entry.prior_entry_hash !== "GENESIS" && entry.prior_entry_hash !== expectedPrior) {
      failures.push({
        seq: entry.seq,
        error: "prior_entry_hash mismatch — chain broken or entry tampered",
        expected: expectedPrior,
        got: entry.prior_entry_hash,
      });
    }

    // Update prevHash: use the raw line for hash chaining consistency
    prevHash = sha256(line);

    // Check entry_hash if present and not a placeholder
    if (entry.entry_hash && entry.entry_hash !== "COMPUTE_ON_SEAL" && entry.entry_hash !== "GENESIS") {
      // entry_hash should be SHA-256 of the entry without the entry_hash field itself
      const { entry_hash: _ignored, ...rest } = entry;
      const canonical = JSON.stringify(rest);
      const expected = sha256(canonical);
      if (entry.entry_hash !== expected) {
        failures.push({
          seq: entry.seq,
          error: "entry_hash mismatch — entry content may have been modified",
          expected,
          got: entry.entry_hash,
        });
      }
    }
  }

  const ok = failures.length === 0;
  const result = {
    ok,
    case_id: caseId,
    entries_checked: rawLines.length,
    chain: ok ? "VALID" : "INVALID",
    failures,
  };

  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exit(ok ? 0 : 3);
}

main().catch((err) => {
  process.exitCode = 1;
  process.stderr.write(String(err?.stack || err?.message || err) + "\n");
});
