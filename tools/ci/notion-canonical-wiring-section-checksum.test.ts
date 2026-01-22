import fs from "node:fs";
import crypto from "node:crypto";
import { extractCanonicalWiringSection, normalizeHeaderRegexFromEnv } from "./canonicalWiringSection";

const RUNBOOK =
  process.env.NOTION_RUNBOOK_PATH ??
  "notion/job-templates/notion-hands-free-router-wiring.v1.md";

const rawHeaderEnv = process.env.CANONICAL_WIRING_HEADER_REGEX;
const expected = process.env.CANONICAL_WIRING_SECTION_SHA256;

if (!rawHeaderEnv) throw new Error("[checksum] Missing CANONICAL_WIRING_HEADER_REGEX env var.");
if (!expected) throw new Error("[checksum] Missing CANONICAL_WIRING_SECTION_SHA256 env var.");

// NOTE: Keep this logic in lockstep with tools/ci/print-canonical-wiring-metadata.mjs
const headerRe = normalizeHeaderRegexFromEnv(rawHeaderEnv);
const { section } = extractCanonicalWiringSection({ runbookPath: RUNBOOK, headerRe });

const sha = crypto.createHash("sha256").update(section, "utf8").digest("hex");

if (sha !== expected) {
  throw new Error(
    `[checksum] Canonical wiring section changed.\n` +
      `Expected: ${expected}\n` +
      `Actual:   ${sha}\n` +
      `If intentional: bump WIRING_VERSION and update CANONICAL_WIRING_SECTION_SHA256 (+ CANONICAL_WIRING_HEADER_VERSION).`
  );
}
