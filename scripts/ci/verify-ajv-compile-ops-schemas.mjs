// scripts/ci/verify-ajv-compile-ops-schemas.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function isRecord(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function validateSchemaHygiene({ file, json, repoRoot }) {
  const rel = path.relative(repoRoot, file);
  if (!isRecord(json)) fail(`FAIL: Schema JSON must be an object: ${rel}`);

  const allowedDrafts = new Set([
    "https://json-schema.org/draft/2020-12/schema",
    "http://json-schema.org/draft-07/schema#",
  ]);

  const dollarSchema = json["$schema"];
  const schemaKey = json["schema"];

  // Permanent guardrail: require an explicit $schema for schema files.
  if (typeof dollarSchema !== "string" || !dollarSchema.trim()) {
    // If someone accidentally wrote schema=<draft url> instead of $schema, catch it.
    if (typeof schemaKey === "string" && /json-schema\.org\//i.test(schemaKey)) {
      fail(
        `FAIL: ${rel}\n` +
          `Found top-level key "schema" with a JSON-Schema draft URI. This is almost certainly a typo.\n` +
          `Fix: rename "schema" -> "$schema" and keep the repo action marker under "schema": "<action>.vN" if needed.\n` +
          `Found: schema=${schemaKey}`
      );
    }
    fail(
      `FAIL: ${rel}\n` +
        `Missing required "$schema" (draft URI).\n` +
        `Allowed: ${[...allowedDrafts].join(" OR ")}`
    );
  }

  if (!allowedDrafts.has(dollarSchema)) {
    fail(
      `FAIL: ${rel}\n` +
        `Unsupported $schema draft: ${dollarSchema}\n` +
        `Allowed: ${[...allowedDrafts].join(" OR ")}`
    );
  }

  // Catch the most dangerous regression: schema=<draft url> while $schema exists but is wrong/missing.
  if (typeof schemaKey === "string" && /json-schema\.org\//i.test(schemaKey)) {
    fail(
      `FAIL: ${rel}\n` +
        `Top-level key "schema" must not be a JSON-Schema draft URI (reserved for the repo action marker).\n` +
        `Fix: move draft URI to "$schema" and keep "schema": "<action>.vN".\n` +
        `Found: schema=${schemaKey}`
    );
  }
}

// Robust repo root: scripts/ci -> scripts -> repo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

// Define “ops schemas” search roots (repo-truth based on your layout)
// If you later decide ops-only means a narrower set, tighten roots here.
const ROOTS = [
  path.join(repoRoot, "schemas"),
  path.join(repoRoot, "notion", "schemas"),
  // OPTIONAL: uncomment if you actually have ops/ schemas in your tree
  // path.join(repoRoot, "ops", "schemas"),
];

// Collect candidate schema files
const schemaFiles = [];
for (const root of ROOTS) {
  for (const f of walk(root)) {
    // Include both *.schema.json and other JSON schemas under schemas/
    if (
      f.endsWith(".schema.json") ||
      (f.includes(`${path.sep}schemas${path.sep}`) && f.endsWith(".json"))
    ) {
      schemaFiles.push(f);
    }
  }
}

// Filter to JSON Schema-ish files (avoid pulling random JSON config files)
const likelySchemas = schemaFiles.filter((f) => {
  const base = path.basename(f);
  if (base === "policyRegistry.snapshot.json") return false;
  if (base === "package.json") return false;
  // Keep: anything in schemas/** or notion/schemas/**
  return true;
});

if (likelySchemas.length === 0) {
  fail(
    `FAIL: No schema JSON files found.\n` +
      `repoRoot=${repoRoot}\n` +
      `roots=${ROOTS.join(", ")}\n`
  );
}

let addFormats = null;
try {
  addFormats = (await import("ajv-formats")).default;
} catch {
  // formats optional
}

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  allowUnionTypes: true,
  loadSchema: async (uri) => {
    // Repo-local resolution only; no network.
    // If you use custom $id resolution elsewhere, keep it consistent here.
    throw new Error(`External $ref not supported in CI verifier: ${uri}`);
  },
});

if (addFormats) addFormats(ajv);

// Preload all schemas by filename so local $refs can resolve if you use relative refs.
// NOTE: Relative $refs are resolved by AJV from the current file path when using addSchema with key.
// We add each schema under its absolute path key.
const parsed = [];
for (const file of likelySchemas) {
  const txt = fs.readFileSync(file, "utf8");
  try {
    const json = JSON.parse(txt);
    validateSchemaHygiene({ file, json, repoRoot });
    parsed.push({ file, json });
  } catch (e) {
    fail(`FAIL: Invalid JSON: ${path.relative(repoRoot, file)}\n${String(e)}`);
  }
}

// Add schemas to AJV
for (const { file, json } of parsed) {
  try {
    ajv.addSchema(json, file);
  } catch (e) {
    fail(`FAIL: ajv.addSchema error for ${path.relative(repoRoot, file)}\n${String(e)}`);
  }
}

// Compile each schema
for (const { file, json } of parsed) {
  try {
    ajv.compile(json);
  } catch (e) {
    const rel = path.relative(repoRoot, file);
    fail(`FAIL: AJV compile failed: ${rel}\n${String(e)}`);
  }
}

console.log(`OK: AJV compiled ${parsed.length} schema JSON files.`);
process.exit(0);
