#!/usr/bin/env node

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import archiver from 'archiver';

const WORKSPACE_ROOT = process.cwd();

const SCENARIO_IDS = [
  'PACKET_BUILD_COURT',
  'FOIA_BUILD_PACKET',
  'MAIL_CREATE_TRACK',
  'PUBLISH_MANIFEST'
];

const TEMPLATES_DIR = path.join(WORKSPACE_ROOT, 'make-gmail-slack-automation', 'templates');
const DECLS_DIR = path.join(WORKSPACE_ROOT, 'scenarios');

const OUT_DEFAULT = path.join(
  WORKSPACE_ROOT,
  'make-gmail-slack-automation',
  'dist',
  'phase3',
  'make-scenarios-phase3.zip'
);

const STAGE_DEFAULT = path.join(
  WORKSPACE_ROOT,
  'make-gmail-slack-automation',
  'dist',
  'phase3',
  'staging'
);

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function ensureDirSync(dirAbs) {
  fs.mkdirSync(dirAbs, { recursive: true });
}

async function listFilesRecursive(rootAbs) {
  /** @type {string[]} */
  const out = [];

  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) await walk(fp);
      else if (e.isFile()) out.push(fp);
    }
  }

  await walk(rootAbs);
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function relWithin(rootAbs, fileAbs) {
  const rel = path.relative(rootAbs, fileAbs);
  if (rel.startsWith('..')) throw new Error(`Path escapes staging root: ${fileAbs}`);
  return toPosix(rel);
}

async function zipDirectoryDeterministic({ rootAbs, zipAbs, fixedDate }) {
  ensureDirSync(path.dirname(zipAbs));

  const output = fs.createWriteStream(zipAbs);
  const archive = archiver('zip', { zlib: { level: 9 } });

  const done = new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('warning', reject);
    archive.on('error', reject);
  });

  archive.pipe(output);

  const files = await listFilesRecursive(rootAbs);
  for (const abs of files) {
    const name = relWithin(rootAbs, abs);
    archive.file(abs, { name, date: fixedDate });
  }

  await archive.finalize();
  await done;
}

async function readJson(fileAbs) {
  const raw = await fsp.readFile(fileAbs, 'utf8');
  return JSON.parse(raw);
}

async function findTemplatesByScenarioId() {
  const files = (await fsp.readdir(TEMPLATES_DIR))
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .map((f) => path.join(TEMPLATES_DIR, f));

  /** @type {Map<string, string>} */
  const byId = new Map();
  for (const fileAbs of files) {
    const doc = await readJson(fileAbs);
    const id = String(doc?.scenario_id ?? '').trim();
    if (!id) continue;
    if (byId.has(id)) throw new Error(`Duplicate scenario_id in templates: ${id}`);
    byId.set(id, fileAbs);
  }
  return byId;
}

function parseArgs(argv) {
  const out = { outZip: OUT_DEFAULT, stageDir: STAGE_DEFAULT, createdAt: '2000-01-01T00:00:00.000Z' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') out.outZip = path.resolve(WORKSPACE_ROOT, argv[++i] ?? '');
    else if (a === '--stage') out.stageDir = path.resolve(WORKSPACE_ROOT, argv[++i] ?? '');
    else if (a === '--created-at') out.createdAt = argv[++i] ?? out.createdAt;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(
      [
        'Usage:',
        '  node scripts/build-phase3-scenarios-zip.mjs [--out <zip>] [--created-at <iso>] [--stage <dir>]',
        '',
        'Defaults:',
        `  --out ${toPosix(path.relative(WORKSPACE_ROOT, OUT_DEFAULT))}`,
        `  --stage ${toPosix(path.relative(WORKSPACE_ROOT, STAGE_DEFAULT))}`,
        '  --created-at 2000-01-01T00:00:00.000Z',
        ''
      ].join('\n')
    );
    return;
  }

  const fixedDate = new Date(args.createdAt);
  if (Number.isNaN(fixedDate.getTime())) throw new Error(`Invalid --created-at: ${args.createdAt}`);

  await fsp.rm(args.stageDir, { recursive: true, force: true });
  await fsp.mkdir(path.join(args.stageDir, 'templates'), { recursive: true });
  await fsp.mkdir(path.join(args.stageDir, 'scenarios'), { recursive: true });
  await fsp.mkdir(path.join(args.stageDir, 'docs'), { recursive: true });

  const templatesById = await findTemplatesByScenarioId();

  for (const scenarioId of SCENARIO_IDS) {
    const templateAbs = templatesById.get(scenarioId);
    if (!templateAbs) throw new Error(`Missing template for scenario_id: ${scenarioId}`);

    const declAbs = path.join(DECLS_DIR, `${scenarioId}.lint.json`);
    try {
      await fsp.access(declAbs);
    } catch {
      throw new Error(`Missing declaration: scenarios/${scenarioId}.lint.json`);
    }

    await fsp.copyFile(templateAbs, path.join(args.stageDir, 'templates', `${scenarioId}.json`));
    await fsp.copyFile(declAbs, path.join(args.stageDir, 'scenarios', `${scenarioId}.lint.json`));
  }

  // Include the authoritative contract + phase mapping.
  await fsp.copyFile(
    path.join(WORKSPACE_ROOT, 'docs', 'notion-button-webhook-contract.md'),
    path.join(args.stageDir, 'docs', 'notion-button-webhook-contract.md')
  );

  await fsp.copyFile(
    path.join(WORKSPACE_ROOT, 'make-gmail-slack-automation', 'phase3', 'README.md'),
    path.join(args.stageDir, 'README.md')
  );

  await zipDirectoryDeterministic({ rootAbs: args.stageDir, zipAbs: args.outZip, fixedDate });

  process.stdout.write(
    [
      `✅ Built Phase III ZIP`,
      `Out: ${toPosix(path.relative(WORKSPACE_ROOT, args.outZip))}`
    ].join('\n') + '\n'
  );
}

await main();
