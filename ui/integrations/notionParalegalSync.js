import { eventBus } from "../core/eventBus.js";
import {
  getParalegalState,
  linkParalegalCaseNotion,
  linkParalegalTaskNotion,
} from "../services/paralegalState.js";

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(`[NotionParalegal] ${msg}`);
}

function warn(msg) {
  // eslint-disable-next-line no-console
  console.warn(`[NotionParalegal] ${msg}`);
}

function baseUrl() {
  return String(process.env.NOTION_API_BASE || "https://api.notion.com").trim() || "https://api.notion.com";
}

function notionHeaders() {
  const token = String(process.env.NOTION_TOKEN || "").trim();
  const version = String(process.env.NOTION_API_VERSION || "2022-06-28").trim() || "2022-06-28";
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": version,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function enabled() {
  const token = String(process.env.NOTION_TOKEN || "").trim();
  const caseDb = String(process.env.PARALEGAL_CASE_DB || "").trim();
  const taskDb = String(process.env.PARALEGAL_TASK_DB || "").trim();
  return Boolean(token && caseDb && taskDb);
}

function toIsoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function isValidUrl(value) {
  const s = String(value || "").trim();
  if (!s) return false;
  try {
    // eslint-disable-next-line no-new
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

function richText(value) {
  const s = String(value || "").trim();
  if (!s) return undefined;
  return { rich_text: [{ text: { content: s } }] };
}

function title(value) {
  const s = String(value || "").trim();
  return { title: [{ text: { content: s || "(untitled)" } }] };
}

function select(value) {
  const s = String(value || "").trim();
  if (!s) return undefined;
  return { select: { name: s } };
}

function multiSelect(values) {
  const xs = Array.isArray(values) ? values : [];
  const names = xs.map((x) => String(x || "").trim()).filter(Boolean);
  if (!names.length) return undefined;
  return { multi_select: names.map((name) => ({ name })) };
}

function dateProp(value) {
  const iso = toIsoDate(value);
  if (!iso) return undefined;
  return { date: { start: iso } };
}

function mapDomainToNotion(domain) {
  const d = String(domain || "").trim().toLowerCase();
  if (d === "creditor") return "Credit";
  if (d === "enforcement" || d === "argument" || d === "verdict") return "Court";
  if (d === "admin") return "Admin";
  if (d) return "Mixed";
  return undefined;
}

function mapRiskLevel(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return undefined;
  if (["low", "medium", "high", "critical"].includes(v)) return v;
  return "medium";
}

function mapCaseStatus(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return undefined;
  // Preserve existing statuses where possible; fall back to "open".
  const allowed = new Set([
    "open",
    "investigating",
    "drafting",
    "pending_filing",
    "in_litigation",
    "monitoring",
    "closed_won",
    "closed_lost",
  ]);
  if (allowed.has(v)) return v;
  if (v === "pending") return "open";
  return "open";
}

function mapTaskStatus(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return undefined;
  if (v === "done") return "done";
  if (v === "pending") return "new";
  return v;
}

function mapTaskPriority(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return undefined;
  if (["low", "normal", "high", "urgent"].includes(v)) return v;
  if (v === "medium") return "normal";
  if (v === "critical") return "urgent";
  return "normal";
}

function buildCaseProperties(payload = {}) {
  const name = `${payload.creditor || "Case"} – ${payload.caseId || payload.systemId || ""}`.trim();
  const domain = mapDomainToNotion(payload.domain);
  const status = mapCaseStatus(payload.status);
  const riskLevel = mapRiskLevel(payload.riskLevel);

  const props = {
    Name: title(name),
    CaseId: richText(payload.caseId || payload.systemId || ""),
    Creditor: select(payload.creditor),
    Domain: select(domain),
    Beneficiary: richText(payload.beneficiary),
    Status: select(status),
    RiskLevel: select(riskLevel),
    PrimaryDeadline: dateProp(payload.primaryDeadline),
    NextAction: richText(payload.nextAction),
    Source: multiSelect(payload.source),
    SlackChannel: isValidUrl(payload.slackChannel) ? { url: String(payload.slackChannel).trim() } : undefined,
    SlackThreadTs: richText(payload.slackThreadTs),
    Tags: multiSelect(payload.tags),
    SystemId: richText(payload.systemId),
    CreatedAt: dateProp(payload.createdAt),
    UpdatedAt: dateProp(payload.updatedAt),
  };

  // Remove undefined props (Notion rejects them)
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) delete props[k];
  }

  return props;
}

