import fs from "node:fs";
import { extractCanonicalWiringSection, normalizeHeaderRegexFromEnv } from "./canonicalWiringSection";

const RUNBOOK =
  process.env.NOTION_RUNBOOK_PATH ??
  "notion/job-templates/notion-hands-free-router-wiring.v1.md";

const rawEnv = process.env.CANONICAL_WIRING_HEADER_REGEX;
if (!rawEnv) throw new Error("Missing CANONICAL_WIRING_HEADER_REGEX env var.");
const headerRe = normalizeHeaderRegexFromEnv(rawEnv);

const REQUIRED = [
  "PIN_MODE_DOWNGRADE_BLOCKED",
  "PIN_MODE_CLAIMS_PINNED_BUT_NO_PINS",
  "PIN_SET_PARTIAL_REFUSED",
  "PIN_SET_DIGEST_MISSING_FOR_PINNED_SET",
  "PIN_SET_TAMPERED",
  "NOTION_READBACK_TIMEOUT_OR_RATE_LIMIT",
  "NOTION_READBACK_FATAL_HTTP",
];

// Keep section extraction consistent with checksum + helper.
const rawMd = fs.readFileSync(RUNBOOK, "utf8");
const md = rawMd.replace(/\r\n/g, "\n");
// (md) used only for reading; canonical extraction re-reads internally for strictness.
void md;

const { section } = extractCanonicalWiringSection({ runbookPath: RUNBOOK, headerRe });

const missing = REQUIRED.filter((tok) => !section.includes(tok));
if (missing.length) {
  throw new Error(
    `[stop-signs] Canonical wiring section missing required tokens: ${missing.join(", ")}`
  );
}
