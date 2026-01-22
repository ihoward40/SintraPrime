#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import draft7Meta from "ajv/dist/refs/json-schema-draft-07.json" with { type: "json" };

const ROOT = process.cwd();
const SCHEMAS_DIR = path.join(ROOT, "core", "schemas");
const EXAMPLES_DIR = path.join(ROOT, "core", "examples");
const SOCIALOS_SCHEMAS_DIR = path.join(ROOT, "socialos", "shared", "schemas");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function listJsonFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".json"))
    .map((f) => path.join(dir, f));
}

// This repo may ship without the optional canonical core schemas/examples tree.
// In that case, skip truthfully (do not fail local dev or unrelated CI jobs).
if (!fs.existsSync(SCHEMAS_DIR) || !fs.existsSync(EXAMPLES_DIR)) {
  const missing = [];
  if (!fs.existsSync(SCHEMAS_DIR)) missing.push(path.relative(ROOT, SCHEMAS_DIR));
  if (!fs.existsSync(EXAMPLES_DIR)) missing.push(path.relative(ROOT, EXAMPLES_DIR));
  process.stdout.write(`SKIP: core schema validation (missing: ${missing.join(", ")})\n`);
  process.exit(0);
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

// Some repo schemas declare $schema as draft-07; Ajv2020 does not include that meta-schema by default.
// Register it explicitly so draft-07 schemas validate deterministically in CI.
ajv.addMetaSchema(draft7Meta);

const schemaFiles = listJsonFiles(SCHEMAS_DIR);
if (!schemaFiles.length) {
  process.stderr.write(`No schemas found in ${path.relative(ROOT, SCHEMAS_DIR)}\n`);
  process.exit(2);
}

const socialosSchemaFiles = fs.existsSync(SOCIALOS_SCHEMAS_DIR) ? listJsonFiles(SOCIALOS_SCHEMAS_DIR) : [];

for (const sf of schemaFiles) {
  const s = readJson(sf);
  if (!s.$id || typeof s.$id !== "string") {
    process.stderr.write(`Schema missing $id: ${path.relative(ROOT, sf)}\n`);
    process.exit(2);
  }
  ajv.addSchema(s);
}

for (const sf of socialosSchemaFiles) {
  const s = readJson(sf);
  if (!s.$id || typeof s.$id !== "string") {
    process.stderr.write(`Schema missing $id: ${path.relative(ROOT, sf)}\n`);
    process.exit(2);
  }
  ajv.addSchema(s);
}

const exampleFiles = listJsonFiles(EXAMPLES_DIR);
if (!exampleFiles.length) {
  process.stderr.write(`No examples found in ${path.relative(ROOT, EXAMPLES_DIR)}\n`);
  process.exit(2);
}

let ok = true;

for (const ef of exampleFiles) {
  const data = readJson(ef);
  const schemaId = data.schema_id;

  if (!schemaId || typeof schemaId !== "string") {
    process.stderr.write(`Example missing schema_id: ${path.relative(ROOT, ef)}\n`);
    ok = false;
    continue;
  }

  const validate = ajv.getSchema(schemaId);
  if (!validate) {
    process.stderr.write(`No schema registered for schema_id=${schemaId} (${path.relative(ROOT, ef)})\n`);
    ok = false;
    continue;
  }

  // Examples include schema_id as a harness field (not part of the schema payload).
  // Remove it before validation to avoid additionalProperties failures.
  const payload =
    data && typeof data === "object" && !Array.isArray(data)
      ? (() => {
          const c = { ...data };
          delete c.schema_id;
          return c;
        })()
      : data;

  const valid = validate(payload);
  if (!valid) {
    process.stderr.write(`Invalid example: ${path.relative(ROOT, ef)}\n`);
    process.stderr.write(JSON.stringify(validate.errors, null, 2) + "\n");
    ok = false;
  }
}

if (!ok) process.exit(1);
process.stdout.write(
  `OK: validated ${schemaFiles.length + socialosSchemaFiles.length} schemas ` +
    `(${schemaFiles.length} core + ${socialosSchemaFiles.length} socialos) and ${exampleFiles.length} examples\n`
);
