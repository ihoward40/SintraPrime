import fs from "node:fs";
import path from "node:path";
import { loadPublicKey, verifyDetached } from "../signing/ed25519.mjs";

const REPO = process.cwd();
const RUNS = path.join(REPO, "runs");
const PUB = path.join(REPO, "governance", "keys", "signing.ed25519.pub");

function fail(msg) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}

function listDeepthinkRunDirs() {
  if (!fs.existsSync(RUNS)) return [];
  const re = /^DEEPTHINK[_-]/;
  return fs
    .readdirSync(RUNS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && re.test(d.name))
    .map((d) => path.join(RUNS, d.name));
}

function anySignaturePresent(runDirs) {
  for (const dir of runDirs) {
    const manifest = path.join(dir, "manifest.json");
    if (fs.existsSync(manifest + ".sig")) return true;

    const tpmAtt = path.join(dir, "tpm_attestation.json");
    if (fs.existsSync(tpmAtt + ".sig")) return true;
  }
  return false;
}

const runDirs = listDeepthinkRunDirs();
if (runDirs.length === 0) {
  process.stdout.write("Signature verification: no DEEPTHINK_* runs present (skipped)\n");
  process.exit(0);
}

if (!anySignaturePresent(runDirs)) {
  process.stdout.write("Signature verification: no signatures present (skipped)\n");
  process.exit(0);
}

if (!fs.existsSync(PUB)) {
  fail(`Missing public key: ${path.relative(REPO, PUB)}`);
}

const pk = loadPublicKey(PUB);

for (const dir of runDirs) {
  // Tier 1: manifest.json.sig (if present)
  const manifest = path.join(dir, "manifest.json");
  const manifestSig = manifest + ".sig";
  if (fs.existsSync(manifest) && fs.existsSync(manifestSig)) {
    const msg = fs.readFileSync(manifest);
    const sigB64 = fs.readFileSync(manifestSig, "utf8").trim();
    if (!verifyDetached(msg, sigB64, pk)) {
      fail(`Bad signature: ${path.relative(REPO, manifestSig)}`);
    }
  }

  // Tier 2: tpm_attestation.json.sig (if present)
  const tpmAtt = path.join(dir, "tpm_attestation.json");
  const tpmSig = tpmAtt + ".sig";
  if (fs.existsSync(tpmAtt) && fs.existsSync(tpmSig)) {
    const msg = fs.readFileSync(tpmAtt);
    const sigB64 = fs.readFileSync(tpmSig, "utf8").trim();
    if (!verifyDetached(msg, sigB64, pk)) {
      fail(`Bad TPM attestation signature: ${path.relative(REPO, tpmSig)}`);
    }
  }
}

process.stdout.write("Signature verification passed\n");
