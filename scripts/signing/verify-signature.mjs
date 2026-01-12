import fs from "node:fs";
import { loadPublicKey, verifyDetached } from "./ed25519.mjs";

const manifestPath = process.argv[2];
const pubPath = process.argv[3];

if (!manifestPath || !pubPath) {
  process.stderr.write("Usage: node scripts/signing/verify-signature.mjs <manifest.json> <signing.ed25519.pub>\n");
  process.exit(1);
}

const sigPath = manifestPath + ".sig";

const msg = fs.readFileSync(manifestPath);
const sigB64 = fs.readFileSync(sigPath, "utf8").trim();
const pk = loadPublicKey(pubPath);

if (!verifyDetached(msg, sigB64, pk)) {
  process.stderr.write("Signature invalid\n");
  process.exit(1);
}

process.stdout.write("Signature valid\n");
