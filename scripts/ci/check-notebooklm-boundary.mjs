#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

// CI runs this script from the workspace root.
const WORKSPACE_ROOT = process.cwd();

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function die(code, message) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(code);
}

async function readUtf8IfExists(absPath) {
  try {
    return await fs.readFile(absPath, 'utf8');
  } catch {
    return null;
  }
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

function isUnder(relPosix, prefixPosix) {
  return relPosix === prefixPosix || relPosix.startsWith(`${prefixPosix}/`);
}

function shouldScan(relPosix) {
  // Skip analysis + docs + policy content by design.
  if (isUnder(relPosix, 'analysis/notebooklm')) return false;
  if (isUnder(relPosix, 'docs')) return false;
  if (isUnder(relPosix, 'governance/policies')) return false;

  // Skip NotebookLM helper tooling (allowed to reference analysis/notebooklm).
  if (isUnder(relPosix, 'scripts/notebooklm')) return false;
  if (relPosix === 'scripts/export-notebooklm-sources.ps1') return false;
  if (relPosix === 'scripts/ci/check-notebooklm-boundary.mjs') return false;

  // Scan only execution-ish file types.
  return (
    relPosix.endsWith('.mjs') ||
    relPosix.endsWith('.js') ||
    relPosix.endsWith('.ps1') ||
    relPosix.endsWith('.yml') ||
    relPosix.endsWith('.yaml') ||
    relPosix.endsWith('.json')
  );
}

async function main() {
  const forbidden = ['analysis/notebooklm/', 'analysis\\\\notebooklm\\\\'];

  // Scan “execution-ish” surfaces that must not reference NotebookLM outputs.
  const scanRoots = [
    'build_snapshot.ps1',
    '.github/workflows',
    'scripts',
    'deepthink',
    'make',
    'agent-mode-engine/scripts',
    'agent-mode-engine/deepthink'
  ];

  const hits = [];

  /** @type {string[]} */
  const targets = [];

  for (const rootRel of scanRoots) {
    const rootAbs = path.join(WORKSPACE_ROOT, rootRel);
    const stat = await fs.stat(rootAbs).catch(() => null);
    if (!stat) continue;

    if (stat.isFile()) {
      targets.push(rootRel);
      continue;
    }

    if (stat.isDirectory()) {
      const filesAbs = await listFilesRecursive(rootAbs);
      for (const abs of filesAbs) {
        const relPosix = toPosix(path.relative(WORKSPACE_ROOT, abs));
        if (!relPosix || relPosix.startsWith('..')) continue;
        if (!shouldScan(relPosix)) continue;
        targets.push(relPosix);
      }
    }
  }

  targets.sort((a, b) => a.localeCompare(b));

  for (const relPosix of targets) {
    const abs = path.join(WORKSPACE_ROOT, relPosix);
    const text = await readUtf8IfExists(abs);
    if (text === null) continue;

    for (const needle of forbidden) {
      if (text.includes(needle)) {
        hits.push({ file: relPosix, needle });
      }
    }
  }

  if (hits.length > 0) {
    const lines = hits.map((h) => `- ${h.file} contains ${JSON.stringify(h.needle)}`);
    die(
      1,
      [
        '❌ NOTEBOOKLM BOUNDARY CHECK FAILED',
        'Reason: execution tooling must not reference analysis/notebooklm outputs',
        ...lines,
        '',
        'Policy: governance/policies/notebooklm.readonly.md'
      ].join('\n')
    );
  }

  process.stdout.write(
    [
      '✅ NOTEBOOKLM BOUNDARY CHECK OK',
      `Checked: ${targets.length} target(s)`,
      'No execution-path references to analysis/notebooklm/**'
    ].join('\n') + '\n'
  );
}

await main();
