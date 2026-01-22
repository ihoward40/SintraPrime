import crypto from "node:crypto";

import { signReceiptEd25519, signReceiptHmac, receiptHash } from "../../../shared/lib/sign.mjs";

export function generatePublishReceipt({ content_id, platform, content_hash, status, result = null }) {
  const timestamp = new Date().toISOString();

  const receiptPayload = {
    receipt_id: crypto.randomUUID(),
    content_id,
    timestamp,
    platform,
    content_hash,
    status,
    result
  };

  const privateKeyPem = process.env.SOCIALOS_RECEIPT_ED25519_PRIVATE_KEY_PEM;
  const hmacSecret = process.env.SOCIALOS_RECEIPT_HMAC_KEY || "dev_insecure_hmac_key_change_me";

  const signature = privateKeyPem
    ? signReceiptEd25519(receiptPayload, privateKeyPem)
    : signReceiptHmac(receiptPayload, hmacSecret);

  const receipt_hash = receiptHash(receiptPayload);

  return {
    ...receiptPayload,
    signature,
    receipt_hash,
    verifier_link: null
  };
}
