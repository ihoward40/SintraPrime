import fs from "node:fs";
import path from "node:path";
import { loadSecretKey, signDetached } from "./ed25519.mjs";

const manifestPath = process.argv[2];
const secretKeyPath = process.argv[3]; // keep OUT of repo

if (!manifestPath || !secretKeyPath) {
  process.stderr.write("Usage: node scripts/signing/sign-manifest.mjs <manifest.json> <secret.ed25519.key>\n");
  process.exit(1);
}

const msg = fs.readFileSync(manifestPath);
const sk = loadSecretKey(secretKeyPath);
const sigB64 = signDetached(msg, sk);

fs.writeFileSync(manifestPath + ".sig", sigB64 + "\n", "utf8");
process.stdout.write(`Signed manifest: ${path.basename(manifestPath)}\n`);
