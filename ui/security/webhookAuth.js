import crypto from "node:crypto";

const seenNonces = new Map();

function nowMs() {
  return Date.now();
}

function cleanNonceCache(maxEntries = 25_000) {
  const now = nowMs();
  if (seenNonces.size <= maxEntries) {
    // opportunistic cleanup of expired entries
    for (const [k, exp] of seenNonces.entries()) {
      if (now > exp) seenNonces.delete(k);
    }
    return;
  }

  // aggressive cleanup if we grew too large
  for (const [k, exp] of seenNonces.entries()) {
    if (now > exp) seenNonces.delete(k);
  }
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function verifySignedWebhook({
  secret,
  rawBody,
  timestamp,
  signature,
  nonce,
  maxSkewSeconds = 300,
  nonceTtlSeconds = 600,
}) {
  const sec = String(secret || "").trim();
  if (!sec) return { ok: false, reason: "missing_secret" };

  const tsRaw = String(timestamp || "").trim();
  const sigRaw = String(signature || "").trim();
  if (!tsRaw || !sigRaw) return { ok: false, reason: "missing_headers" };

  const tsNum = Number(tsRaw);
  if (!Number.isFinite(tsNum) || tsNum <= 0) return { ok: false, reason: "bad_timestamp" };

  const nowS = Math.floor(nowMs() / 1000);
  const skew = Math.abs(nowS - tsNum);
  if (skew > Math.max(30, Number(maxSkewSeconds || 300))) {
    return { ok: false, reason: "timestamp_skew" };
  }

  const body = String(rawBody || "");
  const base = `${tsNum}.${body}`;
  const expected = crypto.createHmac("sha256", sec).update(base).digest("hex");

  // Allow either "sha256=<hex>" or just <hex>
  const provided = sigRaw.startsWith("sha256=") ? sigRaw.slice("sha256=".length) : sigRaw;
  if (!safeEqual(expected, provided)) {
    return { ok: false, reason: "bad_signature" };
  }

  const nn = String(nonce || "").trim();
  if (nn) {
    cleanNonceCache();
    const key = `${tsNum}:${nn}`;
    if (seenNonces.has(key)) return { ok: false, reason: "replay" };
    const ttlMs = Math.max(30, Number(nonceTtlSeconds || 600)) * 1000;
    seenNonces.set(key, nowMs() + ttlMs);
  }

  return { ok: true };
}
