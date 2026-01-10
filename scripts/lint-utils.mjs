import fs from 'node:fs/promises';
import path from 'node:path';

export const WORKSPACE_ROOT = process.cwd();

export function nowIso() {
  return new Date().toISOString();
}

export async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function listFilesRecursive(dir, predicate = null) {
  /** @type {string[]} */
  const out = [];
  if (!(await pathExists(dir))) return out;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFilesRecursive(full, predicate)));
    else if (entry.isFile()) {
      if (!predicate || predicate(full)) out.push(full);
    }
  }
  return out;
}

export function stableString(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

export function lower(v) {
  return stableString(v).toLowerCase();
}

export function rel(p) {
  return path.relative(WORKSPACE_ROOT, p).replace(/\\/g, '/');
}

export function isSlackModule(m) {
  return lower(m?.module).startsWith('slack:');
}

export function isSlackSendMessage(m) {
  const mod = lower(m?.module);
  return mod === 'slack:sendmessage' || mod.includes('slack:send') || mod.includes('slack:post');
}

export function isSlackInteractiveModule(m) {
  const mod = lower(m?.module);
  const name = lower(m?.name);
  return (
    mod.includes('interactive') ||
    mod.includes('dialog') ||
    mod.includes('button') ||
    mod.includes('workflow') ||
    name.includes('interactive') ||
    name.includes('approve') ||
    name.includes('reject')
  );
}

export function isSchedulerLikeModule(m) {
  const mod = lower(m?.module);
  const name = lower(m?.name);
  const settingsText = lower(JSON.stringify(m?.settings ?? {}));

  if (mod.includes('schedule') || mod.includes('scheduler') || mod.includes('cron')) return true;
  if (name.includes('schedule') || name.includes('scheduler') || name.includes('cron')) return true;
  if (settingsText.includes('cron') || settingsText.includes('interval')) return true;

  // Common Make patterns (heuristic)
  if (mod.includes('tools:sleep') || name.includes('sleep')) return true;

  return false;
}

export function moduleId(m, idx) {
  if (m && (typeof m.id === 'number' || typeof m.id === 'string')) return String(m.id);
  return String(idx + 1);
}

export function slackText(m) {
  const s = m?.settings ?? {};
  const text = s?.text ?? s?.message ?? s?.content ?? '';
  return stableString(text);
}

export function detectSlack(doc) {
  const modules = Array.isArray(doc?.modules) ? doc.modules : [];
  return {
    any: modules.some(isSlackModule),
    send: modules.some(isSlackSendMessage),
    interactive: modules.some(isSlackInteractiveModule)
  };
}

export function detectScheduler(doc) {
  const modules = Array.isArray(doc?.modules) ? doc.modules : [];
  return modules.some(isSchedulerLikeModule);
}

// "state_hash_compare" requirement can be satisfied either by explicit prev/this hash delta
// OR by an explicit idempotency primitive (gmail label gate / datastore dedupe).
export function detectStateHashCompare(doc) {
  const primitive = lower(doc?.idempotency_primitive);
  if (primitive === 'gmail-label-gate' || primitive === 'datastore-dedup') return true;

  const text = lower(JSON.stringify(doc));
  const hasHashSignals = text.includes('prev_hash') || text.includes('prev hash') || text.includes('this_hash') || text.includes('this hash');
  const hasCompare = text.includes('!=') || text.includes('not(') || text.includes('different');
  if (hasHashSignals && hasCompare) return true;

  return false;
}

export function detectRunsLedgerWrite(doc) {
  const modules = Array.isArray(doc?.modules) ? doc.modules : [];
  const text = lower(JSON.stringify(doc));

  const hasNotionWrite = modules.some((m) => lower(m?.module).startsWith('notion:') || lower(m?.module).startsWith('notion-'));
  if (hasNotionWrite) return true;

  if (text.includes('runs ledger') || text.includes('runs_ledger')) return true;

  return false;
}

export function detectHashBeforeExport(doc) {
  const text = lower(JSON.stringify(doc));
  if (text.includes('sha256') || text.includes('sha-256') || text.includes('this_hash') || text.includes('this hash')) return true;
  if (text.includes('hash(') || text.includes('md5(')) return true;
  return false;
}
