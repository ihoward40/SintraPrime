import { Router } from "express";
import {
  evaluateEmbeddingPolicy,
  normalizeUrlForCache,
  passesSsrfGuard,
  type PreflightResult,
} from "../lib/iframePreflight";

type CacheEntry = { value: PreflightResult; expiresAt: number };

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 200;

const cache = new Map<string, CacheEntry>();

function pruneCache() {
  const now = Date.now();
  cache.forEach((entry, key) => {
    if (entry.expiresAt <= now) cache.delete(key);
  });

  while (cache.size > MAX_ENTRIES) {
    const firstKey = cache.keys().next().value as string | undefined;
    if (!firstKey) break;
    cache.delete(firstKey);
  }
}

function cacheGet(key: string): PreflightResult | null {
  pruneCache();
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key: string, value: PreflightResult) {
  pruneCache();
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

function getAppOrigin(req: any): string {
  const host = req.get("host");
  const proto = (req.get("x-forwarded-proto") || req.protocol || "http")
    .toString()
    .split(",")[0]
    .trim();
  return `${proto}://${host}`;
}

async function fetchHeaders(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    return await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
  } catch {
    // Caller will decide whether to fallback to GET.
    throw new Error("HEAD_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHeadersViaGet(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });

    // Avoid downloading body; we only need headers.
    try {
      await res.body?.cancel();
    } catch {
      // ignore
    }

    return res;
  } finally {
    clearTimeout(timeout);
  }
}

const router = Router();

router.get("/iframe-preflight", async (req, res) => {
  const requestedUrl = String(req.query.url || "");
  const checkedAt = new Date().toISOString();

  const normalized = normalizeUrlForCache(requestedUrl);
  if (!normalized) {
    const result: PreflightResult = {
      requestedUrl,
      finalUrl: requestedUrl,
      status: null,
      allowed: null,
      reason: "INVALID_URL",
      checkedAt,
    };
    return res.status(200).json(result);
  }

  const cached = cacheGet(normalized);
  if (cached) return res.status(200).json(cached);

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    const result: PreflightResult = {
      requestedUrl,
      finalUrl: normalized,
      status: null,
      allowed: null,
      reason: "INVALID_URL",
      checkedAt,
    };
    cacheSet(normalized, result);
    return res.status(200).json(result);
  }

  const allowedBySsrf = await passesSsrfGuard(url);
  if (!allowedBySsrf) {
    const result: PreflightResult = {
      requestedUrl,
      finalUrl: normalized,
      status: null,
      allowed: null,
      reason: "BLOCKED_SSRF_GUARD",
      checkedAt,
    };
    cacheSet(normalized, result);
    return res.status(200).json(result);
  }

  const appOrigin = getAppOrigin(req);
  const targetOrigin = url.origin;

  try {
    let response: Response;
    let attemptedHead = false;

    try {
      attemptedHead = true;
      response = await fetchHeaders(url.toString());
    } catch {
      response = await fetchHeadersViaGet(url.toString());
    }

    const csp = response.headers.get("content-security-policy");
    const xFrameOptions = response.headers.get("x-frame-options");

    // If HEAD didn't produce relevant headers, retry with GET.
    if (!csp && !xFrameOptions && attemptedHead) {
      response = await fetchHeadersViaGet(url.toString());
    }

    const finalUrl = response.url || url.toString();
    const status = typeof response.status === "number" ? response.status : null;

    const evaluation = evaluateEmbeddingPolicy({
      status,
      headers: { csp, xFrameOptions },
      appOrigin,
      targetOrigin,
    });

    const result: PreflightResult = {
      requestedUrl,
      finalUrl,
      status,
      allowed: evaluation.allowed,
      reason: evaluation.reason,
      details: {
        xFrameOptions,
        csp,
        frameAncestors: evaluation.frameAncestors ?? null,
      },
      checkedAt,
    };

    cacheSet(normalized, result);
    return res.status(200).json(result);
  } catch (e: any) {
    const result: PreflightResult = {
      requestedUrl,
      finalUrl: normalized,
      status: null,
      allowed: null,
      reason: "FETCH_ERROR",
      details: {
        xFrameOptions: null,
        csp: null,
        frameAncestors: null,
      },
      checkedAt,
    };

    cacheSet(normalized, result);
    return res.status(200).json(result);
  }
});

export default router;
