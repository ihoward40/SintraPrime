"use client";

import { useEffect, useState } from "react";
import { sintraGet, sintraPost } from "@/lib/api";

type DomainsResponse = {
  domains?: string[];
};

type DomainItemsResponse = {
  items?: any[];
};

export function MemoryPanel() {
  const [domains, setDomains] = useState<string[]>([]);
  const [domain, setDomain] = useState<string>("general");
  const [items, setItems] = useState<any[]>([]);
  const [appendText, setAppendText] = useState<string>("{");
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDomains() {
    setLoadingDomains(true);
    setError(null);
    try {
      const res = (await sintraGet("/api/memory/domains")) as DomainsResponse;
      const list = (res?.domains ?? []).filter((d) => typeof d === "string") as string[];
      setDomains(list);
      if (list.length && !list.includes(domain)) setDomain(list[0]);
    } catch (e: any) {
      setError(e?.message || "Failed to load memory domains");
    } finally {
      setLoadingDomains(false);
    }
  }

  async function loadItems(nextDomain: string) {
    setLoadingItems(true);
    setError(null);
    try {
      const res = (await sintraGet(`/api/memory/${encodeURIComponent(nextDomain)}`)) as DomainItemsResponse;
      const list = Array.isArray(res?.items) ? res.items : Array.isArray((res as any)) ? (res as any) : [];
      setItems(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load domain items");
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }

  useEffect(() => {
    void loadDomains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadItems(domain);
  }, [domain]);

  async function append() {
    setSaving(true);
    setError(null);

    let parsed: any;
    try {
      parsed = appendText.trim() ? JSON.parse(appendText) : {};
    } catch {
      setError("Append item must be valid JSON");
      setSaving(false);
      return;
    }

    try {
      await sintraPost(`/api/memory/${encodeURIComponent(domain)}`, { item: parsed });
      setAppendText("{}");
      await loadItems(domain);
    } catch (e: any) {
      setError(e?.message || "Failed to append memory");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-lg border border-slate-800 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Domains</div>
          <button
            onClick={loadDomains}
            disabled={loadingDomains}
            className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 disabled:bg-slate-900"
          >
            {loadingDomains ? "Loading…" : "Refresh"}
          </button>
        </div>

        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 p-2 text-xs"
          aria-label="Memory domain"
        >
          {(domains.length ? domains : [domain]).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <div className="mt-3">
          <div className="mb-1 text-xs text-slate-400">Append item (JSON)</div>
          <textarea
            className="h-40 w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs"
            aria-label="Append memory item JSON"
            placeholder='{"note":"..."}'
            value={appendText}
            onChange={(e) => setAppendText(e.target.value)}
          />
          <button
            onClick={append}
            disabled={saving}
            className="mt-2 rounded bg-emerald-500 px-3 py-1.5 text-xs text-slate-950 disabled:bg-slate-700"
          >
            {saving ? "Appending…" : "Append"}
          </button>
        </div>

        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
      </div>

      <div className="rounded-lg border border-slate-800 p-3 lg:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold">Recent Items</div>
          <div className="text-[11px] text-slate-500">{loadingItems ? "Loading…" : `${items.length} items`}</div>
        </div>

        <div className="max-h-[32rem] overflow-y-auto">
          {!items.length && !loadingItems && <div className="text-[12px] text-slate-500">No items.</div>}
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-200">
{JSON.stringify(items, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
