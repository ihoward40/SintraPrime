import nacl from "tweetnacl";
import fs from "node:fs";

function loadSecretKeyB64(secretPath) {
  const b64 = fs.readFileSync(secretPath, "utf8").trim();
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length !== nacl.sign.secretKeyLength) throw new Error("Bad secret key length");
  return new Uint8Array(bytes);
}

export function createSoftwareEd25519Signer({ secretKeyPath }) {
  if (!secretKeyPath) throw new Error("secretKeyPath is required for software-ed25519 backend");

  const secretKey = loadSecretKeyB64(secretKeyPath);
  const publicKeyB64 = Buffer.from(secretKey.slice(32)).toString("base64");

  return {
    kind: "software-ed25519",
    sign(bytes) {
      const sig = nacl.sign.detached(bytes, secretKey);
      return { sigB64: Buffer.from(sig).toString("base64"), kind: "ed25519" };
    },
    getPublicKeyB64() {
      return publicKeyB64;
    },
    getAttestation() {
      return null;
    },
  };
}
