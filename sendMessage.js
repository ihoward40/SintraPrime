const DEFAULT_WEBHOOK_URL = 'https://connect.testmyprompt.com/webhook/69460c4a2e1c203dcdd080e4';

export async function sendMessage({
  message,
  threadId = 'local_test_001',
  type = 'user_message',
  webhookUrl
}) {
  if (!process.env.WEBHOOK_SECRET) {
    throw new Error('Missing WEBHOOK_SECRET env var');
  }

  const url = webhookUrl || process.env.WEBHOOK_URL || DEFAULT_WEBHOOK_URL;

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
      'X-Webhook-Secret': process.env.WEBHOOK_SECRET,
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
