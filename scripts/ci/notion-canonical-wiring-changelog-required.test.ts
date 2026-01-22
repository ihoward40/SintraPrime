import fs from "node:fs";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import {
  extractCanonicalWiringSection,
  normalizeHeaderRegexFromEnv,
} from "../../tools/ci/canonicalWiringSection";

const RUNBOOK =
  process.env.NOTION_RUNBOOK_PATH ??
  "notion/job-templates/notion-hands-free-router-wiring.v1.md";

const CHANGELOG =
  process.env.CANONICAL_WIRING_CHANGELOG_PATH ??
  "notion/job-templates/CANONICAL_WIRING_CHANGELOG.md";

const rawHeaderEnv = process.env.CANONICAL_WIRING_HEADER_REGEX;
const approvedSha = process.env.CANONICAL_WIRING_SECTION_SHA256;
const approvedVerEnv = process.env.CANONICAL_WIRING_HEADER_VERSION;

if (!rawHeaderEnv || !approvedSha || !approvedVerEnv) {
  throw new Error(
    "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_BAD_FORMAT\n" +
      "Missing required env vars: CANONICAL_WIRING_HEADER_REGEX / CANONICAL_WIRING_SECTION_SHA256 / CANONICAL_WIRING_HEADER_VERSION."
  );
}

const parseStrictV = (s: string): number => {
  const m = String(s).trim().match(/^v([1-9][0-9]*)$/);
  if (!m) return Number.NaN;
  return Number(m[1]);
};

const isPullRequest = process.env.GITHUB_EVENT_NAME === "pull_request";
if (!isPullRequest) {
  process.exit(0);
}

// Step A — compute current
const headerRe = normalizeHeaderRegexFromEnv(rawHeaderEnv);
const extracted = extractCanonicalWiringSection({ runbookPath: RUNBOOK, headerRe });

const currentSha = crypto
  .createHash("sha256")
  .update(extracted.section, "utf8")
  .digest("hex");

const currentVer = parseStrictV(extracted.version);
if (!Number.isFinite(currentVer) || currentVer <= 0) {
  throw new Error(
    "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_BAD_FORMAT\n" +
      `Invalid derived WIRING_VERSION from canonical section: ${JSON.stringify(extracted.version)}`
  );
}

// Sanity: pins should match the runbook (keeps this gate deterministic)
if (approvedSha !== currentSha || parseStrictV(approvedVerEnv) !== currentVer) {
  // Let existing gates explain the mismatch; keep token stable.
  throw new Error(
    "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_BAD_FORMAT\n" +
      "Pins must match the current runbook before changelog enforcement."
  );
}

// Step B — compute base
let baseYaml: string;
try {
  baseYaml = execSync("git show HEAD^1:.github/workflows/ci.yml", {
    stdio: ["ignore", "pipe", "ignore"],
    encoding: "utf8",
  });
} catch {
  throw new Error(
    "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_BAD_FORMAT\n" +
      "Unable to read base workflow pins (expected PR merge commit with HEAD^1)."
  );
}

const baseShaMatch = baseYaml.match(/\bCANONICAL_WIRING_SECTION_SHA256:\s*['\"]([^'\"\n]+)['\"]/);
const baseVerMatch = baseYaml.match(/\bCANONICAL_WIRING_HEADER_VERSION:\s*['\"]([^'\"\n]+)['\"]/);
if (!baseShaMatch || !baseVerMatch) {
  throw new Error(
    "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_BAD_FORMAT\n" +
      "Base workflow missing CANONICAL_WIRING_SECTION_SHA256 or CANONICAL_WIRING_HEADER_VERSION."
  );
}

const baseSha = baseShaMatch[1];
const baseVer = parseStrictV(baseVerMatch[1]);
if (!Number.isFinite(baseVer) || baseVer <= 0) {
  throw new Error(
    "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_BAD_FORMAT\n" +
      `Base CANONICAL_WIRING_HEADER_VERSION invalid: ${JSON.stringify(baseVerMatch[1])}`
  );
}

// Step C — enforce
if (currentSha !== baseSha) {
  if (!(currentVer > baseVer)) {
    // Version bump test covers this; keep a deterministic message.
    throw new Error(
      "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_BAD_FORMAT\n" +
        `WIRING_VERSION must strictly increase when wiring sha changes (base=v${baseVer}, now=v${currentVer}).`
    );
  }

  if (!fs.existsSync(CHANGELOG)) {
    throw new Error(
      "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_MISSING_FOR_VERSION\n" +
        `Missing changelog file: ${CHANGELOG}`
    );
  }

  const text = fs.readFileSync(CHANGELOG, "utf8").replace(/\r\n/g, "\n");
  const lines = text.split("\n").map((l) => l.trimEnd());

  const vTag = `v${currentVer}`;

  const entryRe = new RegExp(
    `^${vTag} \\| (\\d{4}-\\d{2}-\\d{2}) \\| ([^|\\r\\n]+\\.)$`
  );

  const matching: { line: string; date: string; sentence: string }[] = [];

  for (const line of lines) {
    if (!line) continue;

    const looksLikeEntry = /^v[1-9][0-9]*\s*\|/.test(line);
    const m = line.match(entryRe);

    if (m) {
      const date = m[1];
      const sentence = m[2];
      if (sentence.length < 10 || sentence.length > 140) {
        throw new Error(
          "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_BAD_FORMAT\n" +
            `Sentence length out of bounds for ${vTag} (expected 10–140 chars including period).`
        );
      }

      // Validate ISO date is a real UTC day (rejects 2026-02-30).
      const d = new Date(`${date}T00:00:00Z`);
      if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) {
        throw new Error(
          "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_BAD_FORMAT\n" +
            `Invalid ISO date for ${vTag}: ${date}`
        );
      }

      matching.push({ line, date, sentence });
      continue;
    }

    // If it looks like an entry but doesn't match the strict format, fail.
    if (looksLikeEntry) {
      throw new Error(
        "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_BAD_FORMAT\n" +
          `Bad changelog entry format: ${JSON.stringify(line)}`
      );
    }

    // Any other non-empty line is disallowed (keeps file court-grade, no ambiguity).
    throw new Error(
      "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_BAD_FORMAT\n" +
        `Unexpected line in changelog: ${JSON.stringify(line)}`
    );
  }

  if (matching.length === 0) {
    throw new Error(
      "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_MISSING_FOR_VERSION\n" +
        `Expected exactly one entry for ${vTag} in ${CHANGELOG}.`
    );
  }

  if (matching.length > 1) {
    throw new Error(
      "READBACK_FAIL: CANONICAL_WIRING_CHANGELOG_DUPLICATE_VERSION_ENTRY\n" +
        `Found ${matching.length} entries for ${vTag} in ${CHANGELOG}.`
    );
  }
}
