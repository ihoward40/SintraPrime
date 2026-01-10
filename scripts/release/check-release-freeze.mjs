#!/usr/bin/env node

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const WORKSPACE_ROOT = process.cwd();
const LOCK_PATH = path.join(WORKSPACE_ROOT, 'governance', 'freeze', 'release.lock.json');

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function die(code, message) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(code);
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

async function main() {
  if (!(await pathExists(LOCK_PATH))) {
    console.log('ℹ️ Release freeze verify: no release.lock.json present (skipping).');
    process.exit(0);
  }

  const lock = await readJson(LOCK_PATH);
  const zipRel = String(lock?.artifact?.path ?? '').trim();
  const expectedZipSha = String(lock?.artifact?.sha256 ?? '').trim();

  if (!zipRel || !expectedZipSha) {
    die(2, '❌ RELEASE FREEZE VERIFY FAILED\nReason: lock missing artifact.path or artifact.sha256');
  }

  // Rebuild the bundle deterministically, but do not overwrite committed artifacts.
  const tmpOutDir = path.join(WORKSPACE_ROOT, 'governance', 'freeze', '_out', 'release-verify');
  const tmpZip = path.join(WORKSPACE_ROOT, 'dist', 'phaseX', '_out', 'release.bundle.zip');
  try {
    execFileSync(
      'node',
      [
        'scripts/release/build-release-bundle.mjs',
        '--release-id',
        String(lock?.release_id ?? 'governance-release-v1.0'),
        '--out',
        tmpZip,
        '--out-dir',
        tmpOutDir
      ],
      {
      cwd: WORKSPACE_ROOT,
        stdio: ['ignore', 'ignore', 'pipe']
      }
    );
  } catch (e) {
    die(2, `❌ RELEASE FREEZE VERIFY FAILED\nReason: rebuild failed\nDetail: ${e?.message ?? e}`);
  }

  if (!(await pathExists(tmpZip))) {
    die(2, `❌ RELEASE FREEZE VERIFY FAILED\nReason: missing rebuilt artifact\nFile: ${zipRel}`);
  }

  const actualZipSha = sha256HexOfFile(tmpZip);
  if (actualZipSha !== expectedZipSha) {
    die(1, `❌ RELEASE FREEZE VERIFY FAILED\nReason: bundle SHA drift\nExpected: ${expectedZipSha}\nActual:   ${actualZipSha}`);
  }

  // RFC-3161 evidence gate (if configured).
  const tsrRel = String(lock?.rfc3161?.tsr_path ?? '').trim();
  const tsrSha = String(lock?.rfc3161?.tsr_sha256 ?? '').trim();
  const tsaUrl = String(lock?.rfc3161?.tsa_url ?? '').trim();

  const wantsTsaEvidence = Boolean(tsrRel || tsrSha || tsaUrl);
  if (wantsTsaEvidence) {
    if (!tsrRel) {
      die(1, '❌ RELEASE FREEZE VERIFY FAILED\nReason: lock missing rfc3161.tsr_path');
    }
    const tsrAbs = path.join(WORKSPACE_ROOT, tsrRel);
    if (!(await pathExists(tsrAbs))) {
      die(1, `❌ RELEASE FREEZE VERIFY FAILED\nReason: missing RFC-3161 TSR\nFile: ${tsrRel}`);
    }

    const actualTsrSha = sha256HexOfFile(tsrAbs);
    if (!tsrSha) {
      die(1, '❌ RELEASE FREEZE VERIFY FAILED\nReason: lock missing rfc3161.tsr_sha256');
    }
    if (actualTsrSha !== tsrSha) {
      die(1, `❌ RELEASE FREEZE VERIFY FAILED\nReason: TSR sha drift\nExpected: ${tsrSha}\nActual:   ${actualTsrSha}`);
    }

    if (!tsaUrl) {
      die(1, '❌ RELEASE FREEZE VERIFY FAILED\nReason: lock missing rfc3161.tsa_url');
    }
  }

  console.log(`✅ RELEASE FREEZE VERIFIED\nLock: ${toPosix(path.relative(WORKSPACE_ROOT, LOCK_PATH))}`);
}

await main();
