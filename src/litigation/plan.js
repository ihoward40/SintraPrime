// src/litigation/plan.js

import { selectLitigationTemplates } from './templates/select.js';
import { normalizeCourtDivision, normalizeVenue } from './venues.js';

const VENUES = new Set(["NJ-SUPERIOR", "NJ-ESSEX", "NY-SUPREME", "FED-DNJ", "GENERIC"]);
const MATTERS = new Set(["CONSUMER", "CIVIL", "INJUNCTIVE", "EMERGENCY", "DEBT_DEFENSE", "GENERIC"]);

function normalizeVenueCode(input) {
  const raw = String(input ?? '').trim();
  if (VENUES.has(raw)) return raw;

  const legacy = normalizeVenue(raw);
  if (legacy === 'nj') return 'NJ-SUPERIOR';
  return 'GENERIC';
}

function normalizeMatterType(input) {
  const raw = String(input ?? '').trim();
  if (MATTERS.has(raw)) return raw;
  return 'GENERIC';
}

function safeLowerSlug(s) {
  const raw = String(s ?? '').trim().toLowerCase();
  return raw
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_.]/g, '-')
    .replace(/\-+/g, '-')
    .replace(/^\-+|\-+$/g, '');
}

export function getLitigationTemplatePlan(casePayload) {
  const venueRaw = casePayload?.venue ?? casePayload?.jurisdiction ?? 'common';
  const courtDivisionRaw = casePayload?.court_division ?? casePayload?.courtDivision ?? '';
  const matterRaw = casePayload?.matter_type ?? casePayload?.matterType ?? casePayload?.matter ?? 'GENERIC';

  const jurisdictionKey = normalizeVenue(venueRaw);
  const venueKey = normalizeCourtDivision(courtDivisionRaw) || 'default';

  const venue = normalizeVenueCode(venueRaw);
  const matter_type = normalizeMatterType(matterRaw);
  const selection = selectLitigationTemplates({ matter_type, venue });

  const documents = selection.map((t) => {
    const slug = safeLowerSlug(String(t.doc_type).toLowerCase().replace(/_/g, '-'));
    const templateFile = t.file;
    return {
      kind: t.doc_type,
      docType: t.doc_type,
      slug,
      title: t.title,
      exhibit_code: t.exhibit_code ?? null,
      templateFile,
      templatePath: templateFile ?? null,
      candidates: [templateFile],
    };
  });

  return {
    jurisdictionKey,
    venueKey,
    selection: { matter_type, venue },
    documents,
  };
}
