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
    "usage: node verify-policy-coverage.mjs --required <required.json> [--required <required2.json> ...] --coverage <coverage.log>"
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

const coverageLines = new Set(readLines(coveragePath));

const missing = [];
for (const hit of requiredHits) {
  if (!coverageLines.has(hit)) missing.push(hit);
}

if (missing.length) {
  console.error("STRICT POLICY COVERAGE FAILED. Missing required policy hits:");
  for (const m of missing) {
    console.error("  - " + m);
    const src = sources[m];
    if (Array.isArray(src) && src.length) {
      const uniq = new Map();
      for (const s of src) {
        const kind = s?.kind ? String(s.kind) : "?";
        const key =
          kind === "prefix"
            ? `prefix:${String(s.prefix || "")}`
            : `action:${String(s.action || "")}`;
        if (!uniq.has(key)) uniq.set(key, s);
      }
      for (const s of uniq.values()) {
        const via = s.kind === "prefix" ? `prefix=${s.prefix}` : `action=${s.action}`;
        console.error(`      via ${via} cap=${s.capability} tier=${s.tier}`);
      }
    }
  }
  console.error("\nTip: each missing line is: action<TAB>decision<TAB>code");
  process.exit(1);
}

process.exit(0);
