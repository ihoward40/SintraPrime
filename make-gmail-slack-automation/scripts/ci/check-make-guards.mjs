#!/usr/bin/env node
/**
 * CI guardrail checker for Make template definitions.
 *
 * Pattern-based (not schema-perfect) on purpose:
 * - TikTok trigger => must have a non-empty text gate + datastore dedupe
 * - Any Slack module => must include bot/self-ignore guidance
 * - Templates touching TikTok or Slack => must have dedupe
 *   - Datastore dedupe OR Gmail label-gate (allowed for Gmail-driven flows)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATES_DIR = 'templates';

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  /** @type {string[]} */
  let results = [];

  for (const entry of fs.readdirSync(dir)) {
    const entryPath = path.join(dir, entry);
    const stat = fs.statSync(entryPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(entryPath));
      continue;
    }

    if (entry.endsWith('.json')) {
      results.push(entryPath);
    }
  }

  return results;
}

function safeLowerJsonString(doc) {
  try {
    return JSON.stringify(doc).toLowerCase();
  } catch {
    return '';
  }
}

function hasDatastoreGetCreate(doc) {
  const modules = Array.isArray(doc?.modules) ? doc.modules : [];
  const hasGet = modules.some((m) => String(m?.module ?? '').toLowerCase() === 'datastore:getrecord');
  const hasCreate = modules.some(
    (m) => String(m?.module ?? '').toLowerCase() === 'datastore:createrecord'
  );
  return hasGet && hasCreate;
}

function usesHashDeltaStateChangeGate(doc, text) {
  const primitive = String(doc?.idempotency_primitive ?? '').toLowerCase();
  if (primitive !== 'hash-delta') return false;

  // Accept either explicit prev_hash/this_hash comparison in a filter module,
  // or a coarse string-level signal (this checker is intentionally pattern-based).
  const modules = Array.isArray(doc?.modules) ? doc.modules : [];
  const moduleGate = modules.some((m) => {
    if (m?.type !== 'filter') return false;
    const f = String(m?.filter ?? '').toLowerCase();
    return f.includes('prev_hash') && f.includes('this_hash') && f.includes('!=');
  });
  if (moduleGate) return true;

  return text.includes('prev_hash') && text.includes('this_hash') && text.includes('!=');
}

function usesGmailLabelGate(doc, text) {
  const primitive = String(doc?.idempotency_primitive ?? '').toLowerCase();
  if (primitive === 'gmail-label-gate') return true;

  return (
    text.includes('alert_slack_posted') ||
    (text.includes('gmail_labels') && text.includes('posted')) ||
    text.includes('modifyemail')
  );
}

function hasNonEmptyTextGate(doc, text) {
  const modules = Array.isArray(doc?.modules) ? doc.modules : [];

  const moduleFilterMatch = modules.some((m) => {
    const filter = String(m?.filter ?? '');
    const f = filter.toLowerCase();

    const referencesText =
      filter.includes('comment.text') ||
      filter.includes('comment_text') ||
      f.includes('comment text') ||
      f.includes('text');

    return m?.type === 'filter' && f.includes('length(trim(') && f.includes('>') && referencesText;
  });

  if (moduleFilterMatch) return true;

  return text.includes('length(trim(') && text.includes('> 2') && (text.includes('comment.text') || text.includes('comment'));
}

function hasSlackBotIgnoreGuidance(doc, text) {
  const recommended = String(doc?.slack_loop_protection?.recommended_filter ?? '');
  const r = recommended.toLowerCase();
  if (r.includes('bot_user_id') || r.includes('bot_userid') || r.includes('bot_user_id'.toLowerCase())) return true;
  if (r.includes('bot_id') && (r.includes('!=') || r.includes('not(') || r.includes('is bot'))) return true;

  const modules = Array.isArray(doc?.modules) ? doc.modules : [];
  const moduleBotIgnore = modules.some((m) => {
    if (m?.type !== 'filter') return false;
    const f = String(m?.filter ?? '').toLowerCase();
    return f.includes('bot_id') || f.includes('is bot') || f.includes('bot_user_id') || f.includes('bot userid');
  });

  if (moduleBotIgnore) return true;

  return text.includes('bot_user_id') || text.includes('bot_id') || text.includes('is bot');
}

function usesTikTok(doc, text) {
  const name = String(doc?.template_name ?? '').toLowerCase();
  if (name.includes('tiktok')) return true;

  const modules = Array.isArray(doc?.modules) ? doc.modules : [];
  return modules.some((m) => String(m?.module ?? '').toLowerCase().startsWith('tiktok:'));
}

function usesSlack(doc, text) {
  const name = String(doc?.template_name ?? '').toLowerCase();
  if (name.includes('slack')) return true;

  const modules = Array.isArray(doc?.modules) ? doc.modules : [];
  return modules.some((m) => String(m?.module ?? '').toLowerCase().startsWith('slack:'));
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const templatesDir = path.join(repoRoot, TEMPLATES_DIR);
const templateFiles = walk(templatesDir);

/** @type {string[]} */
const failures = [];

let applicableCount = 0;

for (const filePath of templateFiles) {
  const raw = fs.readFileSync(filePath, 'utf8');
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    failures.push(`${path.relative(repoRoot, filePath)}: invalid JSON (${err?.message ?? err})`);
    continue;
  }

  const text = safeLowerJsonString(doc);
  const tiktok = usesTikTok(doc, text);
  const slack = usesSlack(doc, text);

  if (!tiktok && !slack) continue;
  applicableCount += 1;

  const rel = path.relative(repoRoot, filePath);
  const hasDatastore = hasDatastoreGetCreate(doc);
  const hasLabelGate = usesGmailLabelGate(doc, text);
  const hasHashDeltaGate = usesHashDeltaStateChangeGate(doc, text);

  // Guard A: Non-empty payload gate (TikTok)
  if (tiktok && !hasNonEmptyTextGate(doc, text)) {
    failures.push(`${rel}: missing non-empty payload gate for TikTok`);
  }

  // Guard B: Bot self-ignore guidance (Slack)
  if (slack && !hasSlackBotIgnoreGuidance(doc, text)) {
    failures.push(`${rel}: missing bot/self-ignore guidance for Slack`);
  }

  // Guard C: Dedupe
  // - TikTok: must use datastore dedupe (comment/event ID keyed)
  // - Slack-only: must use datastore OR Gmail label-gate (for Gmail-driven flows)
  //   OR an explicit hash-delta state-change gate (prev_hash/this_hash)
  if (tiktok && !hasDatastore) {
    failures.push(`${rel}: missing datastore dedupe (get + create)`);
  }
  if (!tiktok && slack && !(hasDatastore || hasLabelGate || hasHashDeltaGate)) {
    failures.push(`${rel}: missing dedupe (datastore get+create OR gmail label-gate)`);
  }
}

if (failures.length > 0) {
  // eslint-disable-next-line no-console
  console.error('\n❌ Make guardrail check failed:\n');
  for (const failure of failures) {
    // eslint-disable-next-line no-console
    console.error(` - ${failure}`);
  }
  // eslint-disable-next-line no-console
  console.error('\nAdd non-empty payload filters, bot/self-ignore guidance, and dedupe.\n');
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log(
  `✅ Make guardrail check passed (${templateFiles.length} template file(s) scanned, ${applicableCount} applicable).`
);
