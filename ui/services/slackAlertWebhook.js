import { eventBus } from "../core/eventBus.js";

function getAlertWebhookUrl() {
  const url = String(process.env.SLACK_ALERT_WEBHOOK || "").trim();
  return url || null;
}

/**
 * Emergency-only Slack sender.
 *
 * Uses an Incoming Webhook URL, which is one-way and intentionally limited.
 * Keep this for crash logs / boot diagnostics / critical alerts.
 */
export async function sendSlackAlertWebhook({ text, blocks } = {}) {
  const url = getAlertWebhookUrl();
  if (!url) return { ok: false, skipped: true, reason: "missing_SLACK_ALERT_WEBHOOK" };

  const msg = String(text || "");
  if (!msg.trim() && !blocks) throw new Error("Missing text (or blocks)");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ text: msg, ...(blocks ? { blocks } : {}) }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      eventBus.emit("slack.alert_webhook.error", {
        status: res.status,
        body: body ? body.slice(0, 500) : null,
      });
      return { ok: false, status: res.status };
    }

    return { ok: true };
  } catch (err) {
    eventBus.emit("slack.alert_webhook.error", {
      error: String(err?.message || err),
    });
    return { ok: false, error: String(err?.message || err) };
  }
}
