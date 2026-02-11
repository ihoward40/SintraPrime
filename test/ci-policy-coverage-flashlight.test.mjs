import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

test("verify-policy-coverage failure output includes Missing hits + receipts", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sp-policy-verify-"));
  const coverage = path.join(tmp, "policy-coverage.log");

  // empty coverage => guaranteed miss
  fs.writeFileSync(coverage, "", "utf8");

  const r = spawnSync(process.execPath, [
    "scripts/ci/verify-policy-coverage.mjs",
    "--coverage",
    coverage,
    "--required",
    "fixtures/policy-coverage-required.hits.json",
  ], { encoding: "utf8" });

  assert.notEqual(r.status, 0, "expected verifier to fail with empty coverage");
  const stderr = r.stderr || "";

  assert.ok(stderr.includes("STRICT POLICY COVERAGE FAILED."), `stderr missing header:\n${stderr}`);
  assert.ok(stderr.includes("Coverage file:"), `stderr missing coverage file line:\n${stderr}`);
  assert.ok(stderr.includes("Missing hits:"), `stderr missing missing-hits section:\n${stderr}`);
  assert.ok(stderr.includes("From registry policies:"), `stderr missing registry policy section:\n${stderr}`);
});
