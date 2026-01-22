import fs from "node:fs";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { extractCanonicalWiringSection, normalizeHeaderRegexFromEnv } from "./canonicalWiringSection";

const RUNBOOK =
  process.env.NOTION_RUNBOOK_PATH ??
  "notion/job-templates/notion-hands-free-router-wiring.v1.md";

const rawEnv = process.env.CANONICAL_WIRING_HEADER_REGEX;
const approvedSha = process.env.CANONICAL_WIRING_SECTION_SHA256;
const approvedVerEnv = process.env.CANONICAL_WIRING_HEADER_VERSION;

if (!rawEnv || !approvedSha || !approvedVerEnv) {
  throw new Error("[version-bump] Missing required env vars.");
}

const parseStrictV = (s: string): number => {
  const m = String(s).trim().match(/^v([1-9][0-9]*)$/);
  if (!m) return Number.NaN;
  return Number(m[1]);
};

const approvedVer = parseStrictV(approvedVerEnv);
if (!Number.isFinite(approvedVer) || approvedVer <= 0) {
  throw new Error("[version-bump] Invalid CANONICAL_WIRING_HEADER_VERSION (expected ^v[1-9][0-9]*$)." );
}

const headerRe = normalizeHeaderRegexFromEnv(rawEnv);
const { section, version: derivedVersion } = extractCanonicalWiringSection({ runbookPath: RUNBOOK, headerRe });

const newVer = parseStrictV(derivedVersion);
if (!Number.isFinite(newVer) || newVer <= 0) {
  throw new Error("[version-bump] Bad derived wiring version (expected exact WIRING_VERSION: vN with N>=1)." );
}

const newSha = crypto.createHash("sha256").update(section, "utf8").digest("hex");

// 1) Require approved pins match the actual file (forces explicit audit updates).
if (newSha !== approvedSha) {
  throw new Error(
    `[version-bump] Canonical wiring SHA does not match approved pin.\n` +
      `Approved: ${approvedSha}\n` +
      `Actual:   ${newSha}\n` +
      `If intentional: bump WIRING_VERSION and update CANONICAL_WIRING_SECTION_SHA256.`
  );
}

if (newVer !== approvedVer) {
  throw new Error(
    `[version-bump] Canonical wiring version does not match approved pin.\n` +
      `Approved: v${approvedVer}\n` +
      `Actual:   v${newVer}\n` +
      `If intentional: update CANONICAL_WIRING_HEADER_VERSION.`
  );
}

// 2) PR-only enforcement: if the approved SHA changed vs the base parent, require version increment.
// GitHub Actions checks out a merge commit for PRs; the first parent is the base branch.
const isPullRequest = process.env.GITHUB_EVENT_NAME === "pull_request";
if (isPullRequest) {
  let baseYaml: string | null = null;
  try {
    baseYaml = execSync("git show HEAD^1:.github/workflows/ci.yml", {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
  } catch {
    // If we can't access the base parent, we can't deterministically enforce the bump.
    throw new Error(
      "[version-bump] Unable to read base workflow pins (expected PR merge commit with HEAD^1)."
    );
  }

  const baseShaMatch = baseYaml.match(/\bCANONICAL_WIRING_SECTION_SHA256:\s*['\"]([^'\"\n]+)['\"]/);
  const baseVerMatch = baseYaml.match(/\bCANONICAL_WIRING_HEADER_VERSION:\s*['\"]([^'\"\n]+)['\"]/);
  if (!baseShaMatch || !baseVerMatch) {
    throw new Error("[version-bump] Base workflow pins not found in HEAD^1:.github/workflows/ci.yml");
  }

  const baseSha = baseShaMatch[1];
  const baseVer = parseStrictV(baseVerMatch[1]);
  if (!Number.isFinite(baseVer) || baseVer <= 0) {
    throw new Error("[version-bump] Base CANONICAL_WIRING_HEADER_VERSION is invalid (expected ^v[1-9][0-9]*$)." );
  }

  if (baseSha !== approvedSha && !(approvedVer > baseVer)) {
    throw new Error(
      `[version-bump] Approved wiring SHA changed but WIRING_VERSION did not increment.\n` +
        `Base: v${baseVer} sha=${baseSha}\n` +
        `Now:  v${approvedVer} sha=${approvedSha}`
    );
  }
}
