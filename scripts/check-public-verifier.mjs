#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const WORKSPACE_ROOT = process.cwd();
const INDEX_PATH = path.join(WORKSPACE_ROOT, 'public-verifier', 'index.json');

function die(code, message) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(code);
}

function isIsoDate(s) {
  const d = new Date(s);
  return !Number.isNaN(d.getTime()) && String(s).includes('T');
}

function isSha256Hex(s) {
  return /^[0-9a-f]{64}$/.test(String(s || '').trim().toLowerCase());
}

async function main() {
  try {
    await fs.access(INDEX_PATH);
  } catch {
    die(2, '❌ PUBLIC VERIFIER CHECK FAILED\nReason: missing public-verifier/index.json');
  }

  let doc;
  try {
    doc = JSON.parse(await fs.readFile(INDEX_PATH, 'utf8'));
  } catch (e) {
    die(2, `❌ PUBLIC VERIFIER CHECK FAILED\nReason: invalid JSON\nDetail: ${e?.message ?? e}`);
  }

  const artifacts = Array.isArray(doc?.artifacts) ? doc.artifacts : null;
  if (!artifacts) {
    die(2, '❌ PUBLIC VERIFIER CHECK FAILED\nReason: index.json missing artifacts[]');
  }

  const seenIds = new Set();
  const seenShas = new Set();

  let lastDate = null;

  for (let i = 0; i < artifacts.length; i++) {
    const a = artifacts[i];
    const id = String(a?.id ?? '').trim();
    const sha = String(a?.sha256 ?? '').trim().toLowerCase();
    const url = String(a?.url ?? '').trim();
    const createdAt = String(a?.created_at ?? '').trim();

    if (!id) die(2, `❌ PUBLIC VERIFIER CHECK FAILED\nReason: artifact missing id\nIndex: ${i}`);
    if (seenIds.has(id)) die(2, `❌ PUBLIC VERIFIER CHECK FAILED\nReason: duplicate artifact id\nId: ${id}`);
    seenIds.add(id);

    if (!url) die(2, `❌ PUBLIC VERIFIER CHECK FAILED\nReason: artifact missing url\nId: ${id}`);

    if (!sha || !isSha256Hex(sha)) die(2, `❌ PUBLIC VERIFIER CHECK FAILED\nReason: invalid sha256\nId: ${id}`);
    if (seenShas.has(sha)) die(2, `❌ PUBLIC VERIFIER CHECK FAILED\nReason: duplicate sha256 (likely re-listing same artifact)\nSha: ${sha}`);
    seenShas.add(sha);

    if (!createdAt || !isIsoDate(createdAt)) die(2, `❌ PUBLIC VERIFIER CHECK FAILED\nReason: invalid created_at (must be ISO)\nId: ${id}`);

    const dt = new Date(createdAt);
    if (lastDate && dt.getTime() < lastDate.getTime()) {
      die(2, `❌ PUBLIC VERIFIER CHECK FAILED\nReason: artifacts not in append-only chronological order\nId: ${id}`);
    }
    lastDate = dt;
  }

  console.log(`✅ PUBLIC VERIFIER INDEX OK\nFile: public-verifier/index.json\nArtifacts: ${artifacts.length}`);
}

await main();