function buildTaskProperties(payload = {}) {
  const name = `${payload.type || payload.kind || "task"} – ${payload.taskId || payload.systemId || ""}`.trim();
  const status = mapTaskStatus(payload.status);
  const priority = mapTaskPriority(payload.priority);

  const props = {
    Name: title(name),
    TaskId: richText(payload.taskId || payload.systemId || ""),
    CaseId: richText(payload.caseId),
    Type: select(payload.type || payload.kind),
    Status: select(status),
    Priority: select(priority),
    DueDate: dateProp(payload.dueDate),
    Assignee: richText(payload.assignee),
    Channel: isValidUrl(payload.channel) ? { url: String(payload.channel).trim() } : undefined,
    Source: multiSelect(payload.source ? [payload.source] : payload.sources),
    SystemId: richText(payload.systemId),
    CreatedAt: dateProp(payload.createdAt),
    UpdatedAt: dateProp(payload.updatedAt),
  };

  for (const [k, v] of Object.entries(props)) {
    if (v === undefined) delete props[k];
  }

  return props;
}

async function notionCreatePage({ databaseId, properties }) {
  const url = `${baseUrl()}/v1/pages`;
  const res = await fetch(url, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Notion create failed: ${res.status} ${t}`);
  }

  return res.json();
}

async function notionUpdatePage({ pageId, properties }) {
  const url = `${baseUrl()}/v1/pages/${pageId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: notionHeaders(),
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Notion update failed: ${res.status} ${t}`);
  }

  return res.json();
}

async function syncCase(payload = {}) {
  const caseDb = String(process.env.PARALEGAL_CASE_DB || "").trim();
  const notionPageId = String(payload.notionPageId || "").trim() || null;
  const systemId = String(payload.systemId || payload.id || "").trim() || null;
  const properties = buildCaseProperties({ ...payload, systemId });

  if (notionPageId) {
    await notionUpdatePage({ pageId: notionPageId, properties });
    return { notionPageId, created: false };
  }

  const created = await notionCreatePage({ databaseId: caseDb, properties });
  const newId = String(created?.id || "").trim() || null;
  if (systemId && newId) linkParalegalCaseNotion(systemId, newId);
  return { notionPageId: newId, created: true };
}

async function syncTask(payload = {}) {
  const taskDb = String(process.env.PARALEGAL_TASK_DB || "").trim();
  const notionPageId = String(payload.notionPageId || "").trim() || null;
  const systemId = String(payload.systemId || payload.id || "").trim() || null;
  const properties = buildTaskProperties({ ...payload, systemId });

  if (notionPageId) {
    await notionUpdatePage({ pageId: notionPageId, properties });
    return { notionPageId, created: false };
  }

  const created = await notionCreatePage({ databaseId: taskDb, properties });
  const newId = String(created?.id || "").trim() || null;
  if (systemId && newId) linkParalegalTaskNotion(systemId, newId);
  return { notionPageId: newId, created: true };
}

function start() {
  if (!enabled()) {
    warn("Missing NOTION_TOKEN / PARALEGAL_CASE_DB / PARALEGAL_TASK_DB; bridge disabled");
    return;
  }

  log("Online");

  // Best-effort bootstrap: if state already has items, upsert them once.
  try {
    const state = getParalegalState();
    for (const c of state.cases || []) eventBus.emit("paralegal.case.upsert", c);
    for (const t of state.tasks || []) eventBus.emit("paralegal.task.upsert", t);
  } catch {
    // ignore
  }

  eventBus.on("paralegal.case.upsert", async (payload = {}) => {
    try {
      const res = await syncCase(payload);
      eventBus.emit("paralegal.case.notion.synced", { systemId: payload.systemId || payload.id || null, ...res });
    } catch (err) {
      eventBus.emit("paralegal.case.notion.error", { error: String(err?.message || err), payload });
    }
  });

  eventBus.on("paralegal.task.upsert", async (payload = {}) => {
    try {
      const res = await syncTask(payload);
      eventBus.emit("paralegal.task.notion.synced", { systemId: payload.systemId || payload.id || null, ...res });
    } catch (err) {
      eventBus.emit("paralegal.task.notion.error", { error: String(err?.message || err), payload });
    }
  });
}

start();
