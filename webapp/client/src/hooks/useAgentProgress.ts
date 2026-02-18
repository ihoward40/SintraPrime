import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export interface AgentProgressEvent {
  taskId: string;
  type: "start" | "step" | "tool_call" | "tool_result" | "complete" | "error";
  data: any;
  timestamp: number;
}

export function useAgentProgress(taskId?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [events, setEvents] = useState<AgentProgressEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  useEffect(() => {
    // Connect to WebSocket server
    const newSocket = io({
      path: "/socket.io",
    });

    newSocket.on("connect", () => {
      console.log("[AgentProgress] Connected to WebSocket");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("[AgentProgress] Disconnected from WebSocket");
      setIsConnected(false);
    });

    newSocket.on("agent:progress", (event: AgentProgressEvent) => {
      console.log("[AgentProgress] Received event:", event);
      setEvents((prev) => [...prev, event]);

      // Update current step
      if (event.type === "step") {
        setCurrentStep(event.data.step);
      } else if (event.type === "complete" || event.type === "error") {
        setCurrentStep(null);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Join task room when taskId changes
  useEffect(() => {
    if (socket && taskId) {
      console.log(`[AgentProgress] Joining task ${taskId}`);
      socket.emit("agent:join_task", taskId);

      return () => {
        console.log(`[AgentProgress] Leaving task ${taskId}`);
        socket.emit("agent:leave_task", taskId);
      };
    }
  }, [socket, taskId]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setCurrentStep(null);
  }, []);

  return {
    events,
    isConnected,
    currentStep,
    clearEvents,
  };
}
