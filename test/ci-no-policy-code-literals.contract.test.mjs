import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, "scripts", "ci", "no-policy-code-literals.mjs");

test("no-policy-code-literals: fails on unknown code and reports it", () => {
  const dir = path.join(ROOT, "test", ".tmp_policy_code_literals");
  fs.mkdirSync(dir, { recursive: true });

  const fakePath = path.join(dir, `fake_${Date.now()}_${Math.random().toString(16).slice(2)}.ts`);
  fs.writeFileSync(
    fakePath,
    [
      "// temp fixture created by test; should be removed",
      "export const x = { code: \"FAKE_NEW_CODE\" };",
      "",
    ].join("\n"),
    "utf8"
  );

  try {
    const r = spawnSync(process.execPath, [SCRIPT], {
      cwd: ROOT,
      encoding: "utf8",
    });

    assert.notEqual(r.status, 0);
    const combined = `${r.stdout || ""}\n${r.stderr || ""}`;
    assert.match(combined, /FAKE_NEW_CODE/);
    assert.match(combined, /FAIL: Found UNKNOWN policy code string literals/);
    assert.match(combined, /test\/\.tmp_policy_code_literals\//);
  } finally {
    try {
      fs.unlinkSync(fakePath);
    } catch {
      // ignore
    }
  }
});
