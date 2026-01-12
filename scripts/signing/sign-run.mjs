#!/usr/bin/env node
// Explicit signing step for a run folder (separate from DeepThink).
//
// Tier 1: signs manifest.json -> manifest.json.sig
// Tier 2: optional (backend-dependent) TPM attestation artifacts (not implemented here)

import fs from "node:fs";
import path from "node:path";
import { createSigner } from "./signer.mjs";

function die(msg) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}

function usage() {
  die(
    "Usage: node scripts/signing/sign-run.mjs --run <runs/DEEPTHINK_x> --backend <software|software-ed25519|tpm|tpm-windows> [--secret <secret.ed25519.key>] [--key <secret.ed25519.key>] [--dry-run]",
  );
}

function parseArgs(argv) {
  const out = { runDir: null, backend: null, secretKeyPath: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") {
      out.dryRun = true;
      continue;
    }
    if (a === "--run" && argv[i + 1]) {
      out.runDir = argv[++i];
      continue;
    }
    if (a === "--backend" && argv[i + 1]) {
      out.backend = argv[++i];
      continue;
    }
    if (a === "--secret" && argv[i + 1]) {
      out.secretKeyPath = argv[++i];
      continue;
    }
    if (a === "--key" && argv[i + 1]) {
      out.secretKeyPath = argv[++i];
      continue;
    }
    usage();
  }
  if (!out.runDir || !out.backend) usage();
  return out;
}

function main() {
  if (String(process.env.CI || "") === "1") {
    die("Refusing to run sign-run in CI");
  }

  const { runDir, backend, secretKeyPath, dryRun } = parseArgs(process.argv.slice(2));

  const backendNorm =
    backend === "software" ? "software-ed25519" : backend === "tpm" ? "tpm-windows" : backend;

  const secretKeyPathNorm = secretKeyPath || process.env.SINTRAPRIME_SIGNING_KEY || null;

  const repoRoot = process.cwd();
  const runAbs = path.resolve(repoRoot, runDir);
  const runsRoot = path.resolve(repoRoot, "runs");

  const rel = path.relative(runsRoot, runAbs);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    die("Refusing to sign outside runs/");
  }

  const manifestPath = path.join(runAbs, "manifest.json");
  if (!fs.existsSync(manifestPath)) die(`Missing manifest.json at ${path.relative(repoRoot, manifestPath)}`);

  const signer = createSigner({ backend: backendNorm, secretKeyPath: secretKeyPathNorm });

  const msg = fs.readFileSync(manifestPath);
  const { sigB64 } = signer.sign(msg);

  const sigPath = manifestPath + ".sig";
  if (dryRun) {
    process.stdout.write(`Dry-run: would write ${path.relative(repoRoot, sigPath)}\n`);
    process.stdout.write("Dry-run complete\n");
    return;
  }

  fs.writeFileSync(sigPath, sigB64 + "\n", "utf8");
  process.stdout.write(`Signed: ${path.relative(repoRoot, manifestPath)}\n`);
}

main();
