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

function selectName(prop) {
  return prop?.select?.name ?? null;
}

function multiSelectNames(prop) {
  const xs = Array.isArray(prop?.multi_select) ? prop.multi_select : [];
  return xs.map((x) => x?.name).filter(Boolean);
}

function numberValue(prop) {
  const n = prop?.number;
  return Number.isFinite(Number(n)) ? Number(n) : null;
}

function checkboxValue(prop) {
  return Boolean(prop?.checkbox);
}

function normalizeRuleFromPage(page) {
  const props = page?.properties || {};
  const actionType =
    selectName(props["Action Type"]) || selectName(props["Action type"]) || selectName(props["Type"]) || null;

  return {
    actionType: actionType ? String(actionType).toLowerCase() : null,
    allowedModes: multiSelectNames(props["Allowed Modes"]) || [],
    minCashBufferMonths:
      numberValue(props["Minimum Cash Buffer (months)"]) ?? numberValue(props["Minimum Cash Buffer"]) ?? null,
    maxOpenCases: numberValue(props["Max Open Cases"]) ?? null,
    maxDailyFilings: numberValue(props["Max Daily Filings"]) ?? null,
    maxTradingAllocationPct: numberValue(props["Max Trading Allocation %"]) ?? null,
    volatilityThreshold: numberValue(props["Volatility Threshold"]) ?? null,
    riskTolerance: numberValue(props["Risk Tolerance"]) ?? null,
    blockConditions: multiSelectNames(props["Block Conditions"]) || [],
    overrideAllowed: checkboxValue(props["Override Allowed"]) || false,
    overrideRequires: multiSelectNames(props["Override Requires"]) || [],
    notionPageId: String(page?.id || "").trim() || null,
  };
}

export async function fetchGovernorRulesFromNotion({ actionType }) {
  const dbId = String(process.env.NOTION_GOVERNOR_DB || "").trim();
  if (!dbId) return null;

  const url = `${baseUrl()}/v1/databases/${dbId}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Notion query failed: ${res.status} ${t}`);
  }

  const json = await res.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  if (!results.length) return null;
  const norm = results.map(normalizeRuleFromPage).filter((r) => r.actionType);

  const want = String(actionType || "").trim().toLowerCase();
  const exact = want ? norm.find((r) => r.actionType === want) : null;
  return exact || norm[0] || null;
}
