#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function die(msg) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {
    tag: "CI",
    objective: "CI smoke",
    runsRoot: "runs",
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tag" && argv[i + 1]) {
      out.tag = String(argv[++i]).trim();
      continue;
    }
    if (a === "--objective" && argv[i + 1]) {
      out.objective = String(argv[++i]).trim();
      continue;
    }
    if (a === "--runs-root" && argv[i + 1]) {
      out.runsRoot = String(argv[++i]).trim();
      continue;
    }
    die("Usage: node scripts/run-ci.mjs [--tag CI] [--objective \"CI smoke\"] [--runs-root runs]");
  }

  if (!out.tag || !out.objective) die("Missing --tag/--objective");
  return out;
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.error) throw r.error;
  return r;
}

function rmrf(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    // best effort
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  let runDir = null;
  try {
    const gen = run("node", [
      "tools/run-skeleton/run-skeleton.mjs",
      "--tag",
      args.tag,
      "--objective",
      args.objective,
      "--runs-root",
      args.runsRoot,
    ]);

    if (gen.status !== 0) {
      process.stderr.write(gen.stderr || "");
      die(`run-skeleton failed (exit ${gen.status})`);
    }

    const payload = JSON.parse((gen.stdout || "").trim());
    if (!payload || payload.ok !== true || typeof payload.run_dir !== "string") {
      die("run-skeleton did not return expected JSON");
    }

    runDir = payload.run_dir;

    const verify = run("node", ["verify-run.js", runDir, "--json"]);
    if (verify.status !== 0) {
      process.stderr.write(verify.stdout || "");
      process.stderr.write(verify.stderr || "");
      die(`verify-run failed (exit ${verify.status})`);
    }

    // Parseable output for CI logs: emit verifier JSON + the run-skeleton metadata.
    const verifyJson = JSON.parse((verify.stdout || "").trim());
    process.stdout.write(
      `${JSON.stringify({ ok: true, run_skeleton: payload, verify: verifyJson })}\n`,
    );
  } catch (e) {
    die(e instanceof Error ? e.message : String(e));
  } finally {
    if (runDir) {
      rmrf(runDir);
    }

    // If runsRoot is not the default, don't attempt to prune parent dirs.
    void path;
  }
}

main();
