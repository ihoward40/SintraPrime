// src/litigation/render.js

import fs from 'node:fs/promises';
import path from 'node:path';

import { selectTemplateCandidates } from './selector.js';
import { getLitigationTemplatePlan } from './plan.js';
import { buildBinderCoverAndIndex } from './binder.js';
import { loadTemplateText } from './templates/load.js';

function nowIso() {
  const fixed =
    process.env.LITIGATION_GENERATED_AT ??
    process.env.SINTRAPRIME_LITIGATION_GENERATED_AT ??
    process.env.SINTRAPRIME_GENERATED_AT ??
    null;
  const s = String(fixed ?? '').trim();
  return s ? s : new Date().toISOString();
}

function ensureSafeCaseId(caseId) {
  const raw = String(caseId ?? 'CASE-UNKNOWN');
  const safe = raw.trim().replace(/[^A-Za-z0-9._\-]/g, '_');
  return safe || 'CASE-UNKNOWN';
}

function renderMustacheLite(template, vars) {
  // Minimal {{key}} replacement.
  return String(template).replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    const value = vars?.[key];
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

function buildMergeVars(casePayload) {
  const caseId = ensureSafeCaseId(casePayload?.case_id ?? casePayload?.caseId);
  const venue = casePayload?.venue ?? casePayload?.jurisdiction ?? '';
  const courtDivision = casePayload?.court_division ?? casePayload?.courtDivision ?? '';
  const base = {
    case_id: caseId,
    venue: String(venue ?? ''),
    court_division: String(courtDivision ?? ''),
    generated_at: nowIso(),
  };

  const merged = { ...base, ...(casePayload?.vars ?? {}), ...(casePayload?.fields ?? {}) };

  // Add upper/lower aliases for robustness across different payload conventions.
  for (const [k, v] of Object.entries(merged)) {
    const key = String(k);
    const upper = key.toUpperCase();
    const lower = key.toLowerCase();
    if (merged[upper] === undefined) merged[upper] = v;
    if (merged[lower] === undefined) merged[lower] = v;
  }
  return merged;
}

export async function renderLitigationDocument({
  casePayload,
  docType,
  variant,
  outFileBase,
  outDir,
  templateFile,
  candidates: candidatesFromPlan,
}) {
  const caseId = ensureSafeCaseId(casePayload?.case_id ?? casePayload?.caseId);
  const venue = casePayload?.venue ?? casePayload?.jurisdiction ?? 'common';
  const courtDivision = casePayload?.court_division ?? casePayload?.courtDivision ?? '';

  const candidates = candidatesFromPlan?.length
    ? candidatesFromPlan
    : selectTemplateCandidates({ venue, courtDivision, docType, variant });

  let chosen = null;
  let templateText = null;

  if (templateFile) {
    try {
      templateText = await loadTemplateText(templateFile);
      chosen = templateFile;
    } catch {
      // fall back to candidates / stubs
    }
  }

  if (!templateText) {
    for (const relPath of candidates) {
      const abs = path.resolve(process.cwd(), relPath);
      try {
        templateText = await fs.readFile(abs, 'utf8');
        chosen = relPath;
        break;
      } catch {
        // continue
      }
    }
  }

  const vars = buildMergeVars(casePayload);

  const rendered = templateText
    ? renderMustacheLite(templateText, { ...vars, ...(casePayload?.vars ?? {}) })
    : buildMissingTemplateStub({ caseId, docType, variant, candidates, venue, courtDivision });

  const dir = path.resolve(outDir);
  await fs.mkdir(dir, { recursive: true });

  const base = outFileBase ? String(outFileBase) : String(docType);
  const fileBase = variant ? `${base}.${variant}` : base;
  const outPath = path.join(dir, `${fileBase}.md`);
  await fs.writeFile(outPath, rendered, 'utf8');

  return {
    ok: true,
    caseId,
    docType,
    variant: variant ?? null,
    templatePath: chosen,
    outPath,
    usedStub: !chosen,
    candidates,
  };
}

export function buildMissingTemplateStub({
  caseId,
  docType,
  variant,
  candidates,
  venue,
  courtDivision,
}) {
  const lines = [];
  lines.push(`# TEMPLATE MISSING: ${String(docType)}${variant ? ` (${variant})` : ''}`);
  lines.push('');
  lines.push('This is a safe stub generated to prevent boot/runtime failure.');
  lines.push('');
  lines.push(`- case_id: ${String(caseId)}`);
  lines.push(`- venue: ${String(venue ?? '')}`);
  lines.push(`- court_division: ${String(courtDivision ?? '')}`);
  lines.push(`- generated_at: ${nowIso()}`);
  lines.push('');
  lines.push('## Candidate template paths (first match wins)');
  for (const c of candidates ?? []) lines.push(`- ${c}`);
  lines.push('');
  lines.push('## Next steps');
  lines.push('- Add the missing template file in one of the candidate paths above.');
  lines.push('- Re-run the selftest to confirm the template renders.');
  lines.push('');
  return lines.join('\n');
}

export async function buildLitigationPackage(casePayload, outDir) {
  const plan = getLitigationTemplatePlan(casePayload);
  const results = [];

  for (const doc of plan.documents ?? []) {
    results.push(
      await renderLitigationDocument({
        casePayload,
        docType: doc.docType,
        variant: null,
        outFileBase: doc.slug,
        outDir,
        templateFile: doc.templateFile ?? null,
        candidates: doc.candidates ?? [],
      }),
    );
  }

  const index = {
    case_id: String(casePayload?.case_id ?? casePayload?.caseId ?? ''),
    generated_at: nowIso(),
    outDir: path.resolve(outDir),
    plan,
    documents: results.map((r) => ({
      docType: r.docType,
      variant: r.variant,
      templatePath: r.templatePath,
      outPath: r.outPath,
      usedStub: r.usedStub,
    })),
  };

  // Binder cover + index generated from the same plan.
  const binderManifest = await buildBinderCoverAndIndex(casePayload, outDir);
  index.binder = {
    cover: 'BINDER_COVER.md',
    index: 'BINDER_INDEX.md',
    packet_manifest: 'BINDER_PACKET_MANIFEST.json',
    packet_pdf: 'BINDER_PACKET.pdf',
    binder_manifest: binderManifest,
  };

  await fs.mkdir(path.resolve(outDir), { recursive: true });
  await fs.writeFile(path.join(path.resolve(outDir), 'index.json'), JSON.stringify(index, null, 2), 'utf8');

  return { ok: true, ...index };
}
