import nacl from "tweetnacl";
import fs from "node:fs";

export function loadPublicKey(pubPath) {
  const b64 = fs.readFileSync(pubPath, "utf8").trim();
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length !== nacl.sign.publicKeyLength) throw new Error("Bad public key length");
  return new Uint8Array(bytes);
}

export function loadSecretKey(secretPath) {
  const b64 = fs.readFileSync(secretPath, "utf8").trim();
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length !== nacl.sign.secretKeyLength) throw new Error("Bad secret key length");
  return new Uint8Array(bytes);
}

export function signDetached(messageBytes, secretKey) {
  const sig = nacl.sign.detached(messageBytes, secretKey);
  return Buffer.from(sig).toString("base64");
}

export function verifyDetached(messageBytes, sigB64, publicKey) {
  const sig = new Uint8Array(Buffer.from(sigB64, "base64"));
  return nacl.sign.detached.verify(messageBytes, sig, publicKey);
}
