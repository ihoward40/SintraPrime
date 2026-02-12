export async function sendMessage({
  message,
  threadId = 'local_test_001',
  type = 'user_message',
  webhookUrl
}) {
  const url = webhookUrl || process.env.WEBHOOK_URL;
  if (!url) {
    throw new Error('Missing WEBHOOK_URL (or pass webhookUrl)');
  }

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Missing WEBHOOK_SECRET env var');
  }

  const payload = { type, threadId, message };

  // Guard against payload drift (webhook contract is locked).
  const allowedKeys = ["type", "threadId", "message"];
  for (const k of Object.keys(payload)) {
    if (!allowedKeys.includes(k)) {
      throw new Error(`Invalid payload key: ${k}`);
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': secret,
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text}`);
  }

  return {
    status: res.status,
    ok: res.ok,
    response: json
  };
}
