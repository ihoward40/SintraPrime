import { sha256HexFromCanonical } from "./sha256.js";

function toUtf8Bytes(s) {
  return new TextEncoder().encode(String(s));
}

function toBase64(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function receiptBaseNoSignature(receipt) {
  return {
    receipt_id: receipt.receipt_id,
    content_id: receipt.content_id,
    timestamp: receipt.timestamp,
    platform: receipt.platform,
    content_hash: receipt.content_hash,
    status: receipt.status,
    result: receipt.result,
    verifier_link: receipt.verifier_link ?? null
  };
}

/**
 * Server algorithm (see socialos/shared/lib/sign.mjs):
 * - signature = HMAC_SHA256(secret, utf8(hashCanonicalJson(baseReceipt))) -> base64
 */
export async function computeReceiptSignatureHmac(receipt, secret) {
  const base = receiptBaseNoSignature(receipt);
  const baseHashHex = await sha256HexFromCanonical(base);

  const key = await crypto.subtle.importKey(
    "raw",
    toUtf8Bytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuf = await crypto.subtle.sign("HMAC", key, toUtf8Bytes(baseHashHex));
  return toBase64(new Uint8Array(sigBuf));
}

/**
 * Server algorithm (see socialos/shared/lib/sign.mjs):
 * - receipt_hash = hashCanonicalJson({ ...baseReceipt, signature }) -> hex
 */
export async function computeReceiptHash(receipt) {
  const base = receiptBaseNoSignature(receipt);
  const withSig = { ...base, signature: receipt.signature };
  return sha256HexFromCanonical(withSig);
}

export async function verifyReceiptHash(receipt) {
  const expected = await computeReceiptHash(receipt);
  const actual = String(receipt.receipt_hash || "").toLowerCase();
  return { ok: expected === actual, expected, actual };
}

export async function verifyReceiptSignatureHmac(receipt, secret) {
  const expected = await computeReceiptSignatureHmac(receipt, secret);
  const actual = String(receipt.signature || "");
  return { ok: expected === actual, expected, actual };
}
