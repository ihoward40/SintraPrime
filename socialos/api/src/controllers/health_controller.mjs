import { getStore } from "../lib/store_factory.mjs";
import { verifyReceiptHash } from "../services/receipt_verify.mjs";

const ENABLED = process.env.SOCIALOS_HEALTH_RECEIPTS === "1" || process.env.NODE_ENV !== "production";
const FAIL_ON_MISMATCH = process.env.SOCIALOS_HEALTH_RECEIPTS_FAIL_ON_MISMATCH === "1";
const STORE_MODE = process.env.SOCIALOS_STORE || "dev";

export async function computeReceiptsHealth({ store, n = 1, kind = null } = {}) {
  const count = Math.min(Number(n || 1) || 1, 25);

  // list() is the source of truth for selection; stores should return newest-first.
  const items = await store.receipts.list({ content_id: null, platform: null, limit: Math.max(count, 10) });
  const filtered = kind ? items.filter((r) => r?.result?.kind === kind) : items;
  const sample = filtered.slice(0, count);

  const checks = sample.map((r) => {
    const v = verifyReceiptHash(r);
    return {
      ok: v.ok,
      receipt_id: r.receipt_id,
      stored: String(r.receipt_hash || "").slice(0, 16),
      recomputed: String(v.expected || "").slice(0, 16)
    };
  });

  const ok = checks.every((x) => x.ok);
  const mismatch = checks.filter((x) => !x.ok).length;
  return { ok, checked: checks.length, mismatch, checks };
}

export async function receiptsHealth(req, res, next) {
  try {
    if (!ENABLED) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const store = await getStore();
    const n = req.query.n || 1;
    const kind = req.query.kind || null;

    const result = await computeReceiptsHealth({ store, n, kind });

    if (FAIL_ON_MISMATCH && !result.ok) {
      res.status(500).json({ mode: STORE_MODE, ...result });
      return;
    }

    res.json({ mode: STORE_MODE, ...result });
  } catch (e) {
    next(e);
  }
}
