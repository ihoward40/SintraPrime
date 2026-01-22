import crypto from "node:crypto";

import { getStore } from "../lib/store_factory.mjs";
import { buildCanonicalAssets, computeContentFingerprint } from "../services/fingerprinting.mjs";
import { validateTransition } from "../services/approval_workflow.mjs";
import { writeAuditEvent } from "../services/audit_logging.mjs";

export async function listContent(_req, res, next) {
  try {
    const store = await getStore();
    const items = await store.content.list();
    res.json({ items });
  } catch (e) {
    next(e);
  }
}

export async function createContent(req, res, next) {
  try {
    const store = await getStore();
    const { actor, original_text, media_paths = [], governance_mode = "marketing_mode", tags = [] } = req.body;

      const canonical_assets = buildCanonicalAssets({ original_text, media_paths });
      const content_fingerprint = computeContentFingerprint({ canonical_assets, tags, governance_mode });

      const now = new Date().toISOString();
      const content = {
        content_id: crypto.randomUUID(),
        campaign_id: null,
        version: "0.1.0",
        content_fingerprint,
        status: "draft",
        governance_level: governance_mode === "court_safe" ? 8 : 3,
        risk_level: governance_mode === "court_safe" ? "medium" : "low",
        canonical_assets,
        tags,
        created_at: now,
        updated_at: now
      };

      await store.content.create(content);
      await writeAuditEvent(store, {
        actor,
        action: "content.create",
        entity_type: "content",
        entity_id: content.content_id,
        payload: content
      });

      res.status(201).json(content);
  } catch (e) {
    next(e);
  }
}

export async function approveContent(req, res, next) {
  try {
    const store = await getStore();
    const { actor, to_status, reason } = req.body;
    const content_id = req.params.id;

      const existing = await store.content.get(content_id);
      if (!existing) {
        const e = new Error("Content not found");
        e.statusCode = 404;
        throw e;
      }

      const governance_mode = existing.governance_level >= 7 ? "court_safe" : "marketing_mode";
      validateTransition({ current_status: existing.status, to_status, governance_mode });

      const now = new Date().toISOString();
      const updated = { ...existing, status: to_status, updated_at: now };
      await store.content.update(content_id, updated);

      await writeAuditEvent(store, {
        actor,
        action: "content.transition",
        entity_type: "content",
        entity_id: content_id,
        payload: { from: existing.status, to: to_status, reason: reason || null }
      });

      res.status(200).json(updated);
  } catch (e) {
    next(e);
  }
}
