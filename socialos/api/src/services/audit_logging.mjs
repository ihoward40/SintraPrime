import crypto from "node:crypto";

import { signReceiptHmac } from "../../../shared/lib/sign.mjs";
import { hashCanonicalJson } from "../../../shared/lib/hash.mjs";

export async function writeAuditEvent(store, { actor, action, entity_type, entity_id, payload }) {
  const timestamp = new Date().toISOString();
  const payload_hash = hashCanonicalJson(payload);

  const eventPayload = {
    event_id: crypto.randomUUID(),
    timestamp,
    actor,
    action,
    entity_type,
    entity_id,
    payload_hash
  };

  // For audit events, use the same HMAC mechanism by default.
  const hmacSecret = process.env.SOCIALOS_AUDIT_HMAC_KEY || process.env.SOCIALOS_RECEIPT_HMAC_KEY || "dev_insecure_hmac_key_change_me";
  const signature = signReceiptHmac(eventPayload, hmacSecret);

  const event = { ...eventPayload, signature };
  if (store?.audit?.append) {
    await store.audit.append(event);
  } else {
    await store.appendAuditEvent(event);
  }
  return event;
}
