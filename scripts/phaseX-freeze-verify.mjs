#!/usr/bin/env node

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WORKSPACE_ROOT, collectPhaseXGovernedFiles } from './phaseX-freeze-scope.mjs';

const LOCK_PATH = path.join(WORKSPACE_ROOT, 'governance', 'freeze', 'phaseX.lock.json');

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function die(code, message) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(code);
}

function sha256HexOfFile(absPath) {
  const hash = crypto.createHash('sha256');
  const fd = fssync.openSync(absPath, 'r');
  try {
    const buf = Buffer.allocUnsafe(1024 * 1024);
    while (true) {
      const bytesRead = fssync.readSync(fd, buf, 0, buf.length, null);
      if (bytesRead <= 0) break;
      hash.update(buf.subarray(0, bytesRead));
    }
  } finally {
    fssync.closeSync(fd);
  }
  return hash.digest('hex');
}

function sha256HexOfText(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(absPath) {
  const raw = await fs.readFile(absPath, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  if (!(await pathExists(LOCK_PATH))) {
    // eslint-disable-next-line no-console
    console.log('ℹ️ Phase X freeze verify: no lock file present (skipping).');
    process.exit(0);
  }

  const lock = await readJson(LOCK_PATH);

  // Optional strict mode: require external timestamp metadata to be present in the lock.
  const REQUIRE_TIMESTAMP = process.env.PHASEX_REQUIRE_TIMESTAMP === '1';
  if (REQUIRE_TIMESTAMP) {
    const ts = lock?.timestamp ?? null;
    const hasTsr = Boolean(String(ts?.tsr_sha256 ?? '').trim() && String(ts?.tsr_path ?? '').trim());
    const hasSerial = Boolean(String(ts?.tsa_serial ?? '').trim());
    const rfc3161 = ts?.rfc3161 === true;
    if (!ts || !rfc3161 || (!hasTsr && !hasSerial)) {
      die(
        1,
        [
          '❌ PHASE X FREEZE VERIFY FAILED',
          'Reason: timestamp-required mode enabled but lock has no RFC-3161 evidence',
          'Hint: set lock.timestamp.rfc3161=true and populate tsr_path+tsr_sha256 (or tsa_serial)',
          'Env: PHASEX_REQUIRE_TIMESTAMP=1'
        ].join('\n')
      );
    }
  }
  const lockFiles = Array.isArray(lock?.files) ? lock.files : null;
  if (!lockFiles) {
    die(2, '❌ PHASE X FREEZE VERIFY FAILED\nReason: lock missing files[]');
  }

  const expectedPaths = lockFiles.map((f) => String(f?.path ?? '')).filter((p) => p.length > 0);
  const expectedSet = new Set(expectedPaths);

  const actualPaths = await collectPhaseXGovernedFiles({ workspaceRoot: WORKSPACE_ROOT });
  const actualSet = new Set(actualPaths);

  // Ensure bijection: no missing + no extras.
  for (const p of actualPaths) {
    if (!expectedSet.has(p)) {
      die(1, `❌ PHASE X FREEZE VERIFY FAILED\nReason: scope drift (new governed file not in lock)\nFile: ${p}`);
    }
  }
  for (const p of expectedPaths) {
    if (!actualSet.has(p)) {
      die(1, `❌ PHASE X FREEZE VERIFY FAILED\nReason: scope drift (locked file no longer governed)\nFile: ${p}`);
    }
  }

  /** @type {{path: string, sha256: string}[]} */
  const recomputed = [];

  for (const p of expectedPaths) {
    const abs = path.join(WORKSPACE_ROOT, p);
    if (!(await pathExists(abs))) {
      die(1, `❌ PHASE X FREEZE VERIFY FAILED\nReason: missing file\nFile: ${p}`);
    }
    recomputed.push({ path: p, sha256: sha256HexOfFile(abs) });
  }

  recomputed.sort((a, b) => a.path.localeCompare(b.path));

  // Compare file hashes.
  const lockMap = new Map();
  for (const f of lockFiles) {
    const p = String(f?.path ?? '');
    if (!p) continue;
    lockMap.set(p, String(f?.sha256 ?? ''));
  }

  for (const r of recomputed) {
    const expected = lockMap.get(r.path);
    if (!expected) {
      die(1, `❌ PHASE X FREEZE VERIFY FAILED\nReason: lock missing sha256\nFile: ${r.path}`);
    }
    if (expected !== r.sha256) {
      die(1, `❌ PHASE X FREEZE VERIFY FAILED\nReason: sha256 mismatch\nFile: ${r.path}`);
    }
  }

  const rootLines = recomputed.map((e) => `${e.sha256}  ${e.path}`).join('\n') + '\n';
  const rootHash = sha256HexOfText(rootLines);
  const lockedRoot = String(lock?.scope?.root_hash_sha256 ?? '');
  if (!lockedRoot) {
    die(2, '❌ PHASE X FREEZE VERIFY FAILED\nReason: lock missing scope.root_hash_sha256');
  }
  if (lockedRoot !== rootHash) {
    die(1, '❌ PHASE X FREEZE VERIFY FAILED\nReason: root hash mismatch');
  }

  // eslint-disable-next-line no-console
  console.log(
    `✅ PHASE X FREEZE VERIFIED (${recomputed.length} files)\nLock: ${toPosix(path.relative(WORKSPACE_ROOT, LOCK_PATH))}`
  );
}

await main();
