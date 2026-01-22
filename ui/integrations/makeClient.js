function safeStr(v) {
  return v == null ? "" : String(v);
}

function getMakeWebhookUrl() {
  return (
    safeStr(process.env.MAKE_WEBHOOK_URL || process.env.WATCH_MAKE_URL || process.env.MAKE_URL).trim() || null
  );
}

function getMakeSecret() {
  return safeStr(process.env.MAKE_WEBHOOK_SECRET || process.env.MAKE_SECRET).trim() || null;
}

export async function sendMakeTrigger({ type, payload } = {}) {
  const url = getMakeWebhookUrl();
  if (!url) return { ok: false, skipped: true, reason: "MAKE_WEBHOOK_URL missing" };

  const body = {
    type: safeStr(type).trim() || "event",
    ts: new Date().toISOString(),
    payload: payload ?? null,
  };

  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "sintraprime-ui/makeClient",
  };
  const secret = getMakeSecret();
  if (secret) headers["X-Sintra-Make-Secret"] = secret;

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
