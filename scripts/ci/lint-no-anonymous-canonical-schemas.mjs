#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function die(msg) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(2);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listSchemaFiles(schemaDirAbs) {
  return fs
    .readdirSync(schemaDirAbs, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".schema.json"))
    .map((e) => path.join(schemaDirAbs, e.name));
}

function isCanonicalSchemaFile(baseName) {
  if (baseName.startsWith("make.") && baseName.endsWith(".schema.json")) return true;
  if (baseName.startsWith("v2-safety-attestation.") && baseName.endsWith(".schema.json")) return true;
  return false;
}

function normalizeRequired(v) {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}

function main() {
  const repoRoot = process.cwd();
  const schemaDir = path.join(repoRoot, "core", "schemas");
  // This repo may ship without the optional canonical core schemas tree.
  // In that case, skip truthfully (do not fail local dev or unrelated CI jobs).
  if (!fs.existsSync(schemaDir)) {
    process.stdout.write(`SKIP: no-anonymous canonical schema lint (missing: ${path.relative(repoRoot, schemaDir)})\n`);
    return;
  }

  const files = listSchemaFiles(schemaDir);
  if (!files.length) die(`No .schema.json files found in: ${schemaDir}`);

  const failures = [];

  for (const filePath of files) {
    const base = path.basename(filePath);
    if (!isCanonicalSchemaFile(base)) continue;

    let schema;
    try {
      schema = readJson(filePath);
    } catch (err) {
      failures.push({ file: base, problem: `invalid JSON: ${String(err?.message || err)}` });
      continue;
    }

    const required = normalizeRequired(schema?.required);
    const props = schema?.properties && typeof schema.properties === "object" ? schema.properties : {};
    const artifactProp = props?.artifact_id && typeof props.artifact_id === "object" ? props.artifact_id : null;

    if (!required.includes("artifact_id")) {
      failures.push({ file: base, problem: "missing required[] entry: artifact_id" });
      continue;
    }

    const minLength = typeof artifactProp?.minLength === "number" ? artifactProp.minLength : null;
    const typeOk = artifactProp?.type === "string";

    if (!artifactProp || !typeOk || !(typeof minLength === "number" && minLength >= 8)) {
      failures.push({
        file: base,
        problem: "artifact_id property must be { type: 'string', minLength: >= 8 }",
      });
    }
  }

  if (failures.length) {
    process.stderr.write("No-anonymous canonical schema lint FAILED:\n");
    for (const f of failures) {
      process.stderr.write(`- ${f.file}: ${f.problem}\n`);
    }
    process.exit(1);
  }

  process.stdout.write("OK: no-anonymous canonical schema lint passed\n");
}

main();
