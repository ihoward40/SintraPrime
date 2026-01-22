// src/litigation/binder.js

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { getLitigationTemplatePlan } from './plan.js';
import { buildBinderPacketPdf } from './binder-pdf.js';

async function sha256File(filePath) {
  const buf = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function safe(s, fallback = '') {
  return s === undefined || s === null || String(s).trim() === '' ? fallback : String(s);
}

function nowISO() {
  return new Date().toISOString();
}

function resolveGeneratedAt(casePayload) {
  const fromPayload = casePayload?.generated_at ?? casePayload?.generatedAt ?? null;
  const fromEnv =
    process.env.LITIGATION_GENERATED_AT ??
    process.env.SINTRAPRIME_LITIGATION_GENERATED_AT ??
    process.env.SINTRAPRIME_GENERATED_AT ??
    null;
  const candidate = safe(fromPayload ?? fromEnv, '');
  return candidate ? candidate : nowISO();
}

function exhibitCode(i) {
  return `A-${String(i + 1).padStart(3, '0')}`;
}

function displayTitle(doc) {
  switch (doc.kind) {
    case 'COMPLAINT':
      return 'Complaint';
    case 'NOTICE':
      return 'Notice';
    case 'MOTION':
      return 'Motion';
    case 'VERIFIED_COMPLAINT':
      return 'Verified Complaint';
    case 'ORDER_TO_SHOW_CAUSE':
      return 'Order to Show Cause';
    case 'TRO_OR_MOTION':
      return 'TRO / Motion';
    case 'CERTIFICATION':
      if (String(doc.slug || '').includes('service')) return 'Certification (Service)';
      return 'Certification';
    case 'PROPOSED_ORDER':
      return 'Proposed Order';
    case 'PROOF_OF_SERVICE':
      return 'Proof of Service';
    default:
      return doc.slug || doc.kind;
  }
}

function buildIndexRows(plan, artifactsDir) {
  const rows = [];
  let i = 0;

  for (const doc of plan.documents || []) {
    const code = safe(doc.exhibit_code, exhibitCode(i++));
    const outFile = `${doc.slug}.md`;
    const outPath = path.join(artifactsDir, outFile);

    const exists = fssync.existsSync(outPath);
    const hash = null;
    const status = exists ? 'READY' : 'MISSING';

    rows.push({
      code,
      kind: doc.kind,
      slug: doc.slug,
      title: displayTitle(doc),
      file: outFile,
      status,
      sha256: hash,
      templatePath: doc.templatePath || null,
    });
  }

  return rows;
}

export function buildCoverMd(casePayload, plan, generatedAt) {
  const caseId = safe(casePayload?.case_id ?? casePayload?.caseId, 'CASE-ID-PENDING');
  const title = safe(casePayload?.case_title, safe(casePayload?.matter_type, 'Litigation Packet'));
  const venue = safe(casePayload?.venue, 'Venue Pending');
  const county = safe(casePayload?.county, '');
  const jurisdiction = safe(casePayload?.jurisdiction, '');

  const plaintiff = safe(casePayload?.plaintiff_name, 'Plaintiff');
  const defendant = safe(casePayload?.defendant_name, 'Defendant');

  const trustee = safe(casePayload?.trustee_name, safe(casePayload?.signature_block, 'Authorized Representative'));
  const preparedBy = safe(casePayload?.prepared_by, trustee);

  const generated = safe(generatedAt, nowISO());

  return `# EXHIBIT PACKET (LITIGATION)

## Case ID
**${caseId}**

## Packet Title
**${title}**

## Parties
- **Plaintiff:** ${plaintiff}
- **Defendant:** ${defendant}

## Venue
- **Court / Venue:** ${venue}
${county ? `- **County:** ${county}\n` : ''}${jurisdiction ? `- **Jurisdiction:** ${jurisdiction}\n` : ''}

## Matter Type
**${safe(casePayload?.matter_type, 'Unspecified')}**

## Plan Selection
- **Jurisdiction Key:** ${safe(plan?.jurisdictionKey, '(unset)')}
- **Venue Key:** ${safe(plan?.venueKey, '(unset)')}

## Prepared By
${preparedBy}

## Generated
${generated}

---
**Binder Note:** This packet is auto-generated from the Litigation Engine plan.  
Any missing templates render as a stub page so the system never “fails closed.”
`;
}

export function buildIndexMd(casePayload, rows, generatedAt) {
  const generated = safe(generatedAt, nowISO());

  const caseId = safe(casePayload?.case_id ?? casePayload?.caseId, 'CASE-ID-PENDING');

  const table = [
    '| Exhibit | Document | File | Status | SHA-256 |',
    '|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.code} | ${r.title} | ${r.file} | ${r.status} | ${r.sha256 ?? '(missing)'} |`),
  ].join('\n');

  return `# BINDER INDEX

## Case ID
**${caseId}**

## Contents
${table}

---
Generated: ${generated}
`;
}

export async function buildBinderCoverAndIndex(casePayload, outDir) {
  const plan = getLitigationTemplatePlan(casePayload);

  const generatedAt = resolveGeneratedAt(casePayload);

  await fs.mkdir(outDir, { recursive: true });

  const coverPath = path.join(outDir, 'BINDER_COVER.md');
  const indexPath = path.join(outDir, 'BINDER_INDEX.md');
  const packetPdfPath = path.join(outDir, 'BINDER_PACKET.pdf');

  const coverMd = buildCoverMd(casePayload, plan, generatedAt);
  await fs.writeFile(coverPath, coverMd, 'utf8');

  const exhibitRows = buildIndexRows(plan, outDir);

  // Hash exhibits now that we have the rows.
  for (const r of exhibitRows) {
    const abs = path.join(outDir, r.file);
    if (!fssync.existsSync(abs)) continue;
    // eslint-disable-next-line no-await-in-loop
    r.sha256 = await sha256File(abs);
  }

  const indexMd = buildIndexMd(casePayload, exhibitRows, generatedAt);
  await fs.writeFile(indexPath, indexMd, 'utf8');

  // Build packet PDF from cover + index + exhibit markdown (text-only deterministic PDF).
  const sections = [];
  sections.push({ title: 'BINDER COVER', text: coverMd });
  sections.push({ title: 'BINDER INDEX', text: indexMd });

  for (const r of exhibitRows) {
    const abs = path.join(outDir, r.file);
    let text = `# ${r.title}\n\n(Missing: ${r.file})\n`;
    if (fssync.existsSync(abs)) {
      // eslint-disable-next-line no-await-in-loop
      text = await fs.readFile(abs, 'utf8');
    }
    sections.push({ title: `${r.code} — ${r.title}`, text });
  }

  let packetPdfSha = null;
  try {
    await buildBinderPacketPdf({ sections, outPath: packetPdfPath });
    packetPdfSha = await sha256File(packetPdfPath);
  } catch {
    // If PDF generation fails (e.g., missing dependency), keep the rest deterministic.
    packetPdfSha = null;
  }

  const evidenceManifestPath = path.join(outDir, 'evidence_manifest.json');
  const evidenceManifest = fssync.existsSync(evidenceManifestPath)
    ? JSON.parse(fssync.readFileSync(evidenceManifestPath, 'utf8'))
    : null;

  const packetManifest = {
    case_id: safe(casePayload?.case_id ?? casePayload?.caseId, 'CASE-ID-PENDING'),
    generated_at: generatedAt,
    jurisdictionKey: plan.jurisdictionKey,
    venueKey: plan.venueKey,
    selection: plan.selection ?? null,
    exhibits: exhibitRows.map((r) => ({
      exhibit: r.code,
      code: r.code,
      kind: r.kind,
      slug: r.slug,
      title: r.title,
      artifactFile: r.file,
      relPath: r.file,
      status: r.status,
      sha256: r.sha256 ? `sha256:${r.sha256}` : null,
      templatePath: r.templatePath,
    })),
    outputs: {
      cover: { file: 'BINDER_COVER.md', sha256: `sha256:${await sha256File(coverPath)}` },
      index: { file: 'BINDER_INDEX.md', sha256: `sha256:${await sha256File(indexPath)}` },
      packet_pdf: packetPdfSha ? { file: 'BINDER_PACKET.pdf', sha256: `sha256:${packetPdfSha}` } : null,
    },
    evidence_manifest: evidenceManifest,
  };

  await fs.writeFile(
    path.join(outDir, 'BINDER_PACKET_MANIFEST.json'),
    JSON.stringify(packetManifest, null, 2),
    'utf8',
  );

  return packetManifest;
}
