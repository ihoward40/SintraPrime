import { getStore } from "../lib/store_factory.mjs";
import { verifyReceiptHash } from "../services/receipt_verify.mjs";

export async function listReceipts(req, res, next) {
  try {
    const store = await getStore();
    const { content_id = null, platform = null, limit = "50" } = req.query;

    const items = await store.receipts.list({
      content_id,
      platform,
      limit: Math.min(Number(limit) || 50, 200)
    });

    res.json({ items });
  } catch (e) {
    next(e);
  }
}

export async function verifyReceipt(req, res, next) {
  try {
    const store = await getStore();
    const receipt = await store.receipts.get(req.params.id);
    if (!receipt) {
      res.status(404).json({ error: "Receipt not found" });
      return;
    }

    const v = verifyReceiptHash(receipt);
    res.json({
      ok: v.ok,
      receipt_id: receipt.receipt_id,
      receipt_hash: receipt.receipt_hash,
      recomputed_hash: v.expected
    });
  } catch (e) {
    next(e);
  }
}
