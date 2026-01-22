"use client";

import { useEffect, useMemo, useState } from "react";
import { sintraGet, sintraPost } from "@/lib/api";

type Persona = {
  id: string;
  name?: string;
  summary?: string;
  traits?: string[];
};

type PersonaApiResponse = {
  personas?: Persona[];
  activeId?: string;
  active?: string;
  activePersonaId?: string;
};

export function PersonaPanel() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePersona = useMemo(() => personas.find((p) => p.id === activeId) ?? null, [personas, activeId]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = (await sintraGet("/api/persona")) as PersonaApiResponse;
      const list = (res?.personas ?? []).filter(Boolean) as Persona[];
      setPersonas(list);
      const current = res?.activeId ?? res?.active ?? res?.activePersonaId ?? null;
      setActiveId(current && typeof current === "string" ? current : list[0]?.id ?? null);
    } catch (e: any) {
      setError(e?.message || "Failed to load personas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setActive(nextId: string) {
    setSaving(true);
    setError(null);
    try {
      await sintraPost("/api/persona/active", { id: nextId });
      setActiveId(nextId);
    } catch (e: any) {
      setError(e?.message || "Failed to set active persona");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-lg border border-slate-800 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Personas</div>
          <button
            onClick={load}
            disabled={loading}
            className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 disabled:bg-slate-900"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <div className="max-h-80 space-y-1 overflow-y-auto">
          {personas.map((p) => {
            const isActive = p.id === activeId;
            return (
              <button
                key={p.id}
                onClick={() => setActive(p.id)}
                disabled={saving}
                className={
                  "w-full rounded px-2 py-1 text-left text-sm " +
                  (isActive ? "bg-emerald-500/20 text-emerald-200" : "hover:bg-slate-800")
                }
              >
                <div className="font-mono text-xs">{p.id}</div>
                <div className="text-[11px] text-slate-400">{p.summary || p.name || ""}</div>
              </button>
            );
          })}
          {!personas.length && <div className="text-[11px] text-slate-500">No personas available.</div>}
        </div>

        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
      </div>

      <div className="rounded-lg border border-slate-800 p-3 lg:col-span-2">
        <div className="mb-2 text-sm font-semibold">Active Persona</div>
        {!activePersona && <div className="text-[12px] text-slate-500">Select a persona to view details.</div>}
        {activePersona && (
          <div className="space-y-2">
            <div className="text-sm text-slate-200">
              <span className="font-semibold">ID:</span> <span className="font-mono text-xs">{activePersona.id}</span>
            </div>
            {activePersona.summary && <div className="text-[12px] text-slate-300">{activePersona.summary}</div>}
            {!!activePersona.traits?.length && (
              <div className="flex flex-wrap gap-1">
                {activePersona.traits.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="text-[11px] text-slate-500">
              {saving ? "Setting active persona…" : ""}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
