#!/usr/bin/env node

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { WORKSPACE_ROOT, collectPhaseXGovernedFiles } from './phaseX-freeze-scope.mjs';
import { createDeterministicZip } from './zip-deterministic.mjs';

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function die(code, message) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(code);
}

function nowIso() {
  return new Date().toISOString();
}

function toIsoZ(iso) {
  // Normalize to an ISO-8601 UTC string with trailing 'Z'.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return nowIso();
  return d.toISOString();
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

function tryGit(cmdArgs) {
  try {
    const out = execFileSync('git', cmdArgs, {
      cwd: WORKSPACE_ROOT,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return String(out).trim();
  } catch {
    return null;
  }
}

function getGitInfo() {
  const inside = tryGit(['rev-parse', '--is-inside-work-tree']);
  if (inside !== 'true') return { is_git: false, head: null, branch: null, dirty: null };

  const head = tryGit(['rev-parse', 'HEAD']);
  const branch = tryGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  const porcelain = tryGit(['status', '--porcelain']) ?? '';
  const dirty = porcelain.trim().length > 0;
  return { is_git: true, head, branch, dirty };
}

function parseArgs(argv) {
  const out = {
    lockPath: path.join(WORKSPACE_ROOT, 'governance', 'freeze', 'phaseX.lock.json'),
    outDir: path.join(WORKSPACE_ROOT, 'dist', 'phaseX'),
    zipName: 'ike-governance-phaseX.zip',
    createdAt: null,
    zipDate: '2000-01-01T00:00:00.000Z',
    allowDirty: false
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lock') out.lockPath = path.resolve(WORKSPACE_ROOT, argv[++i] ?? '');
    else if (a === '--out-dir') out.outDir = path.resolve(WORKSPACE_ROOT, argv[++i] ?? '');
    else if (a === '--zip-name') out.zipName = argv[++i] ?? out.zipName;
    else if (a === '--created-at') out.createdAt = argv[++i] ?? null;
    else if (a === '--zip-date') out.zipDate = argv[++i] ?? out.zipDate;
    else if (a === '--allow-dirty') out.allowDirty = true;
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
        '  node scripts/phaseX-freeze.mjs [--allow-dirty] [--created-at <iso>] [--zip-date <iso>]',
        '                             [--lock <path>] [--out-dir <dir>] [--zip-name <name>]',
        '',
        'Defaults:',
        '  --lock governance/freeze/phaseX.lock.json',
        '  --out-dir dist/phaseX',
        '  --zip-name ike-governance-phaseX.zip',
        '  --zip-date 2000-01-01T00:00:00.000Z',
        ''
      ].join('\n')
    );
    return;
  }

  const git = getGitInfo();
  if (git.is_git && git.dirty && !args.allowDirty) {
    die(
      2,
      [
        '❌ PHASE X FREEZE FAILED',
        'Reason: git working tree is dirty',
        'Fix: commit your changes (or use --allow-dirty for a draft)',
        ''
      ].join('\n')
    );
  }

  const createdAt = toIsoZ(args.createdAt ?? nowIso());
  const zipDate = new Date(args.zipDate);
  if (Number.isNaN(zipDate.getTime())) {
    die(2, `❌ PHASE X FREEZE FAILED\nReason: invalid --zip-date: ${args.zipDate}`);
  }

  const governedFiles = await collectPhaseXGovernedFiles({ workspaceRoot: WORKSPACE_ROOT });
  if (governedFiles.length === 0) {
    die(2, '❌ PHASE X FREEZE FAILED\nReason: no governed files detected by scope');
  }

  /** @type {{path: string, sha256: string, size: number}[]} */
  const fileEntries = [];
  for (const relPosix of governedFiles) {
    const abs = path.join(WORKSPACE_ROOT, relPosix);
    const st = await fs.stat(abs);
    fileEntries.push({
      path: relPosix,
      sha256: sha256HexOfFile(abs),
      size: st.size
    });
  }

  fileEntries.sort((a, b) => a.path.localeCompare(b.path));
  const rootLines = fileEntries.map((e) => `${e.sha256}  ${e.path}`).join('\n') + '\n';
  const rootHash = sha256HexOfText(rootLines);

  const scopeDefPath = 'scripts/phaseX-freeze-scope.mjs';
  const scopeDefAbs = path.join(WORKSPACE_ROOT, scopeDefPath);
  const scopeDefSha = (await fs
    .access(scopeDefAbs)
    .then(() => sha256HexOfFile(scopeDefAbs))
    .catch(() => null)) ?? null;

  const lockDoc = {
    phase: 'X',
    lock_version: 'phaseX.lock.v1',
    created_utc: createdAt,
    created_at: createdAt,
    git: {
      ...git,
      tree_clean: git?.dirty === null ? null : !git.dirty
    },
    scope_definition: {
      path: scopeDefPath,
      sha256: scopeDefSha
    },
    scope: {
      note: 'Governed surface snapshot for Notion → Make → Slack chain.',
      file_count: fileEntries.length,
      root_hash_sha256: rootHash
    },
    bundle: {
      filename: args.zipName,
      path: toPosix(path.join('dist/phaseX', args.zipName)),
      sha256: null,
      byte_size: null,
      zip_date_fixed_utc: zipDate.toISOString()
    },
    timestamp: {
      rfc3161: false,
      tsa_url: null,
      tsa_serial: null,
      tsr_path: null,
      tsr_sha256: null,
      timestamp_utc: null
    },
    // Back-compat field used by the verifier.
    files: fileEntries,
    // Operator-friendly alias.
    inputs: fileEntries.map((e) => ({ ...e, role: inferRole(e.path) }))
  };

  await fs.mkdir(path.dirname(args.lockPath), { recursive: true });
  await fs.writeFile(args.lockPath, JSON.stringify(lockDoc, null, 2) + '\n', 'utf8');

  // Convenience output for RFC-3161 timestamp requests.
  await fs.writeFile(
    path.join(WORKSPACE_ROOT, 'governance', 'freeze', 'phaseX.roothash.txt'),
    `${rootHash}\n`,
    'utf8'
  );

  // Create a zip bundle including the lock file + all governed files.
  const zipAbs = path.join(args.outDir, args.zipName);
  const zipFiles = [
    // Lock file first, then governed files.
    toPosix(path.relative(WORKSPACE_ROOT, args.lockPath)),
    ...governedFiles
  ];

  // Deduplicate and stable-sort.
  const zipSet = Array.from(new Set(zipFiles)).sort((a, b) => a.localeCompare(b));

  await zipDeterministic({ filesRel: zipSet, zipAbs, fixedDate: zipDate });

  const zipSha = sha256HexOfFile(zipAbs);
  const zipSt = await fs.stat(zipAbs);
  lockDoc.bundle.sha256 = zipSha;
  lockDoc.bundle.byte_size = zipSt.size;
  const zipSidecar = `${zipAbs}.sha256`;
  await fs.writeFile(zipSidecar, `${zipSha}  ${path.basename(zipAbs)}\n`, 'utf8');

  // Rewrite lock with bundle details populated.
  await fs.writeFile(args.lockPath, JSON.stringify(lockDoc, null, 2) + '\n', 'utf8');

  process.stdout.write(
    [
      `✅ PHASE X FREEZE COMPLETE`,
      `Lock: ${toPosix(path.relative(WORKSPACE_ROOT, args.lockPath))}`,
      `Root hash: ${rootHash}`,
      `ZIP: ${toPosix(path.relative(WORKSPACE_ROOT, zipAbs))}`,
      `ZIP SHA-256: ${zipSha}`
    ].join('\n') + '\n'
  );
}

function inferRole(relPosix) {
  if (relPosix === 'docs/notion-button-webhook-contract.md') return 'contract';
  if (relPosix.startsWith('notion/schemas/')) return 'notion-schema';
  if (relPosix.startsWith('notion/migrations/')) return 'notion-migration';
  if (relPosix.startsWith('governance/make-lint/lint_profiles/')) return 'lint-profile';
  if (relPosix.startsWith('scenarios/') && relPosix.endsWith('.lint.json')) return 'scenario-declaration';
  if (relPosix.startsWith('make-gmail-slack-automation/templates/') && relPosix.endsWith('.json')) return 'make-template';
  if (relPosix.startsWith('slack/workflows/') && relPosix.endsWith('.json')) return 'slack-workflow';
  if (relPosix.startsWith('scripts/') && relPosix.endsWith('.mjs')) return 'validator-script';
  if (relPosix.startsWith('docs/') && relPosix.endsWith('.md')) return 'documentation';
  return 'governed-file';
}

await main();
