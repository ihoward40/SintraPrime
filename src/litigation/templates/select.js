// src/litigation/templates/select.js

import {
  LITIGATION_TEMPLATES,
} from "./registry.js";

/** @typedef {import('./registry.js').MatterType} MatterType */
/** @typedef {import('./registry.js').Venue} Venue */
/** @typedef {import('./registry.js').DocType} DocType */

/**
 * @typedef {Object} TemplateSelectionInput
 * @property {MatterType} matter_type
 * @property {Venue} venue
 */

/** @type {DocType[]} */
const REQUIRED_DOCS = [
  "COMPLAINT",
  "VERIFIED_COMPLAINT",
  "ORDER_TO_SHOW_CAUSE",
  "TRO_MOTION",
  "CERTIFICATION",
  "PROPOSED_ORDER",
  "PROOF_OF_SERVICE",
];

/**
 * @param {DocType} doc
 * @param {MatterType} matter
 * @param {Venue} venue
 */
function pickBest(doc, matter, venue) {
  const candidates = LITIGATION_TEMPLATES.filter((t) => t.doc_type === doc);

  const ranked = candidates
    .map((t) => {
      const venueScore = t.venue === venue ? 3 : t.venue === "GENERIC" ? 1 : 0;
      const matterScore = t.matter_type === matter ? 3 : t.matter_type === "GENERIC" ? 1 : 0;
      return { t, score: venueScore * 10 + matterScore };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.t ?? null;
}

/**
 * Select templates by matter_type + venue with sane fallbacks.
 * - Exact venue+matter > venue+genericmatter > genericvenue+matter > generic+generic
 * @param {TemplateSelectionInput} input
 */
export function selectLitigationTemplates(input) {
  /** @type {import('./registry.js').TemplateDef[]} */
  const out = [];

  for (const doc of REQUIRED_DOCS) {
    const best = pickBest(doc, input.matter_type, input.venue);
    if (best) out.push(best);
  }

  const hasComplaint = out.some((t) => t.doc_type === "COMPLAINT");
  const hasPOS = out.some((t) => t.doc_type === "PROOF_OF_SERVICE");

  if (!hasComplaint) {
    const fallback = pickBest("COMPLAINT", "GENERIC", "GENERIC");
    if (fallback) out.unshift(fallback);
  }
  if (!hasPOS) {
    const fallback = pickBest("PROOF_OF_SERVICE", "GENERIC", "GENERIC");
    if (fallback) out.push(fallback);
  }

  out.sort((a, b) => {
    if (a.exhibit_code && b.exhibit_code) return a.exhibit_code.localeCompare(b.exhibit_code);
    if (a.exhibit_code) return -1;
    if (b.exhibit_code) return 1;
    return a.title.localeCompare(b.title);
  });

  return out;
}
