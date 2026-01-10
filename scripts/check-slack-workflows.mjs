#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const WORKSPACE_ROOT = process.cwd();

const WORKFLOWS_DIR = path.join(WORKSPACE_ROOT, 'slack', 'workflows');
const SEED_PATH = path.join(WORKSPACE_ROOT, 'slack', 'registry', 'Slack_Workflow_Registry.seed.csv');

const REPORT_DIR = path.join(WORKSPACE_ROOT, 'governance', 'slack-workflows');
const REPORT_PATH = path.join(REPORT_DIR, 'workflows-report.json');

const ALLOWED_CLASSES = new Set(['INTAKE', 'REVIEW', 'DECISION', 'DEADLINE', 'AUDIT']);

function nowIso() {
  return new Date().toISOString();
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

async function listJsonFiles(dirAbs) {
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.json'))
    .map((e) => path.join(dirAbs, e.name))
    .sort((a, b) => a.localeCompare(b));
}

async function readJson(fileAbs) {
  const raw = await fs.readFile(fileAbs, 'utf8');
  return JSON.parse(raw);
}

function stableString(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function requiredNameFor({ cls, workflowName }) {
  return `${cls} · ${workflowName}`;
}

function parseCsvIds(csvText) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return new Set();

  const header = lines[0].split(',').map((s) => s.trim());
  const idIdx = header.indexOf('Workflow ID');
  if (idIdx === -1) throw new Error('Seed CSV missing header column: Workflow ID');

  const ids = new Set();
  for (const line of lines.slice(1)) {
    // Simple CSV parsing: safe because IDs contain no commas in this repo.
    const cols = line.split(',');
    const id = (cols[idIdx] ?? '').trim();
    if (id) ids.add(id);
  }
  return ids;
}

async function main() {
  const workflowFiles = await listJsonFiles(WORKFLOWS_DIR);
  const seedText = await fs.readFile(SEED_PATH, 'utf8');
  const seedIds = parseCsvIds(seedText);

  /** @type {{workflow_id: string, file: string, status: 'PASS'|'FAIL', issues: {code: string, message: string}[]}[]} */
  const results = [];

  const seenIds = new Set();

  for (const fileAbs of workflowFiles) {
    const relFile = toPosix(path.relative(WORKSPACE_ROOT, fileAbs));
    /** @type {{code: string, message: string}[]} */
    const issues = [];

    let doc;
    try {
      doc = await readJson(fileAbs);
    } catch (e) {
      issues.push({ code: 'invalid_json', message: `Invalid JSON: ${e?.message ?? e}` });
      results.push({ workflow_id: '(unknown)', file: relFile, status: 'FAIL', issues });
      continue;
    }

    const workflowId = stableString(doc?.workflow_id).trim();
    const workflowName = stableString(doc?.workflow_name).trim();
    const cls = stableString(doc?.class).trim();
    const requiredName = stableString(doc?.required_name).trim();

    if (!workflowId) issues.push({ code: 'missing_workflow_id', message: 'Missing workflow_id.' });
    if (!workflowName) issues.push({ code: 'missing_workflow_name', message: 'Missing workflow_name.' });
    if (!cls) issues.push({ code: 'missing_class', message: 'Missing class.' });

    if (cls && !ALLOWED_CLASSES.has(cls)) {
      issues.push({ code: 'invalid_class', message: `Invalid class: ${cls}` });
    }

    if (workflowId) {
      if (seenIds.has(workflowId)) issues.push({ code: 'duplicate_workflow_id', message: `Duplicate workflow_id: ${workflowId}` });
      seenIds.add(workflowId);

      if (!seedIds.has(workflowId)) {
        issues.push({ code: 'missing_seed_row', message: `Workflow ID not found in seed CSV: ${toPosix(path.relative(WORKSPACE_ROOT, SEED_PATH))}` });
      }
    }

    if (cls && workflowName) {
      const expected = requiredNameFor({ cls, workflowName });
      if (!requiredName) {
        issues.push({ code: 'missing_required_name', message: `Missing required_name (expected: ${expected}).` });
      } else if (requiredName !== expected) {
        issues.push({ code: 'required_name_mismatch', message: `required_name must be '${expected}' (got '${requiredName}').` });
      }
    }

    if (!Array.isArray(doc?.inputs)) issues.push({ code: 'missing_inputs', message: 'Missing inputs[] array.' });
    if (!Array.isArray(doc?.outputs)) issues.push({ code: 'missing_outputs', message: 'Missing outputs[] array.' });

    results.push({
      workflow_id: workflowId || '(unknown)',
      file: relFile,
      status: issues.length > 0 ? 'FAIL' : 'PASS',
      issues
    });
  }

  const fail = results.filter((r) => r.status === 'FAIL');
  const pass = results.filter((r) => r.status === 'PASS');

  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.writeFile(
    REPORT_PATH,
    JSON.stringify(
      {
        generated_at: nowIso(),
        scanned_workflows: results.length,
        pass: pass.length,
        fail: fail.length,
        results
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  if (fail.length === 0) {
    console.log(`✅ SLACK WORKFLOWS PASSED (${pass.length}/${results.length})`);
    console.log(`Report: ${toPosix(path.relative(WORKSPACE_ROOT, REPORT_PATH))}`);
    process.exit(0);
  }

  const first = fail[0];
  const firstIssue = first.issues?.[0] ?? null;
  console.error('❌ SLACK WORKFLOWS FAILED');
  console.error(`Workflow: ${first.workflow_id}`);
  console.error(`Rule: ${firstIssue?.code ?? 'unknown'}`);
  console.error(`See report: ${toPosix(path.relative(WORKSPACE_ROOT, REPORT_PATH))}`);
  process.exit(1);
}

await main();
