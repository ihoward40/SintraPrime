import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const targets = [
  'agents/registry.json',
  'fieldmap.manifest.v1.json',
  'tools/OpenCodeSafe/opencode_policy.config.v1.json',
  'tools/packverifier',
  'notion/schemas',
  'automations',
];

const excludedFileNames = new Set([
  'package-lock.json',
]);

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) results.push(...walk(full));
    else results.push(full);
  }
  return results;
}

function collectJsonFiles() {
  const jsonFiles = [];
  for (const target of targets) {
    const full = path.join(repoRoot, target);
    if (!fs.existsSync(full)) continue;

    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      for (const filePath of walk(full)) {
        if (!filePath.toLowerCase().endsWith('.json')) continue;
        if (excludedFileNames.has(path.basename(filePath))) continue;
        jsonFiles.push(filePath);
      }
    } else {
      if (full.toLowerCase().endsWith('.json')) jsonFiles.push(full);
    }
  }
  return jsonFiles.sort();
}

function validateJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { status: 'skipped-empty' };
  JSON.parse(raw);
  return { status: 'ok' };
}

const files = collectJsonFiles();
if (files.length === 0) {
  console.log('No JSON files found in selected targets.');
  process.exit(0);
}

let failed = 0;
let skippedEmpty = 0;
for (const filePath of files) {
  const rel = path.relative(repoRoot, filePath).replace(/\\/g, '/');
  try {
    const res = validateJson(filePath);
    if (res.status === 'skipped-empty') skippedEmpty++;
  } catch (err) {
    failed++;
    console.error(`\n${rel}`);
    console.error(`- JSON parse error: ${err?.message ?? String(err)}`);
  }
}

if (failed > 0) {
  console.error(`\nJSON validation failed (${failed} file(s)).`);
  process.exit(1);
}

const okCount = files.length - skippedEmpty;
console.log(`JSON validation OK (${okCount} parsed, ${skippedEmpty} skipped-empty).`);
