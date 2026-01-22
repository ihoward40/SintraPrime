import crypto from "node:crypto";
import { eventBus } from "../core/eventBus.js";

function enabled() {
  return String(process.env.DISCOVERY_ENGINE_ENABLED || "").trim() === "1";
}

function dedupeWindowMs() {
  const v = Number(process.env.DISCOVERY_DEDUPE_WINDOW_MS || "600000");
  if (!Number.isFinite(v) || v < 10_000) return 600_000;
  return v;
}

function sanitizeCreditorForId(name) {
  return String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function generateCaseId(creditorName) {
  const safe = sanitizeCreditorForId(creditorName) || "CASE";
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const stamp = `${y}${m}${day}`;
  const nonce = crypto.randomUUID().slice(0, 8);
  return `${safe}-${stamp}-${nonce}`;
}

const recent = new Map();
function shouldDedupe(key) {
  const k = String(key || "").trim();
  if (!k) return false;

  const now = Date.now();
  const window = dedupeWindowMs();
  for (const [rk, ts] of recent.entries()) {
    if (now - ts > window) recent.delete(rk);
  }

  if (recent.has(k)) return true;
  recent.set(k, now);
  return false;
}

eventBus.on("creditor.observed", ({ name, creditor, source, context } = {}) => {
  if (!enabled()) return;

  const c = String(name || creditor || "").trim();
  if (!c) return;

  const src = String(source || "unknown").trim();
  const ctx = context || {};
  const dedupeKey = `${src}:${String(ctx?.id || ctx?.messageId || ctx?.hash || "")}:${c}`;
  if (shouldDedupe(dedupeKey)) return;

  const caseId = generateCaseId(c);

  eventBus.emit("discovery.case.created", {
    creditor: c,
    caseId,
    source: src,
    context: ctx,
  });

  eventBus.emit("enforcement.chain.start", {
    creditor: c,
    caseId,
    strategy: "auto-discovered",
    initialDoc: "initial-notice",
  });
});

export const discoveryEngine = { generateCaseId };
