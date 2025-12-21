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
  const base = process.env.NOTION_API_BASE || "https://api.notion.com";
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new Error("NOTION_TOKEN missing");

  const version = process.env.NOTION_API_VERSION || "2022-06-28";
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
  const redactKeys = new Set(
    (process.env.NOTION_REDACT_KEYS || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );

  return {
    http_status: res.status,
    redacted: redact(raw, redactKeys),
  };
}
