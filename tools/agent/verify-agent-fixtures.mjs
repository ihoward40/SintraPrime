#!/usr/bin/env node
/*
  Golden contract fixtures verifier.

  Reads JSON fixtures in fixtures/agent_contract/*.json and asserts they conform to
  the stable agent interface contract.

  Contract:
    - Success/failure: single-line JSON to stdout
    - --help/-h and --version are human-readable and exit 0
*/

import fs from "node:fs";
import path from "node:path";
import { emitOneLineJSON } from "./emit-jsonl.mjs";
import { AGENT_INTERFACE, AGENT_INTERFACE_VERSION } from "./interface-version.mjs";

const VERSION = "0.1.0";

let OUTPUT_JSON = true;

function usage() {
  return [
    `verify-agent-fixtures ${VERSION}`,
    "",
    "Usage:",
    "  node tools/agent/verify-agent-fixtures.mjs",
    "",
    "Notes:",
    "  - Validates fixtures/agent_contract/*.json against sintraprime.agent interface contract.",
  ].join("\n");
}

function die(code, msg, extra = {}) {
  if (OUTPUT_JSON) {
    emitOneLineJSON({ ok: false, error: String(msg), ...extra, kind: "VerifyAgentFixtures" });
  } else {
    process.stderr.write(`Error: ${msg}\n`);
  }
  process.exit(code);
}

function assert(cond, msg, extra = {}) {
  if (!cond) die(1, msg, extra);
}

function isSemver(s) {
  return typeof s === "string" && /^\d+\.\d+\.\d+$/.test(s);
}

function requireString(obj, key) {
  assert(typeof obj[key] === "string" && obj[key].length > 0, `Missing/invalid ${key}`, { key, got: obj[key] ?? null });
}

function validateFixture(obj, filename) {
  assert(obj && typeof obj === "object", "Fixture must be JSON object", { filename });

  assert(obj.interface === AGENT_INTERFACE, "interface mismatch", {
    filename,
    expected: AGENT_INTERFACE,
    got: obj.interface ?? null,
  });

  assert(obj.interface_version === AGENT_INTERFACE_VERSION, "interface_version mismatch", {
    filename,
    expected: AGENT_INTERFACE_VERSION,
    got: obj.interface_version ?? null,
  });

  assert(isSemver(obj.interface_version), "interface_version must be SemVer", { filename, got: obj.interface_version ?? null });

  assert(typeof obj.ok === "boolean", "Missing/invalid ok", { filename, got: obj.ok ?? null });

  if (obj.ok === true) {
    requireString(obj, "run_id");
    requireString(obj, "run_dir");

    assert(/^RUN-/.test(obj.run_id), "run_id should look like RUN-*", { filename, run_id: obj.run_id });
    assert(String(obj.run_dir).includes(obj.run_id), "run_dir should include run_id", { filename, run_dir: obj.run_dir, run_id: obj.run_id });

    if (obj.manifest_sha256 !== undefined && obj.manifest_sha256 !== null) {
      assert(
        typeof obj.manifest_sha256 === "string" && /^sha256:[0-9a-f]{64}$/i.test(obj.manifest_sha256),
        "manifest_sha256 must be sha256:<64hex> or null",
        { filename, got: obj.manifest_sha256 }
      );
    }

    if (obj.bundle !== undefined && obj.bundle !== null) {
      assert(typeof obj.bundle === "string", "bundle must be string or null", { filename, got: obj.bundle });
    }
  } else {
    requireString(obj, "error");
  }
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    OUTPUT_JSON = false;
    process.stdout.write(`${usage()}\n`);
    process.exit(0);
  }
  if (argv.includes("--version")) {
    OUTPUT_JSON = false;
    process.stdout.write(`verify-agent-fixtures ${VERSION}\n`);
    process.exit(0);
  }
  if (argv.length) {
    die(2, usage());
  }

  const repoRoot = process.cwd();
  const dir = path.join(repoRoot, "fixtures", "agent_contract");
  assert(fs.existsSync(dir), "Missing fixtures directory", { expected: dir });

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  assert(files.length > 0, "No fixture files found", { dir });

  for (const f of files) {
    const abs = path.join(dir, f);
    let obj;
    try {
      obj = JSON.parse(fs.readFileSync(abs, "utf8"));
    } catch (e) {
      die(1, "Fixture JSON parse failed", { file: `fixtures/agent_contract/${f}`, error: e instanceof Error ? e.message : String(e) });
    }
    validateFixture(obj, `fixtures/agent_contract/${f}`);
  }

  emitOneLineJSON({
    ok: true,
    kind: "VerifyAgentFixtures",
    fixtures_ok: true,
    fixtures_count: files.length,
  });
}

try {
  main();
} catch (e) {
  die(1, e instanceof Error ? e.message : String(e));
}
