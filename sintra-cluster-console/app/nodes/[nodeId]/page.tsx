"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  adminPost,
  ClusterNode,
  DashboardStatusItem,
  getClusterNodes,
  getDashboardStatus,
} from "@/lib/api";

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

function getNodeIdParam(params: ReturnType<typeof useParams>) {
  const raw = params?.nodeId;
  if (typeof raw === "string") return decodeURIComponent(raw);
  if (Array.isArray(raw) && raw.length) return decodeURIComponent(raw[0]);
  return "";
}

export default function NodeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const nodeIdParam = getNodeIdParam(params);

  const [node, setNode] = useState<ClusterNode | null>(null);
  const [cases, setCases] = useState<DashboardStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);

      const [nodesRes, dashboardRes] = await Promise.all([getClusterNodes(), getDashboardStatus()]);

      const allNodes = nodesRes.nodes || [];
      const found = allNodes.find((x) => x.nodeId === nodeIdParam) || null;
      setNode(found);

      if (found) {
        const caps = (found.capabilities || []).map((c) => c.toLowerCase());
        const filtered = (dashboardRes.items || []).filter((item) => {
          const cred = item.creditor.toLowerCase();
          return caps.some((cap) => cred.includes(cap));
        });
        setCases(filtered);
      } else {
        setCases([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!nodeIdParam) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIdParam]);

  async function handleAdmin(label: string, fn: () => Promise<unknown>) {
    try {
      setMsg(`Running: ${label}...`);
      await fn();
      setMsg(`${label} completed`);
      await load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setMsg(`Error: ${message}`);
    } finally {
      setTimeout(() => setMsg(null), 6000);
    }
  }

  if (!node && !loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <button
            onClick={() => router.push("/")}
            className="mb-4 text-xs text-emerald-400 hover:text-emerald-300"
          >
            ← Back to cluster
          </button>
          <p className="text-sm text-slate-300">
            Node <span className="font-mono">{nodeIdParam}</span> not found in cluster registry.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <button onClick={() => router.push("/")} className="text-xs text-emerald-400 hover:text-emerald-300">
           ← Back to cluster
        </button>

        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Node: {node?.nodeId}</h1>
          <p className="text-xs text-slate-400">Direct view and controls for this SintraPrime node.</p>
          {msg ? <p className="text-[11px] text-slate-200">{msg}</p> : null}
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">Node Info</h2>
          {node ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusColor(node.status)}`} />
                <span className="text-slate-200">{node.status || "unknown"}</span>
              </div>
              <p className="text-slate-300">
                URL: <span className="font-mono text-xs">{node.url || "—"}</span>
              </p>
              <p className="text-slate-300">
                Role: <span className="font-mono text-xs">{node.role}</span>
              </p>
              <p className="text-slate-300">
                Capabilities: <span className="font-mono text-xs">{(node.capabilities || []).join(", ") || "none"}</span>
              </p>
              {typeof node.lastLatencyMs === "number" ? (
                <p className="text-slate-300">Latency: {node.lastLatencyMs.toFixed(0)} ms</p>
              ) : null}
              <p className="text-xs text-slate-400">
                Last heartbeat: {node.lastHeartbeat ? new Date(node.lastHeartbeat).toLocaleString() : "—"}
              </p>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">Node Controls</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => handleAdmin("Ping node", () => adminPost("/node/ping", { url: node?.url }))}
              className="rounded bg-slate-800 px-3 py-1.5 hover:bg-slate-700"
            >
              Ping
            </button>
            <button
              onClick={() =>
                handleAdmin("Promote to primary", () =>
                  adminPost("/node/role", {
                    nodeId: node?.nodeId,
                    role: "primary",
                  }),
                )
              }
              className="rounded bg-orange-800 px-3 py-1.5 hover:bg-orange-700"
            >
              Promote to primary
            </button>
            <button
              onClick={() =>
                handleAdmin("Refresh heartbeat", () =>
                  adminPost("/node/heartbeat", {
                    nodeId: node?.nodeId,
                    url: node?.url,
                    role: node?.role,
                    capabilities: node?.capabilities,
                  }),
                )
              }
              className="rounded bg-slate-700 px-3 py-1.5 hover:bg-slate-600"
            >
              Refresh heartbeat
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            These are soft controls for cluster management. Role changes are advisory to cluster logic.
          </p>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Cases Likely Owned by This Node</h2>
            <span className="text-xs text-slate-500">Filtered by node capabilities vs. creditor name</span>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : cases.length === 0 ? (
            <p className="text-sm text-slate-400">
              No matching cases found in the dashboard feed for this node&apos;s capabilities.
            </p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {cases.map((item) => (
                <div
                  key={`${item.creditor}-${item.caseId}`}
                  className="flex items-start justify-between rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">{item.creditor}</p>
                    <p className="text-[11px] text-slate-500">Case: {item.caseId}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Stage {item.stage} • Mode {item.mode}
                      {item.paused ? " • PAUSED" : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-slate-500">
                      {typeof item.lastActionAt === "number"
                        ? new Date(item.lastActionAt).toLocaleString()
                        : new Date(item.lastActionAt).toLocaleString()}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <button
                        onClick={() =>
                          handleAdmin(item.paused ? "Resume case" : "Pause case", () =>
                            adminPost("/case/pause", {
                              creditor: item.creditor,
                              caseId: item.caseId,
                              pause: !item.paused,
                            }),
                          )
                        }
                        className="rounded bg-slate-700 px-2 py-1 text-[10px] hover:bg-slate-600"
                      >
                        {item.paused ? "Resume" : "Pause"}
                      </button>
                      <button
                        onClick={() =>
                          handleAdmin("Advance stage", () =>
                            adminPost("/case/advance", {
                              creditor: item.creditor,
                              caseId: item.caseId,
                            }),
                          )
                        }
                        className="rounded bg-emerald-700 px-2 py-1 text-[10px] hover:bg-emerald-600"
                      >
                        Advance
                      </button>
                      <button
                        onClick={() =>
                          handleAdmin("Binder request", () =>
                            adminPost("/case/binder", {
                              creditor: item.creditor,
                              caseId: item.caseId,
                            }),
                          )
                        }
                        className="rounded bg-purple-800 px-2 py-1 text-[10px] hover:bg-purple-700"
                      >
                        Binder
                      </button>
                      <button
                        onClick={() =>
                          handleAdmin("Filing pack request", () =>
                            adminPost("/case/filing-pack", {
                              creditor: item.creditor,
                              caseId: item.caseId,
                            }),
                          )
                        }
                        className="rounded bg-teal-800 px-2 py-1 text-[10px] hover:bg-teal-700"
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
      </div>
    </main>
  );
}
