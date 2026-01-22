// src/litigation/selector.js

import { normalizeCourtDivision, normalizeVenue } from './venues.js';

/**
 * Returns a list of candidate template paths (most-specific first).
 * Paths are workspace-relative, used only for disk reads.
 */
export function selectTemplateCandidates({
  venue,
  courtDivision,
  docType,
  variant,
}) {
  const venueNorm = normalizeVenue(venue);
  const divisionNorm = normalizeCourtDivision(courtDivision);
  const type = String(docType ?? '').trim().toLowerCase();
  const varPart = variant ? String(variant).trim().toLowerCase() : '';

  const candidates = [];

  // Venue + division override
  if (venueNorm && venueNorm !== 'common' && divisionNorm) {
    if (varPart) {
      candidates.push(`src/litigation/templates/${venueNorm}/${divisionNorm}/${type}.${varPart}.md`);
    }
    candidates.push(`src/litigation/templates/${venueNorm}/${divisionNorm}/${type}.md`);
  }

  // Venue override
  if (venueNorm && venueNorm !== 'common') {
    if (varPart) {
      candidates.push(`src/litigation/templates/${venueNorm}/${type}.${varPart}.md`);
    }
    candidates.push(`src/litigation/templates/${venueNorm}/${type}.md`);
  }

  // Common fallback
  if (varPart) candidates.push(`src/litigation/templates/common/${type}.${varPart}.md`);
  candidates.push(`src/litigation/templates/common/${type}.md`);

  return candidates;
}
