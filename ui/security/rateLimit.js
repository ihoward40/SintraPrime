import { emitRateLimitTriggered } from "./securityEvents.js";

const buckets = new Map();

export function createRateLimiter({ windowMs, max, keyFn, label }) {
  const w = Math.max(250, Number(windowMs || 60_000));
  const m = Math.max(1, Number(max || 60));
  const name = String(label || "default");
  const keyFnSafe = typeof keyFn === "function" ? keyFn : (req) => req.ip;

  return function rateLimiter(req, res, next) {
    const key = String(keyFnSafe(req) || "unknown");
    const now = Date.now();
    const resetAfter = now + w;

    // opportunistic cleanup
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets.entries()) {
        if (now > b.resetAt) buckets.delete(k);
      }
    }

    let bucket = buckets.get(`${name}:${key}`);
    if (!bucket) {
      bucket = { count: 0, resetAt: resetAfter };
      buckets.set(`${name}:${key}`, bucket);
    }

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = resetAfter;
    }

    bucket.count += 1;

    if (bucket.count > m) {
      emitRateLimitTriggered({
        label: name,
        key,
        ip: req.ip,
        path: req.path,
        method: req.method,
      });
      res.status(429).json({ ok: false, error: "Too many requests" });
      return;
    }

    next();
  };
}
