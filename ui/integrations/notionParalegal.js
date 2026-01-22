function requireNotionToken() {
  const token = String(process.env.NOTION_TOKEN || "").trim();
  if (!token) throw new Error("NOTION_TOKEN missing");
  return token;
}

function notionHeaders() {
  const version = String(process.env.NOTION_API_VERSION || "2022-06-28").trim() || "2022-06-28";
  return {
    Authorization: `Bearer ${requireNotionToken()}`,
    "Notion-Version": version,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function baseUrl() {
  return String(process.env.NOTION_API_BASE || "https://api.notion.com").trim() || "https://api.notion.com";
}

function safeStr(v) {
  return v == null ? "" : String(v);
}

function trunc(s, max = 1800) {
  const t = safeStr(s);
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function asSelect(name) {
  const n = safeStr(name).trim();
  if (!n) return null;
  return { select: { name: n.slice(0, 80) } };
}

function asText(content) {
  const c = safeStr(content).trim();
  return { rich_text: c ? [{ text: { content: trunc(c, 1900) } }] : [] };
}

function paragraphBlock(text) {
  const t = safeStr(text).trim();
  if (!t) return null;
  return {
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: [{ text: { content: trunc(t, 1900) } }] },
  };
}

export async function notionLogParalegalEvent({ type, intent, raw, user, status, score, redFlags, draftText, linkedCaseId } = {}) {
  const dbId = String(process.env.NOTION_PARALEGAL_DB || "").trim();
  if (!dbId) return { ok: false, skipped: true, reason: "NOTION_PARALEGAL_DB missing" };

  const domainLabel = safeStr(intent?.domainLabel || intent?.domain || "General");
  const title = `${domainLabel} — ${safeStr(type || "event")}`.slice(0, 200);

  const properties = {
    Title: { title: [{ text: { content: title } }] },
    ...(type ? { Type: asSelect(type) } : {}),
    ...(domainLabel ? { Domain: asSelect(domainLabel) } : {}),
    ...(status ? { Status: asSelect(status) } : {}),
    ...(user ? { User: asText(user) } : {}),
    ...(Number.isFinite(Number(score)) ? { Score: { number: Number(score) } } : {}),
    ...(Array.isArray(redFlags) && redFlags.length
      ? { "Red Flags": { multi_select: redFlags.slice(0, 12).map((f) => ({ name: safeStr(f).slice(0, 80) })) } }
      : {}),
    ...(linkedCaseId ? { "Linked Case": asText(linkedCaseId) } : {}),
    "Created At": { date: { start: new Date().toISOString() } },
  };

  const children = [];
  const b1 = paragraphBlock(raw ? `Raw Input:\n${safeStr(raw)}` : "");
  if (b1) children.push(b1);
  const b2 = paragraphBlock(draftText ? `Draft Output (REVIEW REQUIRED):\n${safeStr(draftText)}` : "");
  if (b2) children.push(b2);

  const url = `${baseUrl()}/v1/pages`;
  const body = {
    parent: { database_id: dbId },
    properties,
    ...(children.length ? { children } : {}),
  };

  const res = await fetch(url, { method: "POST", headers: notionHeaders(), body: JSON.stringify(body) });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`Notion paralegal log failed: ${res.status} ${text}`);

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  return { ok: true, id: parsed?.id || null, url: parsed?.url || null, raw: parsed };
}
