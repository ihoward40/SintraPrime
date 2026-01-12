#!/usr/bin/env node
/**
 * verify-run.js
 * Recompute and verify append-only hash chain for a SintraPrime run.
 *
 * Usage: node verify-run.js runs/<RUN_ID>
 * Exit: 0 OK | 1 FAIL
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function die(msg) {
  console.error(`VERIFY FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function sha256FileHex(filePath) {
  const buf = fs.readFileSync(filePath);
  return sha256Hex(buf);
}

function parsePipeFields(line) {
  // HASH_CHAIN | artifact=... | sha256=... | prev=... | at=...
  const parts = line.split("|").slice(1);
  const fields = {};
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    fields[k] = v;
  }
  return fields;
}

function computeHead(prev, artifactRel, artifactSha256) {
  // Must match src/watch/hashChain.ts derivation
  return sha256Hex(`${prev || ""}|${artifactRel}|${artifactSha256}`);
}

const runDirArg = process.argv[2];
if (!runDirArg) die("Missing run directory. Example: node verify-run.js runs/<RUN_ID>");

const runDir = path.resolve(process.cwd(), runDirArg);
const ledgerPath = path.join(runDir, "ledger.jsonl");
if (!fs.existsSync(ledgerPath)) die("ledger.jsonl not found");

const raw = fs.readFileSync(ledgerPath, "utf8");
const lines = raw
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

let prevExpected = null;
let chainCount = 0;
let groupCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Prefer JSONL (current format)
  if (line.startsWith("{")) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      die(`Malformed JSON at line ${i + 1}`);
    }

    if (!obj || typeof obj !== "object") continue;

    if (obj.kind === "hash_chain") {
      chainCount++;

      const artifact = obj.artifact;
      const sha = obj.sha256;
      const prev = obj.prev === undefined ? null : obj.prev;
      const head = obj.head;

      if (typeof artifact !== "string" || !artifact) die(`Malformed hash_chain at line ${i + 1}: missing artifact`);
      if (typeof sha !== "string" || !sha) die(`Malformed hash_chain at line ${i + 1}: missing sha256`);
      if (!(prev === null || typeof prev === "string")) die(`Malformed hash_chain at line ${i + 1}: invalid prev`);
      if (typeof head !== "string" || !head) die(`Malformed hash_chain at line ${i + 1}: missing head`);

      if (prev !== prevExpected) {
        die(`prev mismatch at line ${i + 1}: expected ${prevExpected}, got ${prev}`);
      }

      const artifactPath = path.join(runDir, artifact);
      if (!fs.existsSync(artifactPath)) {
        die(`Artifact missing for hash at line ${i + 1}: ${artifact}`);
      }

      const actual = sha256FileHex(artifactPath);
      if (actual !== sha) {
        die(`Hash mismatch for ${artifact}: expected ${sha}, got ${actual}`);
      }

      const expectedHead = computeHead(prevExpected, artifact, sha);
      if (expectedHead !== head) {
        die(`Head mismatch at line ${i + 1}: expected ${expectedHead}, got ${head}`);
      }

      prevExpected = head;
      continue;
    }

    if (obj.kind === "hash_chain_group") {
      groupCount++;
      if (typeof obj.head === "string" && prevExpected !== null && obj.head !== prevExpected) {
        die(`hash_chain_group head mismatch at line ${i + 1}: expected ${prevExpected}, got ${obj.head}`);
      }
      continue;
    }

    continue;
  }

  // Back-compat: pipe-delimited entries (older spec)
  if (line.startsWith("HASH_CHAIN")) {
    chainCount++;

    const fields = parsePipeFields(line);
    const artifact = fields.artifact;
    const sha = fields.sha256;
    const prev = fields.prev === "null" ? null : fields.prev;

    if (!artifact || !sha) die(`Malformed HASH_CHAIN at line ${i + 1}`);

    if (prev !== prevExpected) {
      die(`prev mismatch at line ${i + 1}: expected ${prevExpected}, got ${prev}`);
    }

    const artifactPath = path.join(runDir, artifact);
    if (!fs.existsSync(artifactPath)) {
      die(`Artifact missing for hash at line ${i + 1}: ${artifact}`);
    }

    const actual = sha256FileHex(artifactPath);
    if (actual !== sha) {
      die(`Hash mismatch for ${artifact}: expected ${sha}, got ${actual}`);
    }

    // In pipe mode, we treat prev as previous sha (as spec'd), not head.
    prevExpected = sha;
    continue;
  }
}

ok(`Verified ${chainCount} hash chain entries`);
ok(`Verified ${groupCount} hash chain group entries`);
ok("Run hash chain is valid");
process.exit(0);
