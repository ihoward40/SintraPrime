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

function uniq(xs) {
  return Array.from(new Set((xs || []).filter(Boolean)));
}

export async function logTribunalDecision(req, decision) {
  const dbId = String(process.env.NOTION_TRIBUNAL_DB || "").trim();
  if (!dbId) return { ok: false, skipped: true };

  const votes = decision?.votes || {};
  const risk = votes.risk || {};
  const strat = votes.strategy || {};
  const comp = votes.compliance || {};

  const flags = uniq([...(risk.flags || []), ...(strat.flags || []), ...(comp.flags || [])]);

  const properties = {
    "Action Id": { title: [{ text: { content: String(decision?.actionId || req?.actionId || "(missing)") } }] },
    "Action Type": { select: { name: String(req?.type || "unknown") } },
    Final: { select: { name: String(decision?.final || "override_required") } },
    "Risk Vote": { select: { name: String(risk.vote || "n/a") } },
    "Strategy Vote": { select: { name: String(strat.vote || "n/a") } },
    "Compliance Vote": { select: { name: String(comp.vote || "n/a") } },
    "Risk Score": { number: Number.isFinite(Number(risk.score)) ? Number(risk.score) : null },
    "Strategy Score": { number: Number.isFinite(Number(strat.score)) ? Number(strat.score) : null },
    "Compliance Score": { number: Number.isFinite(Number(comp.score)) ? Number(comp.score) : null },
    Flags: { multi_select: flags.map((f) => ({ name: String(f).slice(0, 90) })) },
    "Created At": { date: { start: new Date().toISOString() } },
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

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Notion log failed: ${res.status} ${t}`);
  }

  return { ok: true };
}
