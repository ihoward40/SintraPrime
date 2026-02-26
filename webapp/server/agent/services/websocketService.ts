import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? (process.env.ALLOWED_ORIGINS || "https://sintraprime.manus.space").split(",") : "*",
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
  });

  io.on("connection", (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });

    // Join room for specific task
    socket.on("join_task", (taskId: string) => {
      socket.join(`task_${taskId}`);
      console.log(`[WebSocket] Client ${socket.id} joined task ${taskId}`);
    });

    // Leave room for specific task
    socket.on("leave_task", (taskId: string) => {
      socket.leave(`task_${taskId}`);
      console.log(`[WebSocket] Client ${socket.id} left task ${taskId}`);
    });
  });

  return io;
}

export function getWebSocketServer(): SocketIOServer | null {
  return io;
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
  if (!io) {
    console.warn("[WebSocket] Server not initialized");
    return;
  }

  const room = `task_${event.taskId}`;
  io.to(room).emit("agent_progress", event);
  console.log(`[WebSocket] Emitted ${event.type} to room ${room}`);
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
