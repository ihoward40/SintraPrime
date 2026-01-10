import fs from 'node:fs/promises';
import path from 'node:path';

export const WORKSPACE_ROOT = process.cwd();

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listFilesRecursive(rootAbs) {
  /** @type {string[]} */
  const out = [];

  async function walk(dirAbs) {
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(dirAbs, e.name);
      if (e.isDirectory()) await walk(abs);
      else if (e.isFile()) out.push(abs);
    }
  }

  if (!(await pathExists(rootAbs))) return out;
  await walk(rootAbs);
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function isUnder(relPosix, prefixPosix) {
  return relPosix === prefixPosix || relPosix.startsWith(`${prefixPosix}/`);
}

function shouldExclude(relPosix) {
  // Global excludes
  if (isUnder(relPosix, 'node_modules')) return true;
  if (isUnder(relPosix, 'dist')) return true;
  if (isUnder(relPosix, 'make-gmail-slack-automation/dist')) return true;

  // Generated governance reports
  if (relPosix === 'governance/make-lint/lint-report.json') return true;
  if (relPosix === 'governance/slack-workflows/workflows-report.json') return true;

  // Phase X outputs (except README)
  if (isUnder(relPosix, 'governance/freeze')) {
    if (relPosix === 'governance/freeze/README.md') return false;
    return true;
  }

  return false;
}

function shouldInclude(relPosix) {
  if (shouldExclude(relPosix)) return false;

  // Root lockfiles define dependency closure.
  if (relPosix === 'package.json') return true;
  if (relPosix === 'package-lock.json') return true;

  // Core contracts
  if (relPosix === 'docs/notion-button-webhook-contract.md') return true;

  // Make governance
  if (isUnder(relPosix, 'governance/make-lint')) return true;
  if (isUnder(relPosix, 'scenarios') && relPosix.endsWith('.lint.json')) return true;

  // Make artifacts + docs
  if (isUnder(relPosix, 'make-gmail-slack-automation/templates') && relPosix.endsWith('.json')) return true;
  if (isUnder(relPosix, 'make-gmail-slack-automation/phase3')) return true;
  if (isUnder(relPosix, 'make-gmail-slack-automation/phase6')) return true;
  if (isUnder(relPosix, 'make-gmail-slack-automation/schemas')) return true;
  if (isUnder(relPosix, 'make-gmail-slack-automation/docs') && relPosix.endsWith('.md')) return true;
  if (relPosix === 'make-gmail-slack-automation/.markdownlint.json') return true;

  // Notion import artifacts
  if (isUnder(relPosix, 'notion')) return true;

  // Slack governance
  if (isUnder(relPosix, 'slack')) return true;

  // Validators + build scripts (repo-side enforcement)
  if (isUnder(relPosix, 'scripts')) {
    if (relPosix.endsWith('.mjs')) return true;
  }

  return false;
}

export async function collectPhaseXGovernedFiles({ workspaceRoot = WORKSPACE_ROOT } = {}) {
  const roots = [
    // Root-level files
    path.join(workspaceRoot, 'package.json'),
    path.join(workspaceRoot, 'package-lock.json'),

    // Contracts
    path.join(workspaceRoot, 'docs'),

    // Make
    path.join(workspaceRoot, 'governance', 'make-lint'),
    path.join(workspaceRoot, 'scenarios'),
    path.join(workspaceRoot, 'make-gmail-slack-automation', 'templates'),
    path.join(workspaceRoot, 'make-gmail-slack-automation', 'phase3'),
    path.join(workspaceRoot, 'make-gmail-slack-automation', 'phase6'),
    path.join(workspaceRoot, 'make-gmail-slack-automation', 'schemas'),
    path.join(workspaceRoot, 'make-gmail-slack-automation', 'docs'),
    path.join(workspaceRoot, 'make-gmail-slack-automation', '.markdownlint.json'),

    // Notion
    path.join(workspaceRoot, 'notion'),

    // Slack
    path.join(workspaceRoot, 'slack'),

    // Repo-side validators
    path.join(workspaceRoot, 'scripts')
  ];

  /** @type {Set<string>} */
  const absSet = new Set();

  for (const root of roots) {
    const stat = await fs.stat(root).catch(() => null);
    if (!stat) continue;

    if (stat.isFile()) {
      absSet.add(root);
      continue;
    }

    if (stat.isDirectory()) {
      const files = await listFilesRecursive(root);
      for (const abs of files) absSet.add(abs);
    }
  }

  /** @type {string[]} */
  const rel = [];
  for (const abs of absSet) {
    const relPosix = toPosix(path.relative(workspaceRoot, abs));
    if (!relPosix || relPosix.startsWith('..')) continue;
    if (shouldInclude(relPosix)) rel.push(relPosix);
  }

  rel.sort((a, b) => a.localeCompare(b));
  return rel;
}
