import fs from "node:fs";
import crypto from "node:crypto";

function usage() {
  console.error("Usage: node scripts/identify-pubkey-algorithm.js <path-to-pubkey.pem>");
}

const inputPath = process.argv[2];
if (!inputPath) {
  usage();
  process.exit(2);
}

let pem;
try {
  pem = fs.readFileSync(inputPath);
} catch {
  console.error("ERROR: cannot read file:", inputPath);
  process.exit(2);
}

let key;
try {
  key = crypto.createPublicKey(pem);
} catch {
  console.error("ERROR: invalid public key file:", inputPath);
  process.exit(2);
}

// Node reports one of: 'rsa', 'ec', 'ed25519', 'ed448', etc.
const keyType = key.asymmetricKeyType;

const map = {
  ed25519: "Ed25519",
  rsa: "RSA",
  ec: "ECDSA",
};

const algorithm = map[keyType] ?? keyType;

// Print only the algorithm string, one line.
process.stdout.write(String(algorithm) + "\n");
