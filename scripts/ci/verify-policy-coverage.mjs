import fs from "node:fs";
import path from "node:path";

function policyIdFromSource(src) {
  const kind = src?.kind ? String(src.kind) : "?";
  const base =
    kind === "prefix"
      ? `prefix:${String(src?.prefix || "")}`
      : `action:${String(src?.action || "")}`;
  return `${base}|cap=${String(src?.capability || "")}|tier=${String(src?.tier || "")}`;
}

function appendStepSummary(lines) {
  const p = process.env.GITHUB_STEP_SUMMARY;
  if (!p) return;
  try {
    fs.appendFileSync(p, lines.join("\n") + "\n", "utf8");
  } catch {
    // Best-effort only.
  }
}

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function readLines(p) {
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function countLinesRaw(p) {
  if (!fs.existsSync(p)) return 0;
  const txt = fs.readFileSync(p, "utf8");
  if (txt === "") return 0;
  return txt.endsWith("\n") ? txt.split("\n").length - 1 : txt.split("\n").length;
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

const args = process.argv.slice(2);
const reqIdx = args.indexOf("--required");
const covIdx = args.indexOf("--coverage");
const mergedIdx = args.indexOf("--write-merged-required");
if (reqIdx === -1 || covIdx === -1) {
  die(
    "usage: node verify-policy-coverage.mjs --required <required.json> [--required <required2.json> ...] --coverage <coverage.log> [--write-merged-required <out.json>]"
  );
}

const requiredPaths = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--required") {
    const p = args[i + 1];
    if (!p || p.startsWith("--")) die("--required <file> is required");
    requiredPaths.push(p);
  }
}

const coveragePath = args[covIdx + 1];
if (!coveragePath || coveragePath.startsWith("--")) {
  die("--coverage <file> is required");
}

let mergedOutPath = null;
if (mergedIdx !== -1) {
  const p = args[mergedIdx + 1];
  if (!p || p.startsWith("--")) die("--write-merged-required <file> is required");
  mergedOutPath = p;
}

const existingRequiredPaths = requiredPaths.filter((p) => fs.existsSync(p));
if (existingRequiredPaths.length === 0) {
  process.exit(0);
}

const requiredHits = new Set();
const sources = {};
for (const p of existingRequiredPaths) {
  const required = readJson(p);
  for (const hit of required.required_hits ?? []) requiredHits.add(String(hit));
  if (required.sources && typeof required.sources === "object") {
    for (const [hit, src] of Object.entries(required.sources)) {
      const k = String(hit);
      if (!sources[k]) sources[k] = [];
      if (Array.isArray(src)) sources[k].push(...src);
    }
  }
}

if (requiredHits.size === 0) {
  // No schema changes => strict no-op.
  process.exit(0);
}

if (mergedOutPath) {
  const out = {
    kind: "ResolvedRequiredPolicyHits",
    generated_at: new Date().toISOString(),
    inputs: existingRequiredPaths,
    required_hits: Array.from(requiredHits).sort(),
    sources,
  };
  writeJson(mergedOutPath, out);
}

const coverageLines = new Set(readLines(coveragePath));
const coverageRawLineCount = countLinesRaw(coveragePath);

const missing = [];
for (const hit of requiredHits) {
  if (!coverageLines.has(hit)) missing.push(hit);
}

missing.sort();

const missingPolicyIds = new Set();
for (const m of missing) {
  const src = sources[m];
  if (!Array.isArray(src)) continue;
  for (const s of src) missingPolicyIds.add(policyIdFromSource(s));
}

const allPolicyIds = new Set();
for (const src of Object.values(sources)) {
  if (!Array.isArray(src)) continue;
  for (const s of src) allPolicyIds.add(policyIdFromSource(s));
}

appendStepSummary([
  "### STRICT policy coverage", 
  "",
  `- required_hits_count: ${requiredHits.size}`,
  `- sources_count: ${allPolicyIds.size}`,
  `- missing_hits_count: ${missing.length}`,
  `- coverage_file: ${coveragePath}`,
  `- coverage_file_lines: ${coverageRawLineCount}`,
  "",
  ...(missing.length
    ? [
        "**First missing hits**",
        "",
        ...missing.slice(0, 25).map((hit) => {
          const src = Array.isArray(sources[hit]) ? sources[hit] : [];
          const ids = [...new Set(src.map(policyIdFromSource))].filter(Boolean).sort();
          const via = ids.length ? ` (via ${ids.slice(0, 4).join(", ")}${ids.length > 4 ? ", …" : ""})` : "";
          return `- ${hit}${via}`;
        }),
        "",
      ]
    : []),
]);

const summaryOutPath = path.join(path.dirname(coveragePath), "verify-policy-coverage.summary.json");
writeJson(summaryOutPath, {
  kind: "VerifyPolicyCoverageSummary",
  generated_at: new Date().toISOString(),
  required_files: existingRequiredPaths,
  coverage_file: coveragePath,
  coverage_file_lines: coverageRawLineCount,
  required_hits_count: requiredHits.size,
  sources_count: allPolicyIds.size,
  observed_unique_hits_count: coverageLines.size,
  missing_hits_count: missing.length,
  missing_hits: missing,
  missing_policy_ids: Array.from(missingPolicyIds).filter(Boolean).sort(),
});

if (missing.length) {
  console.error("STRICT POLICY COVERAGE FAILED.");
  console.error(
    `Coverage file: ${coveragePath} (lines=${coverageRawLineCount}, unique_hits=${coverageLines.size})`
  );
  console.error("\nMissing hits:");
  for (const m of missing) console.error("  - " + m);

  const policyList = Array.from(missingPolicyIds).filter(Boolean).sort();
  console.error("\nFrom registry policies:");
  if (policyList.length === 0) {
    console.error("  (none)");
  } else {
    for (const p of policyList) console.error("  - " + p);
  }

  console.error("\nTip: each missing line is: action<TAB>decision<TAB>code");

  if (process.env.GITHUB_ACTIONS) {
    const repo = String(process.env.GITHUB_REPOSITORY || "");
    const ref = String(process.env.GITHUB_REF || "");
    console.error(
      `::error title=STRICT_POLICY_COVERAGE_FAILED::repo=${repo} ref=${ref} missing_hits=${missing.length} coverage=${coveragePath}`
    );
  }
  process.exit(1);
}

process.exit(0);
