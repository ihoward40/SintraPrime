#!/usr/bin/env node

import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// Script is expected to run from the workspace root.
const WORKSPACE_ROOT = process.cwd();

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

function sha256HexOfBuffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha256HexOfText(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function tryGitDescribe() {
  try {
    const out = execFileSync('git', ['describe', '--tags', '--abbrev=0'], {
      cwd: WORKSPACE_ROOT,
      stdio: ['ignore', 'pipe', 'ignore']
    });
    return String(out).trim() || null;
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const out = {
    fromDir: null,
    destDir: 'analysis/notebooklm/source_set',
    allowMissing: false,
    freezeTag: null
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--from') out.fromDir = argv[++i] ?? null;
    else if (a === '--dest') out.destDir = argv[++i] ?? out.destDir;
    else if (a === '--allow-missing') out.allowMissing = true;
    else if (a === '--freeze-tag') out.freezeTag = argv[++i] ?? null;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }

  return out;
}

async function copyFileSha256(srcAbs, dstAbs) {
  const buf = await fs.readFile(srcAbs);
  const sha256 = sha256HexOfBuffer(buf);
  await fs.mkdir(path.dirname(dstAbs), { recursive: true });
  await fs.writeFile(dstAbs, buf);
  return sha256;
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    process.stdout.write(
      [
        'Usage:',
        '  node scripts/notebooklm/export-source-set.mjs --from <dir> [--dest <dir>]',
        '                                           [--freeze-tag <tag>] [--allow-missing]',
        '',
        'Notes:',
        '  - Copies an allowlist of post-freeze artifacts into <dest>/files/',
        '  - Writes <dest>/source_set.json and <dest>/source_set.json.sha256',
        '  - Does NOT modify any governed artifacts or execution paths',
        ''
      ].join('\n')
    );
    return;
  }

  if (!args.fromDir) {
    die(
      2,
      [
        '❌ NOTEBOOKLM EXPORT FAILED',
        'Reason: missing --from <dir>',
        'Example: node scripts/notebooklm/export-source-set.mjs --from dist/phaseX/public',
        ''
      ].join('\n')
    );
  }

  const allowlist = [
    'Exhibit_A_System_Overview.pdf',
    'Exhibit_B_Tier_Declaration_Sheet.pdf',
    'FINAL_EXHIBIT_BINDER.pdf',
    'runs.json',
    'runs.merkle.json',
    'tier_declaration.json',
    'binder_manifest.json'
  ];

  const fromAbs = path.resolve(WORKSPACE_ROOT, args.fromDir);
  const destAbs = path.resolve(WORKSPACE_ROOT, args.destDir);
  const filesAbs = path.join(destAbs, 'files');

  if (!(await pathExists(fromAbs))) {
    die(2, `❌ NOTEBOOKLM EXPORT FAILED\nReason: --from directory not found\nDir: ${toPosix(path.relative(WORKSPACE_ROOT, fromAbs))}`);
  }

  await fs.mkdir(filesAbs, { recursive: true });

  /** @type {{name: string, sha256: string|null, copied: boolean}[]} */
  const fileRows = [];

  for (const name of allowlist) {
    const srcAbs = path.join(fromAbs, name);
    const dstAbs = path.join(filesAbs, name);

    if (!(await pathExists(srcAbs))) {
      if (!args.allowMissing) {
        die(
          2,
          [
            '❌ NOTEBOOKLM EXPORT FAILED',
            'Reason: missing required source file',
            `File: ${name}`,
            `Searched: ${toPosix(path.relative(WORKSPACE_ROOT, srcAbs))}`,
            'Hint: re-run with --allow-missing to produce a partial source set',
            ''
          ].join('\n')
        );
      }
      fileRows.push({ name, sha256: null, copied: false });
      continue;
    }

    const sha256 = await copyFileSha256(srcAbs, dstAbs);
    fileRows.push({ name, sha256, copied: true });
  }

  const freezeTag = args.freezeTag ?? (await tryGitDescribe());

  const manifest = {
    version: 'notebooklm.source_set.export.v1',
    generated_at: new Date().toISOString(),
    purpose: 'NotebookLM read-only analysis',
    freeze_tag: freezeTag,
    from_dir: toPosix(path.relative(WORKSPACE_ROOT, fromAbs)),
    files: fileRows
  };

  const manifestAbs = path.join(destAbs, 'source_set.json');
  const canonical = JSON.stringify(manifest, null, 2) + '\n';
  await fs.writeFile(manifestAbs, canonical, 'utf8');

  const digest = sha256HexOfText(canonical);
  await fs.writeFile(manifestAbs + '.sha256', `${digest}  source_set.json\n`, 'utf8');

  process.stdout.write(
    [
      '✅ NOTEBOOKLM SOURCE SET EXPORTED',
      `From: ${toPosix(path.relative(WORKSPACE_ROOT, fromAbs))}`,
      `To: ${toPosix(path.relative(WORKSPACE_ROOT, destAbs))}`,
      `Manifest: ${toPosix(path.relative(WORKSPACE_ROOT, manifestAbs))}`,
      `Manifest SHA-256: ${digest}`
    ].join('\n') + '\n'
  );
}

await main();
