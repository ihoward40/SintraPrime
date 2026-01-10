#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const WORKSPACE_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

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

async function main() {
  const forbidden = ['analysis/notebooklm/', 'analysis\\\\notebooklm\\\\'];

  // “Execution-ish” surfaces that must not reference NotebookLM outputs.
  const targets = [
    'build_snapshot.ps1',
    'scripts/phaseX-freeze.mjs',
    'scripts/phaseX-freeze-verify.mjs',
    'deepthink/tiers/detect-tiers.mjs',
    'deepthink/tiers/verify-tier-declaration.mjs',
    'agent-mode-engine/deepthink/src/deepthink.mjs',
    'agent-mode-engine/scripts/dev.mjs'
  ];

  const hits = [];

  for (const rel of targets) {
    const abs = path.join(WORKSPACE_ROOT, rel);
    const text = await readUtf8IfExists(abs);
    if (text === null) continue;

    for (const needle of forbidden) {
      if (text.includes(needle)) {
        hits.push({ file: rel, needle });
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
        'Policy: governance/policies/notebooklm.no-action.md'
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
