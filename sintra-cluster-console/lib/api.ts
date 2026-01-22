// lib/api.ts

const BASE_URL = process.env.NEXT_PUBLIC_SINTRA_BASE_URL || "http://localhost:3001";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

async function fetchJson<T extends JsonValue>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  const dashboardKey = process.env.NEXT_PUBLIC_DASHBOARD_API_KEY;
  if (dashboardKey) headers.set("x-api-key", dashboardKey);

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request to ${path} failed: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}

export async function sintraGet<T = any>(path: string): Promise<T> {
  return (await fetchJson<any>(path)) as T;
}

export async function sintraPost<T = any>(path: string, body: unknown): Promise<T> {
  return (await fetchJson<any>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  })) as T;
}

export type ClusterNode = {
  nodeId: string;
  url: string | null;
  role: string;
  capabilities: string[];
  lastHeartbeat?: string;
  status?: string;
  lastLatencyMs?: number;
};

export type ClusterNodesResponse = {
  ok?: boolean;
  nodes: ClusterNode[];
};

export type PrimaryCandidateResponse = {
  ok?: boolean;
  candidate: ClusterNode | null;
};

export type CreditorsAnalyticsResponse = {
  ok?: boolean;
  creditors: {
    [name: string]: {
      casesOpened: number;
      casesClosed: number;
      totalDaysToClose: number;
      escalatedCount: number;
      avgDaysToClose: number | null;
    };
  };
};

export type DashboardStatusItem = {
  creditor: string;
  caseId: string | null;
  openedAt?: number | null;
  ownerNodeId?: string | null;
  stage: number;
  mode: string;
  paused: boolean;
  lastActionAt: string | number;
  riskLevel?: string;
};

export type AdvisorLogItem = {
  id: string;
  ts: number;
  type: string;
  level: string;
  message: string;
  data?: JsonValue;
};

export type AdvisorLogResponse = {
  ok?: boolean;
  count: number;
  items: AdvisorLogItem[];
};

export type TimelineEvent = {
  id: string;
  ts: number;
  caseId: string | null;
  creditor: string | null;
  ownerNodeId: string | null;
  type: string;
  title: string | null;
  message: string | null;
  data?: JsonValue;
};

export type TimelineResponse = {
  ok?: boolean;
  count: number;
  items: TimelineEvent[];
};

export type OmniMetaResponse = {
  ok?: boolean;
  meta: {
    version: number;
    lastUpdatedAt: number;
    path: string;
    count: number;
  };
};

export type OmniPlanResponse = {
  ok?: boolean;
  plan: {
    intent: string;
    context: JsonValue;
    skillsUsed: string[];
    pipeline: Array<{ step: string; kind: string; output: string }>;
    createdAt: string;
  };
};

export type DashboardStatusResponse = {
  ok?: boolean;
  items: DashboardStatusItem[];
  count: number;
};

export type SecurityProfile = {
  mode: "normal" | "hardened" | "lockdown";
  lastChange: string | null;
  reason: string | null;
};

export type SecurityStateResponse = {
  ok?: boolean;
  threat: any;
  profile: SecurityProfile;
};

export type SecurityIncidentItem = {
  id: string;
  type: string;
  ts: string;
  payload: any;
};

export type SecurityIncidentsResponse = {
  ok?: boolean;
  items: SecurityIncidentItem[];
};

export async function getClusterNodes() {
  return fetchJson<ClusterNodesResponse>("/api/cluster/nodes");
}

export async function getPrimaryCandidate() {
  return fetchJson<PrimaryCandidateResponse>("/api/cluster/primary-candidate");
}

export async function getCreditorAnalytics() {
  return fetchJson<CreditorsAnalyticsResponse>("/api/analytics/creditors");
}

export async function getDashboardStatus() {
  try {
    return await fetchJson<DashboardStatusResponse>("/api/dashboard/status");
  } catch {
    return { items: [], count: 0 };
  }
}

export async function getSecurityState() {
  return fetchJson<SecurityStateResponse>("/api/security/state");
}

export async function getSecurityIncidents(limit = 50) {
  const n = typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.floor(limit))) : 50;
  return fetchJson<SecurityIncidentsResponse>(`/api/security/incidents?limit=${encodeURIComponent(String(n))}`);
}

export async function getAdvisorLog(limit = 25) {
  try {
    const n = typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 25;
    return await fetchJson<AdvisorLogResponse>(`/api/advisor/log?limit=${encodeURIComponent(String(n))}`);
  } catch {
    return { items: [], count: 0 };
  }
}

export async function getTimelineEvents({ caseId, limit = 100 }: { caseId?: string | null; limit?: number } = {}) {
  try {
    const n = typeof limit === "number" && Number.isFinite(limit) ? Math.max(1, Math.min(500, Math.floor(limit))) : 100;
    const qs = new URLSearchParams();
    if (caseId) qs.set("caseId", caseId);
    qs.set("limit", String(n));
    return await fetchJson<TimelineResponse>(`/api/timeline/events?${qs.toString()}`);
  } catch {
    return { items: [], count: 0 };
  }
}

export async function getOmniMeta() {
  try {
    return await fetchJson<OmniMetaResponse>(`/api/omni/meta`);
  } catch {
    return { meta: { version: 0, lastUpdatedAt: 0, path: "", count: 0 } };
  }
}

export async function getOmniPlan(intent: string, context?: unknown) {
  const body = { intent, context: context ?? {} };
  return fetchJson<OmniPlanResponse>(`/api/omni/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function adminIngestOmniTool(payload: { name: string; description?: string; features?: string[] }) {
  const adminSecret = process.env.NEXT_PUBLIC_SINTRA_ADMIN_SECRET || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-sintra-admin": adminSecret,
  };

  const dashboardKey = process.env.NEXT_PUBLIC_DASHBOARD_API_KEY;
  if (dashboardKey) headers["x-api-key"] = dashboardKey;

  return fetchJson<JsonValue>(`/api/omni/ingest-tool`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

export async function adminPost(path: string, body: unknown) {
  const adminSecret = process.env.NEXT_PUBLIC_SINTRA_ADMIN_SECRET || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-sintra-admin": adminSecret,
  };

  const dashboardKey = process.env.NEXT_PUBLIC_DASHBOARD_API_KEY;
  if (dashboardKey) headers["x-api-key"] = dashboardKey;

  return fetchJson<JsonValue>(`/api/admin${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });
}
