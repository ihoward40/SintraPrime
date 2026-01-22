function safeStr(v) {
  return v == null ? "" : String(v);
}

function getCalendarWebhookUrl() {
  return safeStr(process.env.GOOGLE_CALENDAR_WEBHOOK_URL || process.env.CALENDAR_WEBHOOK_URL).trim() || null;
}

export async function createEvent({ summary, description, date } = {}) {
  const url = getCalendarWebhookUrl();
  if (!url) return { ok: false, skipped: true, reason: "GOOGLE_CALENDAR_WEBHOOK_URL missing" };

  const body = {
    summary: safeStr(summary).trim() || "(no summary)",
    description: safeStr(description).trim() || "",
    date: safeStr(date).trim() || "",
    ts: new Date().toISOString(),
  };

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "sintraprime-ui/googleCalendar",
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    return { ok: false, status: res.status, error: text || `HTTP ${res.status}` };
  }

  return { ok: true, status: res.status, response: text };
}
