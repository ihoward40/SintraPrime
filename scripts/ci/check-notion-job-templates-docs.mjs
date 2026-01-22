import fs from "node:fs/promises";
import path from "node:path";

function fail(message) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function parseVersionSegments(fileName) {
  // Matches: *.v1.md, *.v1.2.md, *.v10.0.3.md
  const m = String(fileName).match(/\.v(\d+(?:\.\d+)*)\.md$/);
  if (!m) return null;
  return m[1].split(".").map((x) => Number.parseInt(x, 10));
}

function cmpVersionSegments(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

async function listDir(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isFile()).map((e) => e.name);
}

async function readText(p) {
  return fs.readFile(p, "utf8");
}

async function assertFileExists(p, label) {
  if (!(await exists(p))) fail(`missing required file: ${label} (${p})`);
}

async function assertTextIncludes(filePath, text, needle, label) {
  if (!text.includes(needle)) {
    fail(`missing required reference in ${filePath}: ${label}\nExpected to find: ${needle}`);
  }
}

async function assertAllTokensPresent(filePath, text, tokens, label) {
  const missing = tokens.filter((t) => !text.includes(t));
  if (missing.length) {
    fail(
      [
        `missing required tokens in ${filePath}: ${label}`,
        "Missing:",
        ...missing.map((t) => `- ${t}`),
      ].join("\n")
    );
  }
}

async function latestVersionedDoc(dir, prefix) {
  const names = await listDir(dir);
  const candidates = names
    .filter((n) => n.startsWith(prefix) && n.endsWith(".md"))
    .map((n) => ({ name: n, v: parseVersionSegments(n) }))
    .filter((x) => Array.isArray(x.v));

  if (!candidates.length) return null;
  candidates.sort((a, b) => cmpVersionSegments(a.v, b.v));
  return candidates[candidates.length - 1].name;
}

