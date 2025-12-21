function mustString(v: unknown, name: string): string {
  if (typeof v !== "string" || v.trim() === "") {
    throw new Error(`Invalid ${name}: expected non-empty string`);
  }
  return v;
}

export type SendMessageInput = {
  message: string;
  threadId?: string;
  type?: "user_message";
  webhookUrl?: string;
  timeoutMs?: number;
};

export type SendMessageOutput = {
  status: number;
  ok: boolean;
  response: any;
};

export async function sendMessage(input: SendMessageInput): Promise<SendMessageOutput> {
  const message = mustString(input.message, "message");
  const threadId = mustString(input.threadId ?? "local_test_001", "threadId");
  const type = input.type ?? "user_message";

  const webhookUrl = input.webhookUrl ?? process.env.WEBHOOK_URL;
  if (!webhookUrl) throw new Error("Missing WEBHOOK_URL (arg or env var)");

  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) throw new Error("Missing WEBHOOK_SECRET env var");

  const timeoutMs = input.timeoutMs ?? 30_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": secret,
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ type, threadId, message }),
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (json === null) {
      throw new Error(`Non-JSON response (${res.status}): ${text}`);
    }

    return { status: res.status, ok: res.ok, response: json };
  } finally {
    clearTimeout(timeout);
  }
}
