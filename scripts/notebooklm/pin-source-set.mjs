#!/usr/bin/env node

import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';

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

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

async function main() {
  const argRel = process.argv[2] ?? null;

  const preferred = 'analysis/notebooklm/source_set/source_set.json';
  const legacy = 'analysis/notebooklm/source_set.json';

  const rel = argRel ?? ((await pathExists(path.resolve(WORKSPACE_ROOT, preferred))) ? preferred : legacy);
  const abs = path.resolve(WORKSPACE_ROOT, rel);

  if (!(await pathExists(abs))) {
    die(2, `❌ NotebookLM pin-source-set failed\nReason: file not found\nFile: ${toPosix(path.relative(WORKSPACE_ROOT, abs))}`);
  }

  const raw = await fs.readFile(abs, 'utf8');
  const parsed = JSON.parse(raw);

  // Canonicalize: stable stringify with 2-space indent and trailing newline.
  const canonical = JSON.stringify(parsed, null, 2) + '\n';
  await fs.writeFile(abs, canonical, 'utf8');

  const digest = sha256Hex(canonical);
  const sidecarAbs = abs + '.sha256';
  const base = path.basename(abs);
  await fs.writeFile(sidecarAbs, `${digest}  ${base}\n`, 'utf8');

  process.stdout.write(
    [
      '✅ NOTEBOOKLM SOURCE SET PINNED',
      `File: ${toPosix(path.relative(WORKSPACE_ROOT, abs))}`,
      `SHA-256: ${digest}`
    ].join('\n') + '\n'
  );
}

await main();
