#!/usr/bin/env node
/**
 * Emits a machine-readable compliance summary for Make templates.
 * Output: dist/ci/make-guards-summary.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATES_DIR = 'templates';
const OUT_DIR = path.join('dist', 'ci');
const OUT_FILE = path.join(OUT_DIR, 'make-guards-summary.json');

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

  return (
    text.includes('length(trim(') &&
    text.includes('> 2') &&
    (text.includes('comment.text') || text.includes('comment'))
  );
}

function hasSlackBotIgnoreGuidance(doc, text) {
  const recommended = String(doc?.slack_loop_protection?.recommended_filter ?? '');
  const r = recommended.toLowerCase();

  if (r.includes('bot_user_id') || r.includes('bot_id') || r.includes('is bot')) return true;

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

const results = [];
for (const filePath of templateFiles) {
  const rel = path.relative(repoRoot, filePath);
  const raw = fs.readFileSync(filePath, 'utf8');

  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    results.push({
      template: rel,
      parse_error: String(err?.message ?? err),
      compliant: false,
    });
    continue;
  }

  const text = safeLowerJsonString(doc);
  const tiktok = usesTikTok(doc, text);
  const slack = usesSlack(doc, text);

  if (!tiktok && !slack) {
    results.push({
      template: rel,
      uses: { tiktok: false, slack: false },
      guards: {
        non_empty_payload: 'n/a',
        bot_self_ignore: 'n/a',
        dedupe: 'n/a',
      },
      compliant: true,
    });
    continue;
  }

  const nonEmpty = tiktok ? hasNonEmptyTextGate(doc, text) : 'n/a';
  const botIgnore = slack ? hasSlackBotIgnoreGuidance(doc, text) : 'n/a';

  const datastore = hasDatastoreGetCreate(doc);
  const labelGate = usesGmailLabelGate(doc, text);

  let dedupe;
  if (tiktok) dedupe = datastore;
  else if (slack) dedupe = datastore || labelGate;
  else dedupe = 'n/a';

  const compliant =
    (nonEmpty === true || nonEmpty === 'n/a') &&
    (botIgnore === true || botIgnore === 'n/a') &&
    (dedupe === true || dedupe === 'n/a');

  results.push({
    template: rel,
    uses: { tiktok, slack },
    guards: {
      non_empty_payload: nonEmpty,
      bot_self_ignore: botIgnore,
      dedupe,
      dedupe_detail: {
        datastore_get_create: datastore,
        gmail_label_gate: labelGate,
      },
    },
    compliant,
  });
}

const summary = {
  generated_at_utc: new Date().toISOString(),
  policy:
    'Templates touching TikTok must have non-empty gating + datastore dedupe. Templates touching Slack must include bot/self-ignore guidance and dedupe (datastore or Gmail label-gate).',
  totals: {
    templates_scanned: results.length,
    compliant: results.filter((r) => r.compliant).length,
    non_compliant: results.filter((r) => !r.compliant).length,
  },
  results,
};

const outDirAbs = path.join(repoRoot, OUT_DIR);
const outFileAbs = path.join(repoRoot, OUT_FILE);
fs.mkdirSync(outDirAbs, { recursive: true });
fs.writeFileSync(outFileAbs, JSON.stringify(summary, null, 2));

// eslint-disable-next-line no-console
console.log(`Wrote ${path.relative(repoRoot, outFileAbs)}`);
