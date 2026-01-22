import crypto from "node:crypto";

import { getStore } from "../lib/store_factory.mjs";
import { writeAuditEvent } from "../services/audit_logging.mjs";
import { pickNearestBestTimeWindow } from "../services/best_time_select.mjs";
import { generateScheduleDecisionReceipt } from "../services/schedule_decision_receipt.mjs";

const RECEIPT_SECRET = process.env.SOCIALOS_RECEIPT_HMAC_SECRET || process.env.SOCIALOS_RECEIPT_HMAC_KEY || "dev-secret-change-me";

export async function scheduleContent(req, res, next) {
  try {
    const store = await getStore();
    const { actor, content_id, platform, when, queue_id = "default", priority = 5 } = req.body;

    const content = await store.content.get(content_id);
    if (!content) {
      const e = new Error("Content not found");
      e.statusCode = 404;
      throw e;
    }
    if (content.status !== "approved") {
      const e = new Error("Content must be approved before scheduling");
      e.statusCode = 409;
      throw e;
    }

    const schedule = {
      schedule_id: crypto.randomUUID(),
      content_id,
      platform,
      when: new Date(when).toISOString(),
      status: "scheduled",
      queue_id,
      priority
    };

    await store.schedule.create(schedule);
    await store.content.update(content_id, { ...content, status: "scheduled", updated_at: new Date().toISOString() });

    await writeAuditEvent(store, {
      actor,
      action: "schedule.create",
      entity_type: "schedule",
      entity_id: schedule.schedule_id,
      payload: schedule
    });

    res.status(201).json(schedule);
  } catch (e) {
    next(e);
  }
}

export async function getCalendar(req, res, next) {
  try {
    const store = await getStore();
    const { from, to } = req.query;
    const items = await store.schedule.list({ from, to });
    res.status(200).json({ items });
  } catch (e) {
    next(e);
  }
}

export async function scheduleOnBestTime(req, res, next) {
  try {
    const store = await getStore();
    const { actor, content_id, platform, min_confidence = 0.4, horizon_days = 7 } = req.body;

    const content = await store.content.get(content_id);
    if (!content) {
      const err = new Error("Content not found");
      err.statusCode = 404;
      throw err;
    }
    if (content.status !== "approved" && content.status !== "scheduled") {
      const err = new Error("Content must be approved before scheduling");
      err.statusCode = 400;
      throw err;
    }

    const recs = await store.bestTime.list({ platform, limit: 200 });

    const pick = pickNearestBestTimeWindow({
      recs,
      now: new Date(),
      horizonDays: horizon_days,
      minConfidence: min_confidence
    });

    if (!pick) {
      const err = new Error("No best-time recommendation found within horizon for this platform");
      err.statusCode = 409;
      throw err;
    }

    const schedule = {
      schedule_id: crypto.randomUUID(),
      content_id,
      platform,
      when: pick.chosen_when_utc,
      status: "scheduled",
      queue_id: "best_time",
      priority: 5
    };

    await store.schedule.create(schedule);

    const receipt = generateScheduleDecisionReceipt({
      content_id,
      platform,
      chosen_when_utc: pick.chosen_when_utc,
      selected_rule: pick.selected_rule,
      schedule_id: schedule.schedule_id,
      signingSecret: RECEIPT_SECRET
    });

    await store.receipts.create(receipt);

    await writeAuditEvent(store, {
      actor,
      action: "schedule_decision",
      entity_type: "schedule",
      entity_id: schedule.schedule_id,
      payload: {
        schedule,
        receipt_id: receipt.receipt_id,
        receipt_hash: receipt.receipt_hash,
        selected_rule: pick.selected_rule
      }
    });

    res.status(201).json({ schedule, receipt });
  } catch (e) {
    next(e);
  }
}
