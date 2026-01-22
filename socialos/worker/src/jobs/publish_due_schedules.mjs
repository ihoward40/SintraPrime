import { createDevStore } from "../../../api/src/store/dev_store.mjs";
import { generatePublishReceipt } from "../../../api/src/services/receipt_generation.mjs";
import { writeAuditEvent } from "../../../api/src/services/audit_logging.mjs";

import { publishWithAssist } from "../connectors/assist_connector.mjs";
import { publishMockSuccess } from "../connectors/mock_success_connector.mjs";

function pickConnector() {
  const mode = process.env.SOCIALOS_CONNECTOR_MODE || "assist";
  if (mode === "success") return publishMockSuccess;
  return publishWithAssist;
}

export async function runPublishDueSchedulesOnce() {
  const store = createDevStore();
  const now = Date.now();

  const schedules = await store.listSchedules();
  const due = schedules.filter((s) => s.status === "scheduled" && new Date(s.when).getTime() <= now);

  const publish = pickConnector();

  const results = [];

  for (const schedule of due) {
    const content = await store.getContent(schedule.content_id);
    if (!content) continue;

    // Mark schedule due
    const dueSchedule = { ...schedule, status: "due" };
    await store.putSchedule(dueSchedule);

    const connectorResult = await publish({ content, schedule: dueSchedule });

    const receipt = generatePublishReceipt({
      content_id: content.content_id,
      platform: dueSchedule.platform,
      content_hash: content.content_fingerprint,
      status: connectorResult.status,
      result: connectorResult.result || null
    });

    await store.putReceipt(receipt);

    await writeAuditEvent(store, {
      actor: "socialos.worker",
      action: "receipt.write",
      entity_type: "receipt",
      entity_id: receipt.receipt_id,
      payload: receipt
    });

    let nextScheduleStatus = "dispatched";
    let nextContentStatus = content.status;

    if (connectorResult.status === "success") {
      nextContentStatus = "published";
    }

    if (connectorResult.status === "failure") {
      nextScheduleStatus = "failed";
    }

    const finalSchedule = { ...dueSchedule, status: nextScheduleStatus };
    await store.putSchedule(finalSchedule);

    await store.putContent({ ...content, status: nextContentStatus, updated_at: new Date().toISOString() });

    await writeAuditEvent(store, {
      actor: "socialos.worker",
      action: "schedule.dispatch",
      entity_type: "schedule",
      entity_id: finalSchedule.schedule_id,
      payload: { schedule: finalSchedule, receipt_id: receipt.receipt_id }
    });

    results.push({ schedule: finalSchedule, receipt });
  }

  return { processed: results.length, results };
}
