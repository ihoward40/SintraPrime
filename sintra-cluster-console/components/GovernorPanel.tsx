"use client";

import { useEffect, useMemo, useState } from "react";
import { adminPost, sintraGet, sintraPost } from "@/lib/api";

type GovernorAction = {
  actionId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  req: any;
  decision: any;
};

type GovernorActionsResponse = {
  ok: boolean;
  pending: GovernorAction[];
  recentDecisions: any[];
  recentActions: any[];
};

export function GovernorPanel() {
  const [refreshToken, setRefreshToken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GovernorActionsResponse | null>(null);

  const [reqType, setReqType] = useState("filing");
  const [reqMode, setReqMode] = useState("standard");
  const [reqPayload, setReqPayload] = useState("{\n  \"summary\": \"Draft motion to compel\"\n}");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await sintraGet<GovernorActionsResponse>(`/api/governor/actions?limit=50`);
      setData(res);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const pending = data?.pending || [];
  const recent = data?.recentDecisions || [];
  const last20 = useMemo(() => recent.slice(0, 20), [recent]);

  async function submitRequest() {
    setError(null);
    try {
      const payload = JSON.parse(reqPayload);
      await sintraPost(`/api/governor/request`, { type: reqType, mode: reqMode, payload });
      setRefreshToken((x) => x + 1);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  async function overrideAction(actionId: string, final: "approve" | "deny" | "throttle") {
    setError(null);
    try {
      await adminPost(`/governor/override`, { actionId, final, reason: "manual_override" });
      setRefreshToken((x) => x + 1);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Autopilot Governor</h2>
          <button
            onClick={() => setRefreshToken((x) => x + 1)}
            className="rounded bg-slate-800 px-3 py-1.5 text-xs hover:bg-slate-700"
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Pipeline: request → rules check → tribunal vote → approve / deny / throttle (or override-required).
        </p>
        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Submit Action Request</h3>
          <div className="grid gap-2">
            <label className="text-[11px] text-slate-500">Action Type</label>
            <select
              aria-label="Action Type"
              value={reqType}
              onChange={(e) => setReqType(e.target.value)}
              className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm"
            >
              <option value="filing">Filing</option>
              <option value="motion">Motion</option>
              <option value="enforcement">Enforcement</option>
              <option value="trade">Trade</option>
              <option value="expense">Expense</option>
              <option value="investment">Investment</option>
            </select>

            <label className="text-[11px] text-slate-500">Mode</label>
            <select
              aria-label="Mode"
              value={reqMode}
              onChange={(e) => setReqMode(e.target.value)}
              className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-sm"
            >
              <option value="conservative">Conservative</option>
              <option value="standard">Standard</option>
              <option value="aggressive">Aggressive</option>
              <option value="nuclear">Nuclear</option>
            </select>

            <label className="text-[11px] text-slate-500">Payload (JSON)</label>
            <textarea
              aria-label="Payload JSON"
              value={reqPayload}
              onChange={(e) => setReqPayload(e.target.value)}
              rows={8}
              className="w-full rounded border border-slate-800 bg-slate-950 px-2 py-1.5 font-mono text-xs"
            />

            <button
              onClick={submitRequest}
              className="mt-1 rounded bg-emerald-700 px-3 py-2 text-sm hover:bg-emerald-600"
            >
              Submit to Governor
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-200">Live Actions (Pending)</h3>
          {pending.length ? (
            <div className="space-y-2">
              {pending.map((a) => (
                <div key={a.actionId} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {String(a.req?.type || "unknown")} • {a.actionId.slice(0, 8)}
                      </div>
                      <div className="text-[11px] text-slate-500">{a.createdAt}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => overrideAction(a.actionId, "approve")}
                        className="rounded bg-emerald-800 px-2 py-1 text-[11px] hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => overrideAction(a.actionId, "throttle")}
                        className="rounded bg-amber-800 px-2 py-1 text-[11px] hover:bg-amber-700"
                      >
                        Delay
                      </button>
                      <button
                        onClick={() => overrideAction(a.actionId, "deny")}
                        className="rounded bg-red-800 px-2 py-1 text-[11px] hover:bg-red-700"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-950 p-2 text-[11px] text-slate-300">
                    {JSON.stringify(a.req?.payload ?? {}, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No pending actions.</p>
          )}
          <p className="mt-2 text-[11px] text-slate-500">Overrides are admin-gated on the backend.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Violations / Decisions Feed</h3>
        {last20.length ? (
          <div className="space-y-2">
            {last20.map((d: any, idx: number) => (
              <div key={idx} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-200">
                    {String(d?.decision?.final || d?.final || "unknown").toUpperCase()} • {String(
                      d?.decision?.actionId || d?.actionId || "",
                    ).slice(0, 8)}
                  </div>
                  <div className="text-[11px] text-slate-500">{String(d?.ts || d?.decidedAt || "")}</div>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  type: {String(d?.decision?.request?.type || d?.request?.type || "unknown")} • reason:{" "}
                  {String(d?.decision?.reason || d?.reason || "")}
                </div>
                {Array.isArray(d?.decision?.violations || d?.violations) &&
                (d?.decision?.violations || d?.violations).length ? (
                  <div className="mt-1 text-[11px] text-amber-300">
                    Violations: {(d?.decision?.violations || d?.violations).join(", ")}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No decisions logged yet.</p>
        )}
      </div>
    </div>
  );
}
