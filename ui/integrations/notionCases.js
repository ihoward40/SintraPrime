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

function nowIso() {
  return new Date().toISOString();
}

function safeStr(v) {
  return v == null ? "" : String(v);
}

function pickTitleProp() {
  return String(process.env.NOTION_CASE_TITLE_PROP || "Name").trim() || "Name";
}

function optProp(name, value) {
  const n = String(name || "").trim();
  if (!n) return null;
  const v = safeStr(value).trim();
  if (!v) return null;
  return { [n]: { rich_text: [{ text: { content: v.slice(0, 2000) } }] } };
}

export async function notionCreateCase({ creditor, requestedBy, caseId, source, slack } = {}) {
  const dbId = String(process.env.NOTION_CASES_DB || "").trim();
  if (!dbId) return { ok: false, skipped: true, reason: "NOTION_CASES_DB missing" };

  const titleProp = pickTitleProp();
  const c = safeStr(creditor).trim() || "(unknown creditor)";
  const cid = safeStr(caseId).trim();
  const by = safeStr(requestedBy).trim();
  const src = safeStr(source).trim() || "slack";

  const properties = {
    [titleProp]: { title: [{ text: { content: cid ? `${c} — ${cid}`.slice(0, 200) : c.slice(0, 200) } }] },
    ...(optProp(process.env.NOTION_CASE_PROP_CREDITOR || "Creditor", c) || {}),
    ...(optProp(process.env.NOTION_CASE_PROP_CASEID || "Case Id", cid) || {}),
    ...(optProp(process.env.NOTION_CASE_PROP_REQUESTED_BY || "Requested By", by) || {}),
    ...(optProp(process.env.NOTION_CASE_PROP_SOURCE || "Source", src) || {}),
    ...(optProp(process.env.NOTION_CASE_PROP_SLACK_CHANNEL || "Slack Channel", slack?.channel) || {}),
    ...(optProp(process.env.NOTION_CASE_PROP_SLACK_USER || "Slack User", slack?.user || slack?.user_id) || {}),
    "Created At": { date: { start: nowIso() } },
  };

  const url = `${baseUrl()}/v1/pages`;
  const body = {
    parent: { database_id: dbId },
    properties,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify(body),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Notion create case failed: ${res.status} ${text}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  return {
    ok: true,
    id: parsed?.id || null,
    url: parsed?.url || null,
    raw: parsed,
  };
}
