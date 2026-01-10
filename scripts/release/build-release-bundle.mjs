#!/usr/bin/env node

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WORKSPACE_ROOT, collectPhaseXGovernedFiles } from '../phaseX-freeze-scope.mjs';
import { createDeterministicZip } from '../zip-deterministic.mjs';

function toPosix(p) {
  return p.replace(/\\/g, '/');
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

function parseArgs(argv) {
  const out = {
    outZip: path.join(WORKSPACE_ROOT, 'dist', 'phaseX', 'release.bundle.zip'),
    outDir: path.join(WORKSPACE_ROOT, 'governance', 'freeze'),
    releaseId: 'governance-release-v1.0',
    zipDate: '2000-01-01T00:00:00.000Z'
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') out.outZip = path.resolve(WORKSPACE_ROOT, argv[++i] ?? '');
    else if (a === '--out-dir') out.outDir = path.resolve(WORKSPACE_ROOT, argv[++i] ?? '');
    else if (a === '--release-id') out.releaseId = argv[++i] ?? out.releaseId;
    else if (a === '--zip-date') out.zipDate = argv[++i] ?? out.zipDate;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }

  return out;
}

async function zipDeterministic({ filesRel, zipAbs, fixedDate }) {
  await createDeterministicZip({ workspaceRoot: WORKSPACE_ROOT, filesRel, zipAbs, fixedDate });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(
      [
        'Usage:',
        '  node scripts/release/build-release-bundle.mjs [--release-id <id>] [--out <zip>] [--out-dir <dir>] [--zip-date <iso>]',
        '',
        'Outputs:',
        '  governance/freeze/hashes.json',
        '  governance/freeze/hashes.sha256.txt',
        '  governance/freeze/release.lock.json',
        ''
      ].join('\n') + '\n'
    );
    return;
  }

  const fixedDate = new Date(args.zipDate);
  if (Number.isNaN(fixedDate.getTime())) throw new Error(`Invalid --zip-date: ${args.zipDate}`);

  const governed = await collectPhaseXGovernedFiles({ workspaceRoot: WORKSPACE_ROOT });
  // Always include the Phase X lock if present.
  const lockRel = 'governance/freeze/phaseX.lock.json';
  const hasLock = await fs
    .access(path.join(WORKSPACE_ROOT, lockRel))
    .then(() => true)
    .catch(() => false);

  const filesRel = Array.from(new Set([...(hasLock ? [lockRel] : []), ...governed])).sort((a, b) => a.localeCompare(b));
  await zipDeterministic({ filesRel, zipAbs: args.outZip, fixedDate });

  // Compute file map + roothash across the governed file list (not the zip).
  const entries = [];
  for (const relPosix of filesRel) {
    const abs = path.join(WORKSPACE_ROOT, relPosix);
    const st = await fs.stat(abs);
    entries.push({ path: relPosix, sha256: sha256HexOfFile(abs), size: st.size });
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const rootLines = entries.map((e) => `${e.sha256}  ${e.path}`).join('\n') + '\n';
  const rootHash = sha256HexOfText(rootLines);

  const zipSha = sha256HexOfFile(args.outZip);

  await fs.mkdir(args.outDir, { recursive: true });

  const hashesJson = {
    release_id: args.releaseId,
    artifact: path.basename(args.outZip),
    artifact_sha256: zipSha,
    governed_root_hash_sha256: rootHash,
    generated_at: new Date().toISOString(),
    files: entries
  };

  const hashesPath = path.join(args.outDir, 'hashes.json');
  await fs.writeFile(hashesPath, JSON.stringify(hashesJson, null, 2) + '\n', 'utf8');

  const hashesTxtPath = path.join(args.outDir, 'hashes.sha256.txt');
  await fs.writeFile(hashesTxtPath, `${zipSha}  ${path.basename(args.outZip)}\n`, 'utf8');

  const lockPath = path.join(args.outDir, 'release.lock.json');
  const lock = {
    release_id: args.releaseId,
    artifact: {
      path: toPosix(path.relative(WORKSPACE_ROOT, args.outZip)),
      sha256: zipSha
    },
    governed_root_hash_sha256: rootHash,
    hashes: {
      hashes_json: toPosix(path.relative(WORKSPACE_ROOT, hashesPath)),
      hashes_sha256_txt: toPosix(path.relative(WORKSPACE_ROOT, hashesTxtPath))
    },
    rfc3161: {
      tsa_url: null,
      tsr_path: null,
      tsr_sha256: null,
      timestamp_utc: null,
      serial: null
    }
  };
  await fs.writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');

  process.stdout.write(
    [
      '✅ RELEASE BUNDLE BUILT',
      `ZIP: ${toPosix(path.relative(WORKSPACE_ROOT, args.outZip))}`,
      `ZIP SHA-256: ${zipSha}`,
      `Lock: ${toPosix(path.relative(WORKSPACE_ROOT, lockPath))}`,
      `Hashes: ${toPosix(path.relative(WORKSPACE_ROOT, hashesPath))}`
    ].join('\n') + '\n'
  );
}

await main();
