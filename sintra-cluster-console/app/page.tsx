"use client";

import { useMemo, useState } from "react";
import { OverviewPanel } from "@/components/OverviewPanel";
import { ToolsPanel } from "@/components/ToolsPanel";
import { PersonaPanel } from "@/components/PersonaPanel";
import { WorkflowsPanel } from "@/components/WorkflowsPanel";
import { MemoryPanel } from "@/components/MemoryPanel";
import { GovernorPanel } from "@/components/GovernorPanel";
import { SecurityPanel } from "@/components/SecurityPanel";

type TabId = "overview" | "tools" | "personas" | "workflows" | "memory" | "governor" | "security";

export default function HomePage() {
  const [tab, setTab] = useState<TabId>("overview");

  const panel = useMemo(() => {
    switch (tab) {
      case "overview":
        return <OverviewPanel />;
      case "tools":
        return <ToolsPanel />;
      case "personas":
        return <PersonaPanel />;
      case "workflows":
        return <WorkflowsPanel />;
      case "memory":
        return <MemoryPanel />;
      case "governor":
        return <GovernorPanel />;
      case "security":
        return <SecurityPanel />;
      default:
        return <OverviewPanel />;
    }
  }, [tab]);

  const tabs: Array<{ id: TabId; label: string; hint: string }> = [
    { id: "overview", label: "Overview", hint: "War room dashboard" },
    { id: "tools", label: "Tools", hint: "Run registered tools" },
    { id: "personas", label: "Personas", hint: "Set active persona" },
    { id: "workflows", label: "Workflows", hint: "Edit workflow JSON" },
    { id: "memory", label: "Memory", hint: "Domains + recent items" },
    { id: "governor", label: "Governor", hint: "Approve / block / throttle" },
    { id: "security", label: "Security", hint: "Threat + incidents + binder" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs text-slate-400">SINTRAPRIME • Cluster Console</div>
            <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          </div>
          <div className="text-xs text-slate-500">Ops UI backed by /api/*</div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-950 p-2">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  "rounded px-3 py-2 text-left " +
                  (active
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-slate-900/40 text-slate-200 hover:bg-slate-900")
                }
              >
                <div className="text-xs font-semibold">{t.label}</div>
                <div className="text-[11px] text-slate-500">{t.hint}</div>
              </button>
            );
          })}
        </div>

        {panel}
      </div>
    </div>
  );
}
