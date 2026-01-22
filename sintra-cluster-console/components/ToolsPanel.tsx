"use client";

import { useEffect, useState } from "react";
import { sintraGet, sintraPost } from "@/lib/api";

type ToolDescriptor = {
  name: string;
  description?: string;
};

export function ToolsPanel() {
  const [tools, setTools] = useState<ToolDescriptor[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [params, setParams] = useState<string>("{}");
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sintraGet("/api/tools")
      .then((res: any) => {
        setTools((res?.tools as ToolDescriptor[]) || []);
      })
      .catch((err: any) => {
        console.error(err);
        setError("Failed to load tools");
      });
  }, []);

  async function runTool() {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setResult(null);

    let parsedParams: any = {};
    try {
      parsedParams = params.trim() ? JSON.parse(params) : {};
    } catch {
      setError("Params must be valid JSON");
      setLoading(false);
      return;
    }

    try {
      const res: any = await sintraPost("/api/tools/run", {
        name: selected,
        params: parsedParams,
      });
      setResult(res?.result ?? res);
    } catch (e: any) {
      setError(e?.message || "Tool run failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-lg border border-slate-800 p-3">
        <div className="mb-2 text-sm font-semibold">Available Tools</div>
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {tools.map((tool) => (
            <button
              key={tool.name}
              onClick={() => setSelected(tool.name)}
              className={
                "w-full rounded px-2 py-1 text-left text-sm " +
                (selected === tool.name
                  ? "bg-emerald-500/20 text-emerald-200"
                  : "hover:bg-slate-800")
              }
            >
              <div className="font-mono text-xs">{tool.name}</div>
              <div className="text-[11px] text-slate-400">{tool.description || ""}</div>
            </button>
          ))}
          {!tools.length && <div className="text-[11px] text-slate-500">No tools registered yet.</div>}
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 p-3">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-sm font-semibold">Params (JSON)</div>
          <div className="text-[11px] text-slate-400">Example: {`{ \"query\": \"verizon dispute\" }`}</div>
        </div>
        <textarea
          className="h-64 w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs"
          aria-label="Tool parameters JSON"
          placeholder='{"key":"value"}'
          value={params}
          onChange={(e) => setParams(e.target.value)}
        />
        <button
          onClick={runTool}
          disabled={!selected || loading}
          className="mt-2 rounded bg-emerald-500 px-3 py-1.5 text-xs text-slate-950 disabled:bg-slate-700"
        >
          {loading ? "Running…" : "Run Tool"}
        </button>
        {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
      </div>

      <div className="rounded-lg border border-slate-800 p-3">
        <div className="mb-2 text-sm font-semibold">Result</div>
        <pre className="max-h-80 whitespace-pre-wrap font-mono text-[11px] overflow-y-auto">
{JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  );
}
