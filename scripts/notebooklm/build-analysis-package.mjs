#!/usr/bin/env node

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createDeterministicZip } from '../zip-deterministic.mjs';

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

async function listFilesRecursive(dirAbs) {
  /** @type {string[]} */
  const out = [];
  const entries = await fs.readdir(dirAbs, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const abs = path.join(dirAbs, e.name);
    if (e.isDirectory()) out.push(...(await listFilesRecursive(abs)));
    else if (e.isFile()) out.push(abs);
  }
  return out;
}

async function ensureEmptyDir(absDir) {
  await fs.rm(absDir, { recursive: true, force: true });
  await fs.mkdir(absDir, { recursive: true });
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
    freezeTag: null,
    sourceSetDir: 'analysis/notebooklm/source_set',
    outDir: 'dist/notebooklm',
    zipDate: '2000-01-01T00:00:00.000Z',
    summariesDir: 'analysis/notebooklm/summaries',
    expertTablesDir: 'analysis/notebooklm/expert_tables',
    qaDir: 'analysis/notebooklm/qa_exports'
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--freeze-tag') out.freezeTag = argv[++i] ?? null;
    else if (a === '--source-set') out.sourceSetDir = argv[++i] ?? out.sourceSetDir;
    else if (a === '--out-dir') out.outDir = argv[++i] ?? out.outDir;
    else if (a === '--zip-date') out.zipDate = argv[++i] ?? out.zipDate;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }

  return out;
}

async function pickFirstTextFile(dirAbs) {
  const entries = await fs.readdir(dirAbs, { withFileTypes: true }).catch(() => []);
  const names = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => n.toLowerCase().endsWith('.txt') || n.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));

  if (names.length === 0) return null;
  return path.join(dirAbs, names[0]);
}

async function writeAnalyticalFile(dstAbs, srcAbsOrNull, titleLine) {
  const header = 'Analytical summary generated from hashed, read-only sources. Not evidence.\n';
  if (!srcAbsOrNull) {
    await fs.writeFile(dstAbs, header + `\n${titleLine}\n\n(placeholder)\n`, 'utf8');
    return;
  }
  const src = await fs.readFile(srcAbsOrNull, 'utf8');
  const body = src.startsWith('Analytical') ? src : header + '\n' + src;
  await fs.writeFile(dstAbs, body, 'utf8');
}

async function copyDirRecursive(srcAbs, dstAbs) {
  const stat = await fs.stat(srcAbs).catch(() => null);
  if (!stat || !stat.isDirectory()) return;
  await fs.mkdir(dstAbs, { recursive: true });

  const entries = await fs.readdir(srcAbs, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(srcAbs, e.name);
    const d = path.join(dstAbs, e.name);
    if (e.isDirectory()) await copyDirRecursive(s, d);
    else if (e.isFile()) await fs.copyFile(s, d);
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    process.stdout.write(
      [
        'Usage:',
        '  npm run -s notebooklm:build-analysis-package -- --freeze-tag <tag>',
        'Options:',
        '  --source-set <dir>   (default: analysis/notebooklm/source_set)',
        '  --out-dir <dir>      (default: dist/notebooklm)',
        '  --zip-date <iso>     (default: 2000-01-01T00:00:00.000Z)',
        ''
      ].join('\n')
    );
    return;
  }

  const freezeTag = args.freezeTag ?? tryGitDescribe() ?? 'untagged';

  const sourceSetAbs = path.resolve(WORKSPACE_ROOT, args.sourceSetDir);
  const sourceSetJson = path.join(sourceSetAbs, 'source_set.json');
  const sourceSetSha = sourceSetJson + '.sha256';

  if (!(await pathExists(sourceSetJson)) || !(await pathExists(sourceSetSha))) {
    die(
      2,
      [
        '❌ NOTEBOOKLM PACKAGE BUILD FAILED',
        'Reason: missing source_set.json or source_set.json.sha256',
        `Expected: ${toPosix(path.relative(WORKSPACE_ROOT, sourceSetJson))}`,
        `Expected: ${toPosix(path.relative(WORKSPACE_ROOT, sourceSetSha))}`,
        'Hint: run notebooklm:export-source-set and/or notebooklm:pin-source-set first',
        ''
      ].join('\n')
    );
  }

  const zipDate = new Date(args.zipDate);
  if (Number.isNaN(zipDate.getTime())) {
    die(2, `❌ NOTEBOOKLM PACKAGE BUILD FAILED\nReason: invalid --zip-date: ${args.zipDate}`);
  }

  const outDirAbs = path.resolve(WORKSPACE_ROOT, args.outDir);
  const stageAbs = path.join(outDirAbs, 'NotebookLM_Analysis_Package');

  await ensureEmptyDir(stageAbs);

  // README.txt (verbatim)
  const readme =
    'This package contains a read-only source set and optional analytical summaries.\n\n' +
    'The source_set/ directory defines the complete, hashed set of files provided\n' +
    'to NotebookLM for analysis. The file source_set.json.sha256 verifies that list.\n\n' +
    'The notebooklm_outputs/ directory contains analytical summaries generated from\n' +
    'those sources. These outputs are not evidence and do not modify the source files.\n\n' +
    'No private keys, execution scripts, or pre-freeze artifacts are included.\n';

  await fs.writeFile(path.join(stageAbs, 'README.txt'), readme, 'utf8');

  // Copy source_set/
  await copyDirRecursive(sourceSetAbs, path.join(stageAbs, 'source_set'));

  // Build notebooklm_outputs/
  const outputsAbs = path.join(stageAbs, 'notebooklm_outputs');
  await fs.mkdir(outputsAbs, { recursive: true });

  const judgePick = await pickFirstTextFile(path.resolve(WORKSPACE_ROOT, args.summariesDir));
  const expertPick = await pickFirstTextFile(path.resolve(WORKSPACE_ROOT, args.expertTablesDir));
  const qaPick = await pickFirstTextFile(path.resolve(WORKSPACE_ROOT, args.qaDir));

  await writeAnalyticalFile(path.join(outputsAbs, 'judge_summary.txt'), judgePick, 'Judge summary');
  await writeAnalyticalFile(path.join(outputsAbs, 'expert_artifact_map.txt'), expertPick, 'Expert artifact map');
  await writeAnalyticalFile(path.join(outputsAbs, 'qa_log.txt'), qaPick, 'Q&A log');

  // Deterministic zip
  const zipName = `NotebookLM_Analysis_Package_${freezeTag}.zip`;
  const zipAbs = path.join(outDirAbs, zipName);

  const stageFilesAbs = await listFilesRecursive(stageAbs);
  const filesRel = stageFilesAbs
    .map((abs) => toPosix(path.relative(WORKSPACE_ROOT, abs)))
    .filter((rel) => rel && !rel.startsWith('..'))
    .sort((a, b) => a.localeCompare(b));

  await createDeterministicZip({ workspaceRoot: WORKSPACE_ROOT, filesRel, zipAbs, fixedDate: zipDate });

  const zipSha = sha256HexOfFile(zipAbs);
  await fs.writeFile(zipAbs + '.sha256', `${zipSha}  ${path.basename(zipAbs)}\n`, 'utf8');

  process.stdout.write(
    [
      '✅ NOTEBOOKLM ANALYSIS PACKAGE BUILT',
      `Freeze tag: ${freezeTag}`,
      `ZIP: ${toPosix(path.relative(WORKSPACE_ROOT, zipAbs))}`,
      `ZIP SHA-256: ${zipSha}`
    ].join('\n') + '\n'
  );
}

await main();