async function main() {
  const repoRoot = process.cwd();

  const jobTemplatesDir = path.join(repoRoot, "notion", "job-templates");

  const wiringLatest = await latestVersionedDoc(jobTemplatesDir, "notion-hands-free-router-wiring.");
  const promptsLatest = await latestVersionedDoc(jobTemplatesDir, "notion-ai-master-router-prompts.");

  if (!wiringLatest) fail("no wiring doc found (expected notion-hands-free-router-wiring.v*.md)");
  if (!promptsLatest) fail("no prompts doc found (expected notion-ai-master-router-prompts.v*.md)");

  const wiringPath = path.join(jobTemplatesDir, wiringLatest);
  const promptsPath = path.join(jobTemplatesDir, promptsLatest);

  await assertFileExists(wiringPath, wiringLatest);
  await assertFileExists(promptsPath, promptsLatest);

  const canonicalWiringChangelogPath = path.join(jobTemplatesDir, "CANONICAL_WIRING_CHANGELOG.md");
  await assertFileExists(canonicalWiringChangelogPath, "CANONICAL_WIRING_CHANGELOG.md");

  const settingsPath = path.join(jobTemplatesDir, "system-settings.v1.json");
  await assertFileExists(settingsPath, "system-settings.v1.json");

  const compatibleSchemaPath = path.join(repoRoot, "core", "schemas", "job-command.v1.schema.json");
  await assertFileExists(compatibleSchemaPath, "core/schemas/job-command.v1.schema.json");

  // 1) README link targets must exist + point to latest versions.
  const jobTemplatesReadmePath = path.join(jobTemplatesDir, "README.md");
  const jobTemplatesReadme = await readText(jobTemplatesReadmePath);

  await assertTextIncludes(
    jobTemplatesReadmePath,
    jobTemplatesReadme,
    `(${wiringLatest})`,
    "job-templates README must point to latest wiring doc"
  );

  await assertTextIncludes(
    jobTemplatesReadmePath,
    jobTemplatesReadme,
    `(${promptsLatest})`,
    "job-templates README must point to latest prompts doc"
  );

  await assertTextIncludes(
    jobTemplatesReadmePath,
    jobTemplatesReadme,
    "(system-settings.v1.json)",
    "job-templates README must point to System Settings JSON"
  );

  // 2) Operator front-door docs must reference the wiring + prompts docs.
  const rootReadmePath = path.join(repoRoot, "README.md");
  const rootReadme = await readText(rootReadmePath);
  await assertTextIncludes(
    rootReadmePath,
    rootReadme,
    "(notion/job-templates/notion-hands-free-router-wiring.v1.md)",
    "root README must link to wiring doc"
  );
  await assertTextIncludes(
    rootReadmePath,
    rootReadme,
    "(notion/job-templates/notion-ai-master-router-prompts.v1.md)",
    "root README must link to prompts doc"
  );

  const operatorRunbookPath = path.join(repoRoot, "OPERATOR_RUNBOOK.md");
  const operatorRunbook = await readText(operatorRunbookPath);
  await assertTextIncludes(
    operatorRunbookPath,
    operatorRunbook,
    "(notion/job-templates/notion-hands-free-router-wiring.v1.md)",
    "operator runbook must link to wiring doc"
  );
  await assertTextIncludes(
    operatorRunbookPath,
    operatorRunbook,
    "(notion/job-templates/notion-ai-master-router-prompts.v1.md)",
    "operator runbook must link to prompts doc"
  );

  // 3) Wiring doc must declare the canonical settings file and schema.
  const wiringText = await readText(wiringPath);
  await assertTextIncludes(
    wiringPath,
    wiringText,
    "core/schemas/job-command.v1.schema.json",
    "wiring doc must declare Compatible Job Schema"
  );
  await assertTextIncludes(
    wiringPath,
    wiringText,
    "(system-settings.v1.json)",
    "wiring doc must link to canonical System Settings JSON"
  );

  // 4) Pinned-mode operator tokens must exist (prevents docs drift that breaks Make routers / triage).
  await assertAllTokensPresent(
    wiringPath,
    wiringText,
    [
      "PIN_SET_NOT_LOCKED",
      "PIN_MODE_DOWNGRADE_BLOCKED",
      "PIN_MODE_CLAIMS_PINNED_BUT_NO_PINS",
      "PIN_SET_PARTIAL_REFUSED",
      "PIN_SET_DIGEST_MISSING_FOR_PINNED_SET",
      "PIN_SET_TAMPERED",
      "NOTION_READBACK_TIMEOUT_OR_RATE_LIMIT",
      "NOTION_READBACK_FATAL_HTTP",
      "LOCKED_AT_MISSING_FOR_LOCKED_PIN_MODE",
      "LOCK_TIMESTAMP_INVALID",
      "LOCKED_PAGE_EDITED_AFTER_LOCK",
      "PAGE_LAST_EDITED_TIME_INVALID",
      "LOCKED_BLOCK_EDITED_AFTER_LOCK",
    ],
    "wiring doc must include pinned-mode FAIL_REASON codes"
  );

  // 5) Canonical pinned-mode wiring section must exist (one source of truth).
  const canonicalWiringHeader = "## Pinned-Mode Make Wiring (Module 0 → 90)";
  await assertTextIncludes(
    wiringPath,
    wiringText,
    canonicalWiringHeader,
    "wiring doc must include the canonical Module 0→90 pinned-mode wiring section"
  );

  const canonicalHeaderCount = wiringText.split(canonicalWiringHeader).length - 1;
  if (canonicalHeaderCount !== 1) {
    fail(
      `canonical wiring section header must appear exactly once in ${wiringPath}\n` +
        `Expected exactly 1 occurrence of: ${canonicalWiringHeader}\n` +
        `Found: ${canonicalHeaderCount}`
    );
  }

  // Strict boundary: canonical header must be followed immediately by exact WIRING_VERSION line.
  {
    const idx = wiringText.indexOf(canonicalWiringHeader);
    if (idx < 0) fail(`internal: canonical header missing after assert in ${wiringPath}`);

    const afterHeader = wiringText.slice(idx + canonicalWiringHeader.length);
    const afterHeaderNormalized = afterHeader.replace(/\r\n/g, "\n");
    const lines = afterHeaderNormalized.split("\n");
    const nextLine = (lines[1] ?? "").trimEnd();

    if (!/^WIRING_VERSION: v[1-9][0-9]*$/.test(nextLine)) {
      fail(
        `canonical wiring header must be followed immediately by an exact version line in ${wiringPath}\n` +
          `Expected: WIRING_VERSION: vN (N>=1)\n` +
          `Found: ${JSON.stringify(nextLine)}`
      );
    }
  }

  // 6) Retry policy constants must be present (prevents silent weakening).
  await assertTextIncludes(
    wiringPath,
    wiringText,
    "MAX_ATTEMPTS = 6",
    "wiring doc must declare MAX_ATTEMPTS retry constant"
  );
  await assertTextIncludes(
    wiringPath,
    wiringText,
    "BASE_SLEEP_SECONDS = 2",
    "wiring doc must declare BASE_SLEEP_SECONDS retry constant"
  );
  await assertTextIncludes(
    wiringPath,
    wiringText,
    "CAP_SLEEP_SECONDS = 32",
    "wiring doc must declare CAP_SLEEP_SECONDS retry constant"
  );
  await assertTextIncludes(
    wiringPath,
    wiringText,
    "TOTAL_TIMEOUT_SECONDS = 140",
    "wiring doc must declare TOTAL_TIMEOUT_SECONDS retry constant"
  );

  // eslint-disable-next-line no-console
  console.log(
    [
      "notion job-templates docs check: ok",
      `- wiring: ${wiringLatest}`,
      `- prompts: ${promptsLatest}`,
      "- system-settings.v1.json: present",
      "- schema: core/schemas/job-command.v1.schema.json: present"
    ].join("\n")
  );
}

await main();
