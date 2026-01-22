import crypto from "node:crypto";

function timingSafeEqual(a, b) {
  const ba = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function verifySlackRequest({
  signingSecret,
  rawBody,
  timestamp,
  signature,
  toleranceSec = 60 * 5,
}) {
  const secret = String(signingSecret || "").trim();
  if (!secret) return { ok: false, reason: "missing_signing_secret" };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad_timestamp" };

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSec) return { ok: false, reason: "timestamp_out_of_range" };

  const sig = String(signature || "").trim();
  if (!sig.startsWith("v0=")) return { ok: false, reason: "bad_signature_format" };

  const base = `v0:${ts}:${String(rawBody || "")}`;
  const h = crypto.createHmac("sha256", secret).update(base, "utf8").digest("hex");
  const expected = `v0=${h}`;

  if (!timingSafeEqual(sig, expected)) return { ok: false, reason: "signature_mismatch" };

  return { ok: true };
}
