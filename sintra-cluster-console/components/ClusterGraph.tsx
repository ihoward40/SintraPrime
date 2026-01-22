"use client";

import { ClusterNode } from "@/lib/api";

type Props = {
  nodes: ClusterNode[];
  primary?: ClusterNode | null;
};

function nodeColor(node: ClusterNode, isPrimary: boolean) {
  if (isPrimary) return "fill-emerald-400";
  if ((node.status || "").toLowerCase() === "offline") return "fill-red-500";
  return "fill-slate-300";
}

export default function ClusterGraph({ nodes, primary }: Props) {
  if (!nodes.length) {
    return <div className="text-xs text-slate-400">No nodes available for graph view.</div>;
  }

  const width = 360;
  const height = 220;
  const centerX = width / 2;
  const centerY = height / 2;

  const primaryId = primary?.nodeId || nodes[0].nodeId;
  const primaryNode = nodes.find((n) => n.nodeId === primaryId) || nodes[0];

  const others = nodes.filter((n) => n.nodeId !== primaryNode.nodeId);
  const radius = 75;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[220px] w-full rounded-lg border border-slate-800 bg-slate-950/60"
    >
      {others.map((n, idx) => {
        const angle = (2 * Math.PI * idx) / others.length;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        return (
          <line
            key={`${n.nodeId}-line`}
            x1={centerX}
            y1={centerY}
            x2={x}
            y2={y}
            stroke="#475569"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        );
      })}

      <g>
        <circle cx={centerX} cy={centerY} r={18} className={nodeColor(primaryNode, true)} />
        <text
          x={centerX}
          y={centerY + 30}
          textAnchor="middle"
          className="fill-slate-200 text-[10px]"
        >
          {primaryNode.nodeId}
        </text>
      </g>

      {others.map((n, idx) => {
        const angle = (2 * Math.PI * idx) / others.length;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        return (
          <g key={n.nodeId}>
            <circle cx={x} cy={y} r={12} className={nodeColor(n, false)} />
            <text x={x} y={y + 22} textAnchor="middle" className="fill-slate-300 text-[9px]">
              {n.nodeId}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
