import crypto from "node:crypto";
import { hashCanonicalJson } from "./hash.mjs";

/**
 * Simple, deployable signing:
 * - Uses Ed25519 if you provide a private key (recommended)
 * - Falls back to HMAC if you only have a shared secret
 */

export function signReceiptEd25519(receiptPayload, privateKeyPem) {
  const message = Buffer.from(hashCanonicalJson(receiptPayload), "utf8");
  const sig = crypto.sign(null, message, privateKeyPem);
  return sig.toString("base64");
}

export function signReceiptHmac(receiptPayload, secret) {
  const message = Buffer.from(hashCanonicalJson(receiptPayload), "utf8");
  const sig = crypto.createHmac("sha256", secret).update(message).digest("base64");
  return sig;
}

export function receiptHash(receiptPayload) {
  return hashCanonicalJson(receiptPayload);
}
