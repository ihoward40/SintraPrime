import express from "express";
import path from "node:path";
import { eventBus } from "../core/eventBus.js";
import { createRateLimiter } from "../security/rateLimit.js";
import { verifySignedWebhook } from "../security/webhookAuth.js";
import { appendJsonl } from "../services/jsonlStore.js";

const router = express.Router();

function envFlag(name) {
  return String(process.env[name] || "").trim() === "1";
}

function requireOrAllowUnverified(req, res, { secretEnv, label }) {
  const allowUnverified = envFlag("SINTRA_WEBHOOK_ALLOW_UNVERIFIED");
  const secret = String(process.env[secretEnv] || "").trim();

  if (!secret) {
    if (allowUnverified) return { ok: true, reason: "unverified_allowed" };
    res.status(503).json({
      ok: false,
      error: "missing_webhook_secret",
      hint: `Set ${secretEnv} (or SINTRA_WEBHOOK_ALLOW_UNVERIFIED=1 for local testing).`,
      label,
    });
    return { ok: false, responded: true };
  }

  const ts = req.get("X-Sintra-Timestamp");
  const sig = req.get("X-Sintra-Signature");
  const nonce = req.get("X-Sintra-Nonce");
  const rawBody = req.rawBody || "";

  const v = verifySignedWebhook({
    secret,
    rawBody,
    timestamp: ts,
    signature: sig,
    nonce,
    maxSkewSeconds: Number(process.env.SINTRA_WEBHOOK_MAX_SKEW_S || 300),
    nonceTtlSeconds: Number(process.env.SINTRA_WEBHOOK_NONCE_TTL_S || 600),
  });

  if (!v.ok) {
    res.status(401).json({ ok: false, error: "invalid_signature", reason: v.reason, label });
    return { ok: false, responded: true };
  }

  return { ok: true };
}

function safeStr(v) {
  return v == null ? "" : String(v);
}

function normalizeType(body) {
  const explicit = safeStr(body?.type).trim();
  if (explicit) return explicit;
  const kind = safeStr(body?.kind).trim();
  if (kind) return kind;
  const event = safeStr(body?.event).trim();
  if (event) return event;
  return "event";
}

function normalizePayload(body) {
  if (body && typeof body === "object" && "payload" in body) return body.payload;
  return body;
}

// Tight but reasonable defaults for public webhooks.
const gatewayLimiter = createRateLimiter({
  windowMs: 60_000,
  max: Number(process.env.SINTRA_GATEWAY_RATELIMIT || 120),
  keyFn: (req) => req.ip,
  label: "sintra-gateway",
});

const logLimiter = createRateLimiter({
  windowMs: 60_000,
  max: Number(process.env.SINTRA_LOG_RATELIMIT || 240),
  keyFn: (req) => req.ip,
  label: "sintra-log",
});

const tiktokLimiter = createRateLimiter({
  windowMs: 60_000,
  max: Number(process.env.SINTRA_TIKTOK_RATELIMIT || 120),
  keyFn: (req) => req.ip,
  label: "tiktok-bridge",
});

// Capture raw body for signature verification.
const jsonWithRaw = express.json({
  limit: "2mb",
  verify: (req, _res, buf) => {
    req.rawBody = buf?.toString("utf8") || "";
  },
});

router.post("/sintra/gateway", gatewayLimiter, jsonWithRaw, (req, res) => {
  const v = requireOrAllowUnverified(req, res, { secretEnv: "SINTRA_GATEWAY_SECRET", label: "sintra.gateway" });
  if (!v.ok) return;

  // Ack immediately.
  res.status(200).json({ ok: true });

  const body = req.body || {};
  const type = normalizeType(body);
  const payload = normalizePayload(body);
  const receivedAt = new Date().toISOString();

  // Emit a generic gateway event (always).
  eventBus.emit("sintra.gateway", { type, payload, receivedAt, ip: req.ip });

  // Optional fanout: emit the type as a direct event name.
  if (String(process.env.SINTRA_GATEWAY_EMIT_TYPED_EVENTS || "1").trim() !== "0") {
    eventBus.emit(type, payload);
  }
});

router.post("/sintra/log", logLimiter, jsonWithRaw, (req, res) => {
  const v = requireOrAllowUnverified(req, res, { secretEnv: "SINTRA_LOG_SECRET", label: "sintra.log" });
  if (!v.ok) return;

  const body = req.body || {};
  const receivedAt = new Date().toISOString();

  // Persist to jsonl for auditability.
  try {
    const file = path.resolve(process.cwd(), "runs", "ingest", "sintra_log_webhook.jsonl");
    appendJsonl(file, {
      receivedAt,
      ip: req.ip,
      body,
    });
  } catch {
    // ignore persistence errors
  }

  // Emit for live dashboards.
  eventBus.emit("sintra.log", { receivedAt, ip: req.ip, body });

  res.status(200).json({ ok: true });
});

router.post("/tiktok/bridge", tiktokLimiter, jsonWithRaw, (req, res) => {
  const v = requireOrAllowUnverified(req, res, { secretEnv: "TIKTOK_BRIDGE_SECRET", label: "tiktok.bridge" });
  if (!v.ok) return;

  res.status(200).json({ ok: true });

  const body = req.body || {};
  const type = normalizeType(body);
  const payload = normalizePayload(body);
  const receivedAt = new Date().toISOString();

  // Always emit the bridge event.
  eventBus.emit("tiktok.bridge", { type, payload, receivedAt, ip: req.ip });

  // Common convention: if Make sends type=tiktok.lead, emit that too.
  if (String(process.env.SINTRA_GATEWAY_EMIT_TYPED_EVENTS || "1").trim() !== "0") {
    eventBus.emit(type, payload);
  }
});

export default router;
