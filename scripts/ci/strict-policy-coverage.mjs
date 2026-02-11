import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (r.error) {
    console.error(String(r.error));
    process.exit(1);
  }
  if (typeof r.status !== "number") process.exit(1);
  if (r.status !== 0) process.exit(r.status);
}

const root = process.cwd();
const tmpDir = path.join(root, ".tmp");
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.mkdirSync(tmpDir, { recursive: true });

run(process.execPath, [
  "scripts/ci/generate-required-policy-hits-from-registry.mjs",
  "--out",
  ".tmp/required-policy-hits.registry.json",
]);

if (process.platform === "win32") {
  run(
    "cmd.exe",
    ["/d", "/s", "/c", "npm", "test"],
    {
      POLICY_COVERAGE_FILE: ".tmp/policy-coverage.log",
      POLICY_COVERAGE_STRICT: "1",
    }
  );
} else {
  run("npm", ["test"], {
    POLICY_COVERAGE_FILE: ".tmp/policy-coverage.log",
    POLICY_COVERAGE_STRICT: "1",
  });
}

run(process.execPath, [
  "scripts/ci/verify-policy-coverage.mjs",
  "--coverage",
  ".tmp/policy-coverage.log",
  "--required",
  "fixtures/policy-coverage-required.hits.json",
  "--required",
  ".tmp/required-policy-hits.registry.json",
]);
