import fs from "node:fs";
import { execSync } from "node:child_process";

const RUNBOOK =
  process.env.NOTION_RUNBOOK_PATH ??
  "notion/job-templates/notion-hands-free-router-wiring.v1.md";

const CHANGELOG =
  process.env.CANONICAL_WIRING_CHANGELOG_PATH ??
  "notion/job-templates/CANONICAL_WIRING_CHANGELOG.md";

function extractPins(yaml: string): { sha: string | null; ver: string | null } {
  const shaMatch = yaml.match(/\bCANONICAL_WIRING_SECTION_SHA256:\s*['\"]([^'\"\n]+)['\"]/);
  const verMatch = yaml.match(/\bCANONICAL_WIRING_HEADER_VERSION:\s*['\"]([^'\"\n]+)['\"]/);
  return { sha: shaMatch ? shaMatch[1] : null, ver: verMatch ? verMatch[1] : null };
}

const isPullRequest = process.env.GITHUB_EVENT_NAME === "pull_request";
if (!isPullRequest) {
  process.exit(0);
}

let baseYaml: string;
try {
  baseYaml = execSync("git show HEAD^1:.github/workflows/ci.yml", {
    stdio: ["ignore", "pipe", "ignore"],
    encoding: "utf8",
  });
} catch {
  throw new Error(
    "[pins-doc-coupling] Unable to read base workflow (expected PR merge commit with HEAD^1)."
  );
}

const headYaml = fs.readFileSync(".github/workflows/ci.yml", "utf8");
const basePins = extractPins(baseYaml);
const headPins = extractPins(headYaml);

if (!basePins.sha || !basePins.ver || !headPins.sha || !headPins.ver) {
  throw new Error(
    "[pins-doc-coupling] Missing wiring pins in base or head .github/workflows/ci.yml."
  );
}

const pinsChanged = basePins.sha !== headPins.sha || basePins.ver !== headPins.ver;
if (!pinsChanged) {
  process.exit(0);
}

const changedFiles = execSync("git diff --name-only HEAD^1..HEAD", {
  stdio: ["ignore", "pipe", "ignore"],
  encoding: "utf8",
})
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

const runbookChanged = changedFiles.includes(RUNBOOK);
const changelogChanged = changedFiles.includes(CHANGELOG);

if (!runbookChanged || !changelogChanged) {
  throw new Error(
    `READBACK_FAIL: CANONICAL_WIRING_PINS_CHANGED_WITHOUT_DOCS\n` +
      `Pins changed in .github/workflows/ci.yml, but required docs were not modified.\n` +
      `Required: ${RUNBOOK} AND ${CHANGELOG}`
  );
}
