"use client";

import { useEffect, useState } from "react";
import { sintraGet, sintraPost } from "@/lib/api";

type WorkflowsResponse = {
  workflows?: any;
};

export function WorkflowsPanel() {
  const [text, setText] = useState<string>("{\n  \"workflows\": []\n}\n");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = (await sintraGet("/api/workflows")) as WorkflowsResponse;
      const payload = res?.workflows ?? res;
      setText(JSON.stringify(payload, null, 2));
    } catch (e: any) {
      setError(e?.message || "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setStatus(null);

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("Invalid JSON");
      setSaving(false);
      return;
    }

    try {
      await sintraPost("/api/workflows", parsed);
      setStatus("Saved.");
    } catch (e: any) {
      setError(e?.message || "Failed to save workflows");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-800 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">Workflows (JSON)</div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-200 disabled:bg-slate-900"
          >
            {loading ? "Loading…" : "Reload"}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-emerald-500 px-2 py-1 text-xs text-slate-950 disabled:bg-slate-700"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <textarea
        className="h-[28rem] w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs"
        aria-label="Workflows JSON editor"
        placeholder='{"workflows": []}'
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-2 min-h-[1rem] text-xs">
        {error && <span className="text-red-400">{error}</span>}
        {!error && status && <span className="text-emerald-300">{status}</span>}
      </div>
    </div>
  );
}
