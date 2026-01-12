#!/usr/bin/env node
/**
 * verify-run.js
 * Recompute and verify append-only hash chain(s) for one or more SintraPrime runs.
 *
 * Usage:
 *   node verify-run.js runs/<RUN_ID> [--json]
 *   node verify-run.js runs [--json]            # batch: all subdirs with ledger.jsonl
 *   node verify-run.js . [--json]               # batch: ./runs if present
 *   node verify-run.js runs/a runs/b [--json]   # batch: selected runs
 *
 * Exit: 0 all verified | 1 one or more failures
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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

function toPosixPath(p) {
  return p.replace(/\\/g, "/");
}

function stableRunLabel(runDirAbs) {
  const rel = path.relative(process.cwd(), runDirAbs);
  if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) return toPosixPath(rel);
  return toPosixPath(runDirAbs);
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function listLedgerSubdirs(baseDirAbs) {
  if (!isDir(baseDirAbs)) return [];
  return fs
    .readdirSync(baseDirAbs)
    .map((name) => path.join(baseDirAbs, name))
    .filter((p) => isDir(p) && exists(path.join(p, "ledger.jsonl")));
}

function expandTargets(targetsRaw) {
  if (!targetsRaw.length) throw new Error("Missing run directory or folder");

  const expanded = [];

  for (const t of targetsRaw) {
    const abs = path.resolve(process.cwd(), t);

    if (!isDir(abs)) {
      // Allow explicitly passing a run directory that doesn't exist yet to produce a clear error per-run
      expanded.push(abs);
      continue;
    }

    // If it looks like a single run directory, use it.
    if (exists(path.join(abs, "ledger.jsonl"))) {
      expanded.push(abs);
      continue;
    }

    // If it's a folder containing runs, prefer that.
    const runsDir = path.join(abs, "runs");
    const runsSubdirs = listLedgerSubdirs(runsDir);
    if (runsSubdirs.length) {
      expanded.push(...runsSubdirs);
      continue;
    }

    // Otherwise, treat it as a base directory containing run subdirs.
    const subdirs = listLedgerSubdirs(abs);
    if (subdirs.length) {
      expanded.push(...subdirs);
      continue;
    }

    // Fall back to treating it as a run dir (will error in verifySingleRun with a clear message).
    expanded.push(abs);
  }

  // De-dupe while preserving order
  return [...new Set(expanded)];
}

function verifySingleRun(runDirAbs) {
  const runLabel = stableRunLabel(runDirAbs);
  const result = { run: runLabel, ok: false, hash_entries: 0 };

  try {
    if (!isDir(runDirAbs)) throw new Error("Run directory not found");

    const ledgerPath = path.join(runDirAbs, "ledger.jsonl");
    if (!exists(ledgerPath)) throw new Error("ledger.jsonl not found");

    const raw = fs.readFileSync(ledgerPath, "utf8");
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    let prevExpected = null;
    let groupCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Prefer JSONL (current format)
      if (line.startsWith("{")) {
        let obj;
        try {
          obj = JSON.parse(line);
        } catch {
          throw new Error(`Malformed JSON at line ${i + 1}`);
        }

        if (!obj || typeof obj !== "object") continue;

        if (obj.kind === "hash_chain") {
          result.hash_entries++;

          const artifact = obj.artifact;
          const sha = obj.sha256;
          const prev = obj.prev === undefined ? null : obj.prev;
          const head = obj.head;

          if (typeof artifact !== "string" || !artifact) throw new Error(`Malformed hash_chain at line ${i + 1}: missing artifact`);
          if (typeof sha !== "string" || !sha) throw new Error(`Malformed hash_chain at line ${i + 1}: missing sha256`);
          if (!(prev === null || typeof prev === "string")) throw new Error(`Malformed hash_chain at line ${i + 1}: invalid prev`);
          if (typeof head !== "string" || !head) throw new Error(`Malformed hash_chain at line ${i + 1}: missing head`);

          if (prev !== prevExpected) {
            throw new Error(`prev mismatch at line ${i + 1}: expected ${prevExpected}, got ${prev}`);
          }

          const artifactPath = path.join(runDirAbs, artifact);
          if (!exists(artifactPath)) {
            throw new Error(`Artifact missing for hash at line ${i + 1}: ${artifact}`);
          }

          const actual = sha256FileHex(artifactPath);
          if (actual !== sha) {
            throw new Error(`Hash mismatch for ${artifact}: expected ${sha}, got ${actual}`);
          }

          const expectedHead = computeHead(prevExpected, artifact, sha);
          if (expectedHead !== head) {
            throw new Error(`Head mismatch at line ${i + 1}: expected ${expectedHead}, got ${head}`);
          }

          prevExpected = head;
          continue;
        }

        if (obj.kind === "hash_chain_group") {
          groupCount++;
          if (typeof obj.head === "string" && prevExpected !== null && obj.head !== prevExpected) {
            throw new Error(`hash_chain_group head mismatch at line ${i + 1}: expected ${prevExpected}, got ${obj.head}`);
          }
          continue;
        }

        continue;
      }

      // Back-compat: pipe-delimited entries (older spec)
      if (line.startsWith("HASH_CHAIN")) {
        result.hash_entries++;

        const fields = parsePipeFields(line);
        const artifact = fields.artifact;
        const sha = fields.sha256;
        const prev = fields.prev === "null" ? null : fields.prev;

        if (!artifact || !sha) throw new Error(`Malformed HASH_CHAIN at line ${i + 1}`);

        if (prev !== prevExpected) {
          throw new Error(`prev mismatch at line ${i + 1}: expected ${prevExpected}, got ${prev}`);
        }

        const artifactPath = path.join(runDirAbs, artifact);
        if (!exists(artifactPath)) {
          throw new Error(`Artifact missing for hash at line ${i + 1}: ${artifact}`);
        }

        const actual = sha256FileHex(artifactPath);
        if (actual !== sha) {
          throw new Error(`Hash mismatch for ${artifact}: expected ${sha}, got ${actual}`);
        }

        // In pipe mode, we treat prev as previous sha (as spec'd), not head.
        prevExpected = sha;
        continue;
      }
    }

    // Keep a human-useful (but schema-stable) count without expanding schema unless needed.
    void groupCount;
    result.ok = true;
    return result;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    return result;
  }
}

function printJson(obj) {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const targets = args.filter((a) => a !== "--json");

  let runDirs;
  try {
    runDirs = expandTargets(targets);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (jsonMode) {
      printJson({ ok: false, summary: { verified: 0, failed: 0, hash_entries: 0 }, results: [], error: msg });
    } else {
      process.stderr.write(`VERIFY FAIL: ${msg}\n`);
    }
    process.exit(1);
  }

  const results = runDirs.map(verifySingleRun);
  const summary = {
    verified: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    hash_entries: results.reduce((n, r) => n + (r.hash_entries || 0), 0),
  };

  const okAll = summary.failed === 0;

  if (jsonMode) {
    printJson({ ok: okAll, summary, results });
  } else {
    for (const r of results) {
      if (r.ok) {
        process.stdout.write(`OK: ${r.run} (${r.hash_entries} hash entries)\n`);
      } else {
        process.stderr.write(`FAIL: ${r.run} — ${r.error}\n`);
      }
    }
    process.stdout.write(`Summary: ${summary.verified} verified, ${summary.failed} failed, ${summary.hash_entries} hashes\n`);
  }

  process.exit(okAll ? 0 : 1);
}

main();
