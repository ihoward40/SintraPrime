import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts", "ci", "generate-required-policy-hits-from-registry.mjs");

test("required hits from registry: emits required_hits + sources", () => {
  const outDir = path.join(ROOT, ".tmp");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `required-policy-hits.registry.${Date.now()}.json`);

  const r = spawnSync(process.execPath, ["--import", "tsx", SCRIPT, "--out", outPath], {
    cwd: ROOT,
    encoding: "utf8",
  });

  assert.equal(r.status, 0, `expected exit 0, got ${r.status}\n${r.stdout}\n${r.stderr}`);
  const j = JSON.parse(fs.readFileSync(outPath, "utf8"));

  assert.equal(j.kind, "RequiredPolicyHitsFromRegistry");
  assert.ok(Array.isArray(j.required_hits));
  assert.ok(j.required_hits.length > 0);
  assert.ok(j.sources && typeof j.sources === "object");
  assert.ok(Array.isArray(j.registry_policy_ids));
  assert.ok(j.registry_policy_ids.length > 0);

  const metaPath = outPath.replace(/\.json$/i, ".meta.json");
  assert.ok(fs.existsSync(metaPath), "expected generator to emit .meta.json receipt");
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  assert.equal(typeof meta.out_sha256, "string");
  assert.ok(meta.out_sha256.length >= 32);

  // Contract: every required hit should have at least one provenance source.
  const sample = j.required_hits.slice(0, 25);
  for (const hit of sample) {
    assert.ok(Array.isArray(j.sources[hit]) && j.sources[hit].length > 0);
  }
});
