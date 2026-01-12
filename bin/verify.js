#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

// Mechanical alias wrapper for the existing offline bundle verifier.
// No new verification logic; exit code is forwarded.

const repoRoot = process.cwd();
const target = path.join(repoRoot, "scripts", "verify.js");
const args = process.argv.slice(2);

const result = spawnSync(process.execPath, [target, ...args], {
  stdio: "inherit",
});

process.exit(typeof result.status === "number" ? result.status : 1);
