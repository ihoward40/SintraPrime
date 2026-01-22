#!/usr/bin/env node

import path from "node:path";
import { spawnSync } from "node:child_process";

function die(msg) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {
    runId: null,
    runsRoot: "runs",
    passthrough: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "--run-id" && argv[i + 1]) {
      out.runId = String(argv[++i]).trim();
      continue;
    }

    if (a === "--runs-root" && argv[i + 1]) {
      out.runsRoot = String(argv[++i]).trim();
      continue;
    }

    // Pass through any other args (including --json)
    out.passthrough.push(a);
  }

  if (!out.runId) {
    die("Usage: npm run -s verify:run -- --run-id RUN-... [--runs-root runs] [--json]");
  }

  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const runDir = path.join(args.runsRoot, args.runId);
  const r = spawnSync("node", ["verify-run.js", runDir, ...args.passthrough], { encoding: "utf8" });

  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);

  process.exit(r.status ?? 1);
}

main();
