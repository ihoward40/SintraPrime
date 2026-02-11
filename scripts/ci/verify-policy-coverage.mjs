import fs from "node:fs";

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

const args = process.argv.slice(2);
const reqIdx = args.indexOf("--required");
const covIdx = args.indexOf("--coverage");
if (reqIdx === -1 || covIdx === -1) {
  die(
    "usage: node verify-policy-coverage.mjs --required <required.json> --coverage <coverage.log>"
  );
}

const requiredPath = args[reqIdx + 1];
const coveragePath = args[covIdx + 1];

if (!requiredPath || requiredPath.startsWith("--")) {
  die("--required <file> is required");
}
if (!coveragePath || coveragePath.startsWith("--")) {
  die("--coverage <file> is required");
}

if (!fs.existsSync(requiredPath)) {
  // No required hits file => nothing to enforce.
  process.exit(0);
}

const required = readJson(requiredPath);
const requiredHits = new Set((required.required_hits ?? []).map(String));

if (requiredHits.size === 0) {
  // No schema changes => strict no-op.
  process.exit(0);
}

const coverageLines = new Set(readLines(coveragePath));

const missing = [];
for (const hit of requiredHits) {
  if (!coverageLines.has(hit)) missing.push(hit);
}

if (missing.length) {
  console.error("STRICT POLICY COVERAGE FAILED. Missing required policy hits:");
  for (const m of missing) console.error("  - " + m);
  console.error("\nTip: each missing line is: action<TAB>decision<TAB>code");
  process.exit(1);
}

process.exit(0);
