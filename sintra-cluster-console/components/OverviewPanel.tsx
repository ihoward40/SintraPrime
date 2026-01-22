"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  adminPost,
  AdvisorLogItem,
  ClusterNode,
  CreditorsAnalyticsResponse,
  DashboardStatusItem,
  getAdvisorLog,
  getClusterNodes,
  getCreditorAnalytics,
  getDashboardStatus,
  getOmniMeta,
  getOmniPlan,
  adminIngestOmniTool,
  getPrimaryCandidate,
} from "@/lib/api";
import ClusterGraph from "@/components/ClusterGraph";

type OmniPipelineStep = { step: string; kind: string; output: string };

type OmniPlan = {
  intent: string;
  context: unknown;
  skillsUsed: string[];
  pipeline: OmniPipelineStep[];
  createdAt: string;
};

function statusColor(status?: string) {
  switch ((status || "").toLowerCase()) {
    case "online":
      return "bg-emerald-500";
    case "offline":
      return "bg-red-500";
    default:
      return "bg-slate-400";
  }
}

function riskBadgeColor(risk?: string) {
  switch ((risk || "").toLowerCase()) {
    case "critical":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-amber-500";
    case "low":
      return "bg-emerald-500";
    default:
      return "bg-slate-500";
  }
}

export function OverviewPanel() {
  const [nodes, setNodes] = useState<ClusterNode[]>([]);
  const [primary, setPrimary] = useState<ClusterNode | null>(null);
  const [analytics, setAnalytics] = useState<CreditorsAnalyticsResponse["creditors"]>({});
  const [dashboardItems, setDashboardItems] = useState<DashboardStatusItem[]>([]);
  const [advisorLog, setAdvisorLog] = useState<AdvisorLogItem[]>([]);
  const [omniMetaCount, setOmniMetaCount] = useState<number>(0);
  const [omniIntent, setOmniIntent] = useState<string>("verizon_enforcement");
  const [omniPlan, setOmniPlan] = useState<OmniPlan | null>(null);
  const [omniToolName, setOmniToolName] = useState<string>("AI Tool");
  const [omniToolFeatures, setOmniToolFeatures] = useState<string>(
    "Temporal coherence across scenes\nBrand consistency controls\nVoice emotion shaping",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);

      const [nodesRes, primaryRes, analyticsRes, dashboardRes] = await Promise.all([
        getClusterNodes(),
        getPrimaryCandidate(),
        getCreditorAnalytics(),
        getDashboardStatus(),
      ]);

      const advisorRes = await getAdvisorLog(25);
      const omniMetaRes = await getOmniMeta();

      setNodes(nodesRes.nodes || []);
      setPrimary(primaryRes.candidate || null);
      setAnalytics(analyticsRes.creditors || {});
      setDashboardItems(dashboardRes.items || []);
      setAdvisorLog(advisorRes.items || []);
      setOmniMetaCount(Number(omniMetaRes?.meta?.count || 0));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load cluster data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 30_000);
    return () => clearInterval(interval);
  }, []);

  const creditorEntries = Object.entries(analytics);

  async function doAdmin(actionKey: string, path: string, body: unknown) {
    try {
      setBusyKey(actionKey);
      setError(null);
      await adminPost(path, body);
      await loadAll();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Admin action failed.");
    } finally {
      setBusyKey(null);
    }
  }

  async function doOmniPlan() {
    try {
      setBusyKey("omni:plan");
      setError(null);
      const res = await getOmniPlan(omniIntent, { category: "enforcement" });
      setOmniPlan((res?.plan as unknown as OmniPlan) || null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Omni plan failed.");
    } finally {
      setBusyKey(null);
    }
  }

  async function doOmniIngest() {
    try {
      setBusyKey("omni:ingest");
      setError(null);
      const features = omniToolFeatures
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 100);

      await adminIngestOmniTool({
        name: omniToolName,
        description: "Ingested from ops console",
        features,
      });

      const omniMetaRes = await getOmniMeta();
      setOmniMetaCount(Number(omniMetaRes?.meta?.count || 0));
      await doOmniPlan();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Omni ingest failed.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">SintraPrime Cluster Console</h1>
          <p className="mt-1 text-sm text-slate-400">Live node health, creditor analytics, and enforcement flow.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAll}
            className="inline-flex items-center rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium transition hover:bg-emerald-500/20"
          >
            Refresh now
          </button>
          {loading ? <span className="text-xs text-slate-400">Syncing…</span> : null}
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-sm font-semibold tracking-[0.15em] text-slate-300 uppercase">Primary Node</h2>
          {primary ? (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-50">{primary.nodeId}</p>
                  <p className="max-w-xs truncate text-xs text-slate-400">{primary.url || "URL unknown"}</p>
                </div>
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusColor(primary.status)}`} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] tracking-wide text-slate-300 uppercase">
                  Role: {primary.role}
                </span>
                {(primary.capabilities || []).map((cap) => (
                  <span
                    key={cap}
                    className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] tracking-wide text-emerald-200 uppercase"
                  >
                    {cap}
                  </span>
                ))}
              </div>
              {typeof primary.lastLatencyMs === "number" ? (
                <p className="mt-2 text-xs text-slate-400">Latency: {primary.lastLatencyMs.toFixed(0)} ms</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No primary candidate detected.</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-sm font-semibold tracking-[0.15em] text-slate-300 uppercase">Cluster Summary</h2>
          <p className="text-2xl font-semibold">
            {nodes.length}
            <span className="ml-1 text-sm text-slate-400">nodes</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Online: {nodes.filter((n) => (n.status || "").toLowerCase() === "online").length} • Offline:{" "}
            {nodes.filter((n) => (n.status || "").toLowerCase() === "offline").length}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            Capabilities:{" "}
            {Array.from(new Set(nodes.flatMap((n) => (n.capabilities || []).map((c) => c.toLowerCase())))).join(", ") ||
              "none"}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-sm font-semibold tracking-[0.15em] text-slate-300 uppercase">Cases Snapshot</h2>
          <p className="text-2xl font-semibold">
            {dashboardItems.length}
            <span className="ml-1 text-sm text-slate-400">tracked</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Active high-risk:{" "}
            {
              dashboardItems.filter(
                (i) => (i.riskLevel || "").toLowerCase() === "high" || (i.riskLevel || "").toLowerCase() === "critical",
              ).length
            }
          </p>
          <p className="mt-3 text-xs text-slate-500">Source: /api/dashboard/status</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Cluster Topology</h2>
            <span className="text-xs text-slate-500">Visual map of nodes</span>
          </div>
          <ClusterGraph nodes={nodes} primary={primary} />
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Advisor Controls</h2>
            <span className="text-xs text-slate-500">Source: /api/admin/advisor/run • /api/advisor/log</span>
          </div>
          <button
            disabled={busyKey === "advisor:run"}
            onClick={() => doAdmin("advisor:run", "/advisor/run", {})}
            className="rounded bg-indigo-700 px-3 py-1.5 text-sm hover:bg-indigo-600 disabled:opacity-50"
          >
            Force Advisor Evaluation
          </button>
          <p className="mt-2 text-[11px] text-slate-500">Forces a strategy reevaluation now.</p>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase">Advisor Feed</p>
              <span className="text-[11px] text-slate-500">Latest {advisorLog.length}</span>
            </div>
            {advisorLog.length === 0 ? (
              <p className="text-[11px] text-slate-500">No advisor log entries yet.</p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {advisorLog.map((it) => (
                  <div key={it.id} className="rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-500">{new Date(it.ts).toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 uppercase">{it.type}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-200">{it.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Cluster Nodes</h2>
          <span className="text-xs text-slate-500">Source: /api/cluster/nodes</span>
        </div>
        {nodes.length === 0 ? (
          <p className="text-sm text-slate-400">No nodes reported.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2 pr-4 text-left">Node</th>
                  <th className="py-2 pr-4 text-left">Role</th>
                  <th className="py-2 pr-4 text-left">Capabilities</th>
                  <th className="py-2 pr-4 text-left">Status</th>
                  <th className="py-2 pr-4 text-left">Latency</th>
                  <th className="py-2 pr-4 text-left">Last Heartbeat</th>
                  <th className="py-2 pr-4 text-left">Controls</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => (
                  <tr key={node.nodeId} className="border-b border-slate-850/40 last:border-0">
                    <td className="py-2 pr-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-100">{node.nodeId}</span>
                        <span className="max-w-xs truncate text-[11px] text-slate-500">{node.url || "—"}</span>
                        <Link
                          href={`/nodes/${encodeURIComponent(node.nodeId)}`}
                          className="mt-0.5 text-[11px] text-emerald-400 hover:text-emerald-300"
                        >
                          View details →
                        </Link>
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] tracking-wide uppercase">{node.role}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {(node.capabilities || []).map((cap) => (
                          <span
                            key={cap}
                            className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] tracking-wide text-slate-300 uppercase"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusColor(node.status)}`} />
                        <span className="text-xs text-slate-300">{node.status || "unknown"}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-300">
                      {typeof node.lastLatencyMs === "number" ? `${node.lastLatencyMs.toFixed(0)} ms` : "—"}
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-400">
                      {node.lastHeartbeat ? new Date(node.lastHeartbeat).toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex flex-wrap gap-1">
                        <button
                          disabled={!node.url || busyKey === `ping:${node.nodeId}`}
                          onClick={() => doAdmin(`ping:${node.nodeId}`, "/node/ping", { url: node.url })}
                          className="rounded bg-slate-800 px-2 py-1 text-[10px] hover:bg-slate-700 disabled:opacity-50"
                        >
                          Ping
                        </button>
                        <button
                          disabled={busyKey === `promote:${node.nodeId}`}
                          onClick={() => doAdmin(`promote:${node.nodeId}`, "/node/role", { nodeId: node.nodeId, role: "primary" })}
                          className="rounded bg-orange-800 px-2 py-1 text-[10px] hover:bg-orange-700 disabled:opacity-50"
                        >
                          Promote
                        </button>
                        <button
                          disabled={busyKey === `hb:${node.nodeId}`}
                          onClick={() =>
                            doAdmin(`hb:${node.nodeId}`, "/node/heartbeat", {
                              nodeId: node.nodeId,
                              url: node.url,
                              role: node.role,
                              capabilities: node.capabilities,
                            })
                          }
                          className="rounded bg-slate-700 px-2 py-1 text-[10px] hover:bg-slate-600 disabled:opacity-50"
                        >
                          Refresh HB
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Creditor Enforcement Analytics</h2>
          <span className="text-xs text-slate-500">Source: /api/analytics/creditors</span>
        </div>

        {creditorEntries.length === 0 ? (
          <p className="text-sm text-slate-400">No analytics yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {creditorEntries.map(([name, stats]) => (
              <div key={name} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <p className="font-medium text-slate-100">{name}</p>
                  {stats.avgDaysToClose !== null ? (
                    <span className="text-[11px] text-slate-400">Avg close: {stats.avgDaysToClose.toFixed(1)} days</span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-400">
                  Opened: {stats.casesOpened} • Closed: {stats.casesClosed}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">Escalated (stage ≥3): {stats.escalatedCount}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Active Enforcement Cases</h2>
          <span className="text-xs text-slate-500">Source: /api/dashboard/status</span>
        </div>

        {dashboardItems.length === 0 ? (
          <p className="text-sm text-slate-400">No active cases.</p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {dashboardItems.map((item) => (
              <div
                key={`${item.creditor}-${item.caseId || "global"}`}
                className="flex items-start justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">{item.creditor}</p>
                  <p className="text-[11px] text-slate-500">Case: {item.caseId || "global"}</p>
                  <p className="text-[11px] text-slate-500">
                    Owner: {item.ownerNodeId || "—"}
                    {typeof item.openedAt === "number" ? ` • Opened: ${new Date(item.openedAt).toLocaleDateString()}` : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Stage {item.stage} • Mode {item.mode}
                    {item.paused ? " • PAUSED" : ""}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] tracking-wide text-slate-50 uppercase ${riskBadgeColor(
                      item.riskLevel,
                    )}`}
                  >
                    {item.riskLevel || "unknown"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {typeof item.lastActionAt === "number"
                      ? new Date(item.lastActionAt).toLocaleString()
                      : new Date(item.lastActionAt).toLocaleString()}
                  </span>

                  <div className="mt-1 flex flex-wrap gap-1 justify-end">
                    <button
                      disabled={busyKey === `pause:${item.creditor}:${item.caseId || "global"}`}
                      onClick={() =>
                        doAdmin(`pause:${item.creditor}:${item.caseId || "global"}`, "/case/pause", {
                          creditor: item.creditor,
                          caseId: item.caseId,
                          pause: !item.paused,
                        })
                      }
                      className="rounded bg-slate-700 px-2 py-1 text-[10px] hover:bg-slate-600 disabled:opacity-50"
                    >
                      {item.paused ? "Resume" : "Pause"}
                    </button>
                    <button
                      disabled={busyKey === `advance:${item.creditor}:${item.caseId || "global"}`}
                      onClick={() =>
                        doAdmin(`advance:${item.creditor}:${item.caseId || "global"}`, "/case/advance", {
                          creditor: item.creditor,
                          caseId: item.caseId,
                        })
                      }
                      className="rounded bg-emerald-700 px-2 py-1 text-[10px] hover:bg-emerald-600 disabled:opacity-50"
                    >
                      Advance
                    </button>
                    <button
                      disabled={busyKey === `binder:${item.creditor}:${item.caseId || "global"}`}
                      onClick={() =>
                        doAdmin(`binder:${item.creditor}:${item.caseId || "global"}`, "/case/binder", {
                          creditor: item.creditor,
                          caseId: item.caseId,
                        })
                      }
                      className="rounded bg-purple-800 px-2 py-1 text-[10px] hover:bg-purple-700 disabled:opacity-50"
                    >
                      Binder
                    </button>
                    <button
                      disabled={busyKey === `pack:${item.creditor}:${item.caseId || "global"}`}
                      onClick={() =>
                        doAdmin(`pack:${item.creditor}:${item.caseId || "global"}`, "/case/filing-pack", {
                          creditor: item.creditor,
                          caseId: item.caseId,
                        })
                      }
                      className="rounded bg-teal-800 px-2 py-1 text-[10px] hover:bg-teal-700 disabled:opacity-50"
                    >
                      Pack
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">OmniSkill Engine</h2>
          <span className="text-xs text-slate-500">Source: /api/omni/* • Matrix: {omniMetaCount} skills</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase">Plan Generator</p>
            <label className="text-[11px] text-slate-500">Intent</label>
            <input
              value={omniIntent}
              onChange={(e) => setOmniIntent(e.target.value)}
              className="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
              placeholder="verizon_enforcement"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                disabled={busyKey === "omni:plan"}
                onClick={doOmniPlan}
                className="rounded bg-emerald-700 px-3 py-1.5 text-sm hover:bg-emerald-600 disabled:opacity-50"
              >
                Build plan
              </button>
              {omniPlan ? (
                <span className="text-[11px] text-slate-500">
                  Steps: {Array.isArray(omniPlan?.pipeline) ? omniPlan.pipeline.length : 0}
                </span>
              ) : null}
            </div>

            {omniPlan ? (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-slate-500">
                  Skills used: {Array.isArray(omniPlan.skillsUsed) ? omniPlan.skillsUsed.length : 0}
                </p>
                <div className="space-y-1">
                  {(omniPlan.pipeline || []).map((p) => (
                    <div
                      key={p.step}
                      className="flex items-center justify-between rounded border border-slate-800 bg-slate-950/60 px-2 py-1"
                    >
                      <span className="text-[11px] text-slate-200">{p.step}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{p.kind}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-slate-500">Build a plan to preview the multi-modal pipeline.</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-slate-400 uppercase">Mimic / Ingest (Admin)</p>
            <label className="text-[11px] text-slate-500">Tool name</label>
            <input
              value={omniToolName}
              onChange={(e) => setOmniToolName(e.target.value)}
              aria-label="Tool name"
              placeholder="Runway / ElevenLabs / Copilot"
              className="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            />
            <label className="mt-2 block text-[11px] text-slate-500">Features (one per line)</label>
            <textarea
              value={omniToolFeatures}
              onChange={(e) => setOmniToolFeatures(e.target.value)}
              aria-label="Tool features"
              placeholder="One feature per line"
              rows={5}
              className="mt-1 w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                disabled={busyKey === "omni:ingest"}
                onClick={doOmniIngest}
                className="rounded bg-indigo-700 px-3 py-1.5 text-sm hover:bg-indigo-600 disabled:opacity-50"
              >
                Ingest skills
              </button>
              <span className="text-[11px] text-slate-500">Writes to runs/capability-matrix.json</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Ingest is admin-gated on the backend. Keep this for local ops.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
