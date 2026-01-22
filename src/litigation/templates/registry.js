// src/litigation/templates/registry.js

/**
 * Venue codes used for template selection.
 * @typedef {"NJ-SUPERIOR"|"NJ-ESSEX"|"NY-SUPREME"|"FED-DNJ"|"GENERIC"} Venue
 */

/**
 * Matter types used for template selection.
 * @typedef {"CONSUMER"|"CIVIL"|"INJUNCTIVE"|"EMERGENCY"|"DEBT_DEFENSE"|"GENERIC"} MatterType
 */

/**
 * Document types used in the litigation packet.
 * @typedef {"COMPLAINT"|"VERIFIED_COMPLAINT"|"ORDER_TO_SHOW_CAUSE"|"TRO_MOTION"|"CERTIFICATION"|"PROPOSED_ORDER"|"PROOF_OF_SERVICE"} DocType
 */

/**
 * @typedef {Object} TemplateDef
 * @property {DocType} doc_type
 * @property {MatterType} matter_type
 * @property {Venue} venue
 * @property {string} file  Relative to the templates folder root
 * @property {string=} exhibit_code
 * @property {string} title
 */

/** @type {TemplateDef[]} */
export const LITIGATION_TEMPLATES = [
  // --- NJ defaults ---
  {
    doc_type: "COMPLAINT",
    matter_type: "CIVIL",
    venue: "NJ-SUPERIOR",
    file: "nj/complaint.md",
    exhibit_code: "L1-A",
    title: "Complaint",
  },
  {
    doc_type: "VERIFIED_COMPLAINT",
    matter_type: "CIVIL",
    venue: "NJ-SUPERIOR",
    file: "nj/verified-complaint.md",
    exhibit_code: "L1-B",
    title: "Verified Complaint",
  },
  {
    doc_type: "ORDER_TO_SHOW_CAUSE",
    matter_type: "EMERGENCY",
    venue: "NJ-SUPERIOR",
    file: "nj/order-to-show-cause.md",
    exhibit_code: "L1-C",
    title: "Order to Show Cause",
  },
  {
    doc_type: "TRO_MOTION",
    matter_type: "EMERGENCY",
    venue: "NJ-SUPERIOR",
    file: "nj/tro-motion.md",
    exhibit_code: "L1-D",
    title: "TRO / Motion",
  },
  {
    doc_type: "CERTIFICATION",
    matter_type: "CIVIL",
    venue: "NJ-SUPERIOR",
    file: "nj/certification.md",
    exhibit_code: "L1-E",
    title: "Certification",
  },
  {
    doc_type: "PROPOSED_ORDER",
    matter_type: "EMERGENCY",
    venue: "NJ-SUPERIOR",
    file: "nj/proposed-order.md",
    exhibit_code: "L1-F",
    title: "Proposed Order",
  },
  {
    doc_type: "PROOF_OF_SERVICE",
    matter_type: "CIVIL",
    venue: "NJ-SUPERIOR",
    file: "nj/proof-of-service.md",
    exhibit_code: "L1-G",
    title: "Proof of Service",
  },

  // --- Generic fallbacks ---
  {
    doc_type: "COMPLAINT",
    matter_type: "GENERIC",
    venue: "GENERIC",
    file: "generic/complaint.md",
    title: "Complaint (Generic)",
  },
  {
    doc_type: "PROOF_OF_SERVICE",
    matter_type: "GENERIC",
    venue: "GENERIC",
    file: "generic/proof-of-service.md",
    title: "Proof of Service (Generic)",
  },
];
