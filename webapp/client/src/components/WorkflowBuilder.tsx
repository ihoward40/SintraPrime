/**
 * Visual Workflow Builder Component
 * Drag-and-drop interface for creating automation workflows
 */

import React, { useCallback, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  NodeChange,
  EdgeChange,
  Connection,
  MiniMap
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Play, Save, Download } from "lucide-react";

const nodeTypes = {
  start: { label: "Start", color: "#10b981" },
  scraping: { label: "Web Scraping", color: "#3b82f6" },
  video: { label: "Video Generation", color: "#8b5cf6" },
  condition: { label: "Condition", color: "#f59e0b" },
  transform: { label: "Transform Data", color: "#06b6d4" },
  end: { label: "End", color: "#ef4444" }
};

const initialNodes: Node[] = [
  {
    id: "1",
    type: "input",
    data: { label: "Start" },
    position: { x: 250, y: 50 },
    style: { background: nodeTypes.start.color, color: "white" }
  }
];

export function WorkflowBuilder() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeType, setSelectedNodeType] = useState<keyof typeof nodeTypes | null>(null);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  );

  const addNode = (type: keyof typeof nodeTypes) => {
    const newNode: Node = {
      id: `${nodes.length + 1}`,
      type: type === "start" ? "input" : type === "end" ? "output" : "default",
      data: { label: nodeTypes[type].label },
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
      style: { background: nodeTypes[type].color, color: "white" }
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const saveWorkflow = () => {
    const workflow = {
      nodes,
      edges
    };
    console.log("Saving workflow:", workflow);
    // TODO: Call tRPC mutation to save workflow
  };

  const executeWorkflow = () => {
    console.log("Executing workflow");
    // TODO: Call tRPC mutation to execute workflow
  };

  const exportWorkflow = () => {
    const workflow = {
      nodes,
      edges
    };
    const dataStr = JSON.stringify(workflow, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = "workflow.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="flex h-screen">
      {/* Node Palette */}
      <Card className="w-64 p-4 m-4 overflow-y-auto">
        <h3 className="font-semibold mb-4">Workflow Nodes</h3>
        <div className="space-y-2">
          {Object.entries(nodeTypes).map(([type, config]) => (
            <Button
              key={type}
              variant="outline"
              className="w-full justify-start"
              style={{ borderLeft: `4px solid ${config.color}` }}
              onClick={() => addNode(type as keyof typeof nodeTypes)}
            >
              {config.label}
            </Button>
          ))}
        </div>

        <div className="mt-6 space-y-2">
          <Button onClick={saveWorkflow} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save Workflow
          </Button>
          <Button onClick={executeWorkflow} variant="secondary" className="w-full">
            <Play className="w-4 h-4 mr-2" />
            Execute
          </Button>
          <Button onClick={exportWorkflow} variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>

        <div className="mt-6 p-3 bg-muted rounded-md text-sm">
          <p className="font-medium mb-2">Instructions:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• Click nodes to add them</li>
            <li>• Drag to position nodes</li>
            <li>• Connect nodes by dragging from handles</li>
            <li>• Delete: Select + Delete key</li>
          </ul>
        </div>

        {/* Trigger Linking Section */}
        <div className="mt-6">
          <h3 className="font-semibold mb-4">Auto-Start Triggers</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Connect triggers to auto-start this workflow
          </p>
          <Button variant="outline" className="w-full" onClick={() => window.location.href = '/workflow-triggers'}>
            Manage Triggers
          </Button>
        </div>
      </Card>

      {/* Workflow Canvas */}
      <div className="flex-1 m-4">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
