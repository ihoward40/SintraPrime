function redact(obj: any, redactKeys: Set<string>): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((v) => redact(v, redactKeys));
  if (typeof obj !== "object") return obj;

  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (redactKeys.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = redact(v, redactKeys);
    }
  }
  return out;
}

export async function notionLiveGet(path: string) {
  const env = process.env as Record<string, string | undefined>;
  const base = env.NOTION_API_BASE || "https://api.notion.com";
  const token = env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN missing");

  const version = env.NOTION_API_VERSION || "2022-06-28";
  const url = `${base}${path}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": version,
      Accept: "application/json",
    },
  });

  const raw = await res.json();
  const redactKeys = new Set<string>(
    (env.NOTION_REDACT_KEYS || "")
      .split(",")
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean)
  );

  return {
    http_status: res.status,
    redacted: redact(raw, redactKeys),
  };
}

export async function notionLiveWhoAmI() {
  const env = process.env as Record<string, string | undefined>;
  const base = env.NOTION_API_BASE || "https://api.notion.com";
  const token = env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN missing");

  const version = env.NOTION_API_VERSION || "2022-06-28";
  const url = `${base}/v1/users/me`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": version,
      Accept: "application/json",
    },
  });

  const raw = await res.json().catch(() => null);
  const redactKeys = new Set<string>(
    (env.NOTION_REDACT_KEYS || "")
      .split(",")
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean)
  );

  const redacted = redact(raw, redactKeys);

  return {
    http_status: res.status,
    ok: res.status >= 200 && res.status < 300,
    me: redacted,
  };
}
