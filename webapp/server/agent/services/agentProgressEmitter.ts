// Agent progress emitter that uses the existing WebSocket server
// This integrates with the server/_core/websocket.ts setup

// Store reference to Socket.IO server (set during server initialization)
let ioInstance: any = null;

export function setSocketIOInstance(io: any): void {
  ioInstance = io;
  console.log("[AgentProgress] Socket.IO instance registered");
}

// Event types for agent progress
export interface AgentProgressEvent {
  taskId: string;
  type: "start" | "step" | "tool_call" | "tool_result" | "complete" | "error";
  data: any;
  timestamp: number;
}

// Emit agent progress to all clients watching a task
export function emitAgentProgress(event: AgentProgressEvent): void {
  if (!ioInstance) {
    console.warn("[AgentProgress] Socket.IO not initialized, skipping emit");
    return;
  }

  const room = `task_${event.taskId}`;
  ioInstance.to(room).emit("agent:progress", event);
  console.log(`[AgentProgress] Emitted ${event.type} to room ${room}`);
}

// Helper functions for specific event types
export function emitTaskStart(taskId: string, task: string): void {
  emitAgentProgress({
    taskId,
    type: "start",
    data: { task },
    timestamp: Date.now(),
  });
}

export function emitStep(taskId: string, step: string, reasoning: string): void {
  emitAgentProgress({
    taskId,
    type: "step",
    data: { step, reasoning },
    timestamp: Date.now(),
  });
}

export function emitToolCall(taskId: string, toolName: string, params: any): void {
  emitAgentProgress({
    taskId,
    type: "tool_call",
    data: { toolName, params },
    timestamp: Date.now(),
  });
}

export function emitToolResult(taskId: string, toolName: string, result: any): void {
  emitAgentProgress({
    taskId,
    type: "tool_result",
    data: { toolName, result },
    timestamp: Date.now(),
  });
}

export function emitTaskComplete(taskId: string, result: any): void {
  emitAgentProgress({
    taskId,
    type: "complete",
    data: { result },
    timestamp: Date.now(),
  });
}

export function emitTaskError(taskId: string, error: string): void {
  emitAgentProgress({
    taskId,
    type: "error",
    data: { error },
    timestamp: Date.now(),
  });
}
