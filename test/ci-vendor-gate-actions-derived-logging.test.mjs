import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  if (res.status !== 0) {
    const msg = [
      `Command failed: ${cmd} ${args.join(" ")}`,
      `cwd: ${cwd}`,
      `status: ${res.status}`,
      res.stdout ? `stdout:\n${res.stdout}` : "",
      res.stderr ? `stderr:\n${res.stderr}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    throw new Error(msg);
  }
  return res;
}

const hasGit = spawnSync("git", ["--version"], { encoding: "utf8" }).status === 0;

test(
  "vendor gate: failure output includes Actions derived (flashlight contract)",
  { skip: !hasGit },
  () => {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const gatePath = path.join(repoRoot, "scripts", "ci", "require-vendor-checklist-ref.mjs");

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sintra-vendor-gate-log-"));
    try {
      run("git", ["init"], tmp);
      run("git", ["config", "user.email", "ci@example.com"], tmp);
      run("git", ["config", "user.name", "CI"], tmp);

      // Base commit
      fs.writeFileSync(path.join(tmp, "README.md"), "base\n", "utf8");
      run("git", ["add", "README.md"], tmp);
      run("git", ["commit", "-m", "base"], tmp);
      const baseSha = run("git", ["rev-parse", "HEAD"], tmp).stdout.trim();

      // Head commit: add a governed action schema change
      const schemaRel = path.posix.join("schemas", "competitive", "competitive.brief.v2.json");
      const schemaAbs = path.join(tmp, "schemas", "competitive", "competitive.brief.v2.json");
      fs.mkdirSync(path.dirname(schemaAbs), { recursive: true });
      fs.writeFileSync(schemaAbs, JSON.stringify({ schema: "competitive.brief.v2" }, null, 2) + "\n", "utf8");
      run("git", ["add", schemaRel], tmp);
      run("git", ["commit", "-m", "add schema"], tmp);
      const headSha = run("git", ["rev-parse", "HEAD"], tmp).stdout.trim();

      // Run the gate with an empty PR body so it fails on the checklist-ref rule.
      const execRes = spawnSync(process.execPath, [gatePath], {
        cwd: tmp,
        encoding: "utf8",
        env: {
          ...process.env,
          GITHUB_BASE_SHA: baseSha,
          GITHUB_HEAD_SHA: headSha,
          PR_BODY: "",
        },
      });

      assert.equal(execRes.status, 1, `Expected exit=1; got ${execRes.status}\n${execRes.stderr || ""}`);

      const stderr = String(execRes.stderr || "");
      assert.match(stderr, /Vendor schema\(s\) changed/i);
      assert.match(stderr, /Actions derived:/);
      assert.match(stderr, /competitive\.brief\.v2/);
      assert.match(stderr, new RegExp(schemaRel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }
);
