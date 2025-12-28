function redact(obj: any, redactKeys: Set<string>): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((v) => redact(v, redactKeys));
  if (typeof obj !== "object") return obj;

  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (redactKeys.has(k.toLowerCase())) out[k] = "[REDACTED]";
    else out[k] = redact(v, redactKeys);
  }
  return out;
}

function redactKeysFromEnv(): Set<string> {
  return new Set(
    (process.env.NOTION_REDACT_KEYS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function notionLivePatch(path: string, body: any) {
  const base = process.env.NOTION_API_BASE || "https://api.notion.com";
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN missing");

  const version = process.env.NOTION_API_VERSION || "2022-06-28";
  const url = `${base}${path}`;

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": version,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.json();
  const redacted = redact(raw, redactKeysFromEnv());

  return { http_status: res.status, redacted };
}

export async function notionLivePatchWithIdempotency(
  path: string,
  body: any,
  idempotencyKey: string | null | undefined
) {
  const base = process.env.NOTION_API_BASE || "https://api.notion.com";
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN missing");

  const version = process.env.NOTION_API_VERSION || "2022-06-28";
  const url = `${base}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": version,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (typeof idempotencyKey === "string" && idempotencyKey.trim()) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });

  const raw = await res.json();
  const redacted = redact(raw, redactKeysFromEnv());

  return { http_status: res.status, redacted };
}

export async function notionLiveRequestWithIdempotency(input: {
  method: "PATCH" | "POST";
  path: string;
  body: any;
  idempotencyKey: string | null | undefined;
}) {
  const base = process.env.NOTION_API_BASE || "https://api.notion.com";
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN missing");

  const version = process.env.NOTION_API_VERSION || "2022-06-28";
  const url = `${base}${input.path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": version,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (typeof input.idempotencyKey === "string" && input.idempotencyKey.trim()) {
    headers["Idempotency-Key"] = input.idempotencyKey;
  }

  const res = await fetch(url, {
    method: input.method,
    headers,
    body: JSON.stringify(input.body),
  });

  const raw = await res.json().catch(() => ({}));
  const redacted = redact(raw, redactKeysFromEnv());
  return { http_status: res.status, redacted };
}
