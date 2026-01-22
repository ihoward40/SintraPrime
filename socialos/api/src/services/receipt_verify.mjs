import { receiptHash } from "../../../shared/lib/sign.mjs";

export function recomputeReceiptHash(receipt) {
  const base = {
    receipt_id: receipt.receipt_id,
    content_id: receipt.content_id,
    timestamp: receipt.timestamp,
    platform: receipt.platform,
    content_hash: receipt.content_hash,
    status: receipt.status,
    result: receipt.result ?? null,
    verifier_link: receipt.verifier_link ?? null,
    signature: receipt.signature
  };

  return receiptHash(base);
}

export function verifyReceiptHash(receipt) {
  const expected = recomputeReceiptHash(receipt);
  const actual = String(receipt.receipt_hash || "").toLowerCase();
  return { ok: expected === actual, expected, actual };
}
