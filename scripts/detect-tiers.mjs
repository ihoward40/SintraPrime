#!/usr/bin/env node
/**
 * Derived Tier Detection (presence-based; derived-only)
 *
 * - No assertions: tier is computed from artifact presence.
 * - No implicit authority: this script does not gate execution.
 * - Deterministic output: stable ordering, no timestamps.
 *
 * Usage:
 *   node scripts/detect-tiers.mjs [--runs <runsDir>] [--out <file>]
 *
 * Default:
 *   prints JSON to stdout
 */

import fs from "node:fs";
import path from "node:path";

function die(msg) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = { runsDir: path.join(process.cwd(), "runs"), outFile: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--runs" && argv[i + 1]) {
      out.runsDir = argv[i + 1];
      i++;
      continue;
    }
    if (a === "--out" && argv[i + 1]) {
      out.outFile = argv[i + 1];
      i++;
      continue;
    }
    die(`Unknown arg: ${a}`);
  }
  return out;
}

function detectTierForFiles(fileNames) {
  const hasSig = fileNames.some((f) => f.endsWith(".sig"));
  const hasTpm = fileNames.includes("tpm_attestation.json");
  const hasHashes = fileNames.some((f) => f.endsWith(".sha256"));

  if (hasTpm) return "Tier 2";
  if (hasSig) return "Tier 1";
  if (hasHashes) return "Tier 0";
  return "Unclassified";
}

function main() {
  const { runsDir, outFile } = parseArgs(process.argv.slice(2));

  const runsAbs = path.resolve(process.cwd(), runsDir);

  const result = {
    derived: true,
    runs: [],
  };

  if (!fs.existsSync(runsAbs)) {
    const json = JSON.stringify(result, null, 2) + "\n";
    if (outFile) {
      fs.writeFileSync(path.resolve(process.cwd(), outFile), json, "utf8");
    } else {
      process.stdout.write(json);
    }
    return;
  }

  const dirs = fs
    .readdirSync(runsAbs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));

  for (const runName of dirs) {
    const runDir = path.join(runsAbs, runName);
    let files = [];
    try {
      files = fs.readdirSync(runDir);
    } catch {
      // ignore unreadable directories
      continue;
    }

    const tier = detectTierForFiles(files);
    result.runs.push({ run: runName, tier });
  }

  const json = JSON.stringify(result, null, 2) + "\n";
  if (outFile) {
    fs.writeFileSync(path.resolve(process.cwd(), outFile), json, "utf8");
  } else {
    process.stdout.write(json);
  }
}

main();
