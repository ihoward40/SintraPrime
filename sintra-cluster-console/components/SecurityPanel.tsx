"use client";

import { useEffect, useMemo, useState } from "react";
import { adminPost, getSecurityIncidents, getSecurityState, type SecurityIncidentItem, type SecurityStateResponse } from "@/lib/api";

function fmtIso(iso: string | null | undefined) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleString();
}

function clampJsonPreview(value: unknown, maxChars = 500) {
  try {
    const s = JSON.stringify(value ?? {}, null, 2);
    return s.length > maxChars ? s.slice(0, maxChars) + "\n…" : s;
  } catch {
    return String(value);
  }
}

export function SecurityPanel() {
  const [securityState, setSecurityState] = useState<SecurityStateResponse | null>(null);
  const [securityIncidents, setSecurityIncidents] = useState<SecurityIncidentItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowMinutes, setWindowMinutes] = useState<number>(240);

  async function refresh() {
    setError(null);
    try {
      const [state, incidents] = await Promise.all([getSecurityState(), getSecurityIncidents(25)]);
      setSecurityState(state);
      setSecurityIncidents(Array.isArray(incidents.items) ? incidents.items : []);
    } catch (e: any) {
      setError(String(e?.message || e));
    }
  }

  async function handleAdminAction(label: string, fn: () => Promise<any>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 8_000);
    return () => clearInterval(id);
  }, []);

  const mode = securityState?.profile?.mode ?? "normal";
  const threatScore = securityState?.threat?.score ?? "n/a";
  const threatLevel = securityState?.threat?.level ?? "n/a";

  const modePillClass = useMemo(() => {
    if (mode === "lockdown") return "bg-red-900/50 text-red-200 border-red-800";
    if (mode === "hardened") return "bg-amber-900/50 text-amber-200 border-amber-800";
    return "bg-emerald-900/40 text-emerald-200 border-emerald-800";
  }, [mode]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400">Perimeter + threat scoring + integrity drift</div>
          <h2 className="text-lg font-semibold">Security War Room</h2>
        </div>
        <button
          onClick={() => void refresh()}
          className="rounded bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
          disabled={!!busy}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-200">{error}</div>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Security Profile</h3>
          <span className="text-xs text-slate-500">Mode-aware perimeter</span>
        </div>

        {securityState ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-300">Mode:</span>
              <span className={"rounded border px-2 py-1 text-[11px] font-semibold uppercase " + modePillClass}>
                {mode}
              </span>
            </div>
            <p className="text-slate-400">Last change: {fmtIso(securityState.profile?.lastChange)}</p>
            <p className="text-slate-500">Reason: {securityState.profile?.reason || "—"}</p>
            <p className="text-slate-500">
              Threat score: {String(threatScore)} • Level: {String(threatLevel)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Loading…</p>
        )}

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button
            onClick={() =>
              void handleAdminAction("Set security: normal", () => adminPost("/security/profile", { mode: "normal", reason: "console" }))
            }
            className="rounded bg-slate-800 px-3 py-1.5 hover:bg-slate-700"
            disabled={!!busy}
          >
            Normal
          </button>
          <button
            onClick={() =>
              void handleAdminAction("Set security: hardened", () =>
                adminPost("/security/profile", { mode: "hardened", reason: "console" }),
              )
            }
            className="rounded bg-amber-800 px-3 py-1.5 hover:bg-amber-700"
            disabled={!!busy}
          >
            Hardened
          </button>
          <button
            onClick={() =>
              void handleAdminAction("Set security: lockdown", () =>
                adminPost("/security/profile", { mode: "lockdown", reason: "console" }),
              )
            }
            className="rounded bg-red-800 px-3 py-1.5 hover:bg-red-700"
            disabled={!!busy}
          >
            Lockdown
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <div className="text-slate-400">Binder window (minutes)</div>
          <input
            value={String(windowMinutes)}
            onChange={(e) => setWindowMinutes(Number(e.target.value || 0))}
            className="w-28 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-slate-100"
            type="number"
            min={1}
            max={1440}
            aria-label="Security binder time window (minutes)"
            title="Security binder time window (minutes)"
          />
          <button
            onClick={() =>
              void handleAdminAction("Generate security binder", () =>
                adminPost("/security/binder", { windowMinutes: windowMinutes || 60 }),
              )
            }
            className="rounded bg-sky-900/60 px-3 py-1.5 text-sky-200 hover:bg-sky-900"
            disabled={!!busy}
          >
            Generate Binder
          </button>
          {busy && <span className="text-slate-500">{busy}…</span>}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Security Incidents</h3>
          <span className="text-xs text-slate-500">Source: /api/security/incidents</span>
        </div>

        {securityIncidents.length === 0 ? (
          <p className="text-sm text-slate-400">No incidents recorded yet.</p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1 text-xs">
            {securityIncidents.map((inc) => (
              <div key={inc.id} className="rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] text-slate-300">{inc.type}</span>
                  <span className="text-[10px] text-slate-500">{new Date(inc.ts).toLocaleString()}</span>
                </div>
                <pre className="mt-1 whitespace-pre-wrap text-[10px] text-slate-500">{clampJsonPreview(inc.payload, 800)}</pre>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
