import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

test("registry required-hits file: sources.policy_id ⊆ registry_policy_ids", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sp-required-hits-"));
  const out = path.join(tmp, "required-policy-hits.registry.json");

  const r = spawnSync(process.execPath, ["--import", "tsx", "scripts/ci/generate-required-policy-hits-from-registry.mjs", "--out", out], {
    encoding: "utf8",
  });

  assert.equal(r.status, 0, `generator failed:\n${r.stderr || r.stdout}`);

  const j = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.ok(Array.isArray(j.required_hits), "required_hits must be an array");
  assert.ok(j.sources && typeof j.sources === "object", "sources must be an object map");
  assert.ok(Array.isArray(j.registry_policy_ids), "registry_policy_ids must be an array");

  const registry = new Set(j.registry_policy_ids.map(String));
  const bad = [];

  for (const srcs of Object.values(j.sources)) {
    if (!Array.isArray(srcs)) continue;
    for (const s of srcs) {
      const pid = s?.policy_id;
      if (typeof pid !== "string" || !pid.trim()) continue;
      if (!registry.has(pid)) bad.push(pid);
    }
  }

  assert.equal(bad.length, 0, `sources reference non-registry policy ids: ${bad.sort().join(", ")}`);
});
