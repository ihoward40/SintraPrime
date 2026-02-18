/**
 * Intelligence WebSocket Service
 * Provides real-time updates for legal intelligence feed and agent activity
 */

import type { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";

export interface IntelligenceAlert {
  id: string;
  type: "legal_update" | "case_alert" | "regulatory_change" | "court_decision";
  title: string;
  description: string;
  source: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  url?: string;
  tags?: string[];
}

export interface AgentActivity {
  id: string;
  agentName: string;
  taskDescription: string;
  status: "starting" | "running" | "completed" | "failed";
  progress: number;
  startTime: Date;
  endTime?: Date;
  result?: string;
  error?: string;
}

class IntelligenceWebSocketService {
  private io: SocketIOServer | null = null;
  private connectedClients: Set<string> = new Set();

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*", // Configure based on your needs
        methods: ["GET", "POST"],
      },
      path: "/intelligence-ws",
    });

    this.io.on("connection", (socket: Socket) => {
      console.log(`[IntelligenceWS] Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send initial connection confirmation
      socket.emit("connected", {
        message: "Connected to Intelligence WebSocket",
        timestamp: new Date().toISOString(),
      });

      // Handle client subscription to specific channels
      socket.on("subscribe", (channel: string) => {
        console.log(`[IntelligenceWS] Client ${socket.id} subscribed to ${channel}`);
        socket.join(channel);
        socket.emit("subscribed", { channel });
      });

      socket.on("unsubscribe", (channel: string) => {
        console.log(`[IntelligenceWS] Client ${socket.id} unsubscribed from ${channel}`);
        socket.leave(channel);
        socket.emit("unsubscribed", { channel });
      });

      socket.on("disconnect", () => {
        console.log(`[IntelligenceWS] Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });

    // Start mock data generation for demonstration
    this.startMockDataGeneration();

    console.log("[IntelligenceWS] WebSocket server initialized");
  }

  /**
   * Broadcast intelligence alert to all connected clients
   */
  broadcastIntelligenceAlert(alert: IntelligenceAlert): void {
    if (!this.io) {
      console.warn("[IntelligenceWS] Cannot broadcast - server not initialized");
      return;
    }

    this.io.to("intelligence-feed").emit("intelligence_alert", alert);
    console.log(`[IntelligenceWS] Broadcasted alert: ${alert.title}`);
  }

  /**
   * Broadcast agent activity update
   */
  broadcastAgentActivity(activity: AgentActivity): void {
    if (!this.io) {
      console.warn("[IntelligenceWS] Cannot broadcast - server not initialized");
      return;
    }

    this.io.to("agent-activity").emit("agent_activity", activity);
    console.log(`[IntelligenceWS] Broadcasted activity: ${activity.agentName} - ${activity.status}`);
  }

  /**
   * Get number of connected clients
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Start generating mock data for demonstration
   * In production, this would be replaced with real data sources
   */
  private startMockDataGeneration(): void {
    // Generate mock intelligence alerts every 15-30 seconds
    setInterval(() => {
      if (this.connectedClients.size === 0) return;

      const mockAlerts: Omit<IntelligenceAlert, "id" | "timestamp">[] = [
        {
          type: "legal_update",
          title: "New Privacy Regulation Proposed",
          description: "Federal agency proposes new data privacy requirements for legal tech platforms",
          source: "Federal Register",
          severity: "high",
          url: "https://example.com/regulation",
          tags: ["privacy", "compliance", "regulation"],
        },
        {
          type: "court_decision",
          title: "Supreme Court Rules on AI Evidence Admissibility",
          description: "Landmark decision establishes standards for AI-generated evidence in legal proceedings",
          source: "Supreme Court",
          severity: "critical",
          tags: ["AI", "evidence", "precedent"],
        },
        {
          type: "case_alert",
          title: "Class Action Filed Against Tech Giant",
          description: "Major class action lawsuit filed alleging antitrust violations",
          source: "District Court",
          severity: "medium",
          tags: ["antitrust", "class-action", "tech"],
        },
        {
          type: "regulatory_change",
          title: "Updated Cybersecurity Disclosure Requirements",
          description: "SEC announces new cybersecurity incident disclosure timeline",
          source: "SEC",
          severity: "high",
          url: "https://example.com/sec-update",
          tags: ["cybersecurity", "SEC", "disclosure"],
        },
      ];

      const randomAlert = mockAlerts[Math.floor(Math.random() * mockAlerts.length)];
      const alert: IntelligenceAlert = {
        ...randomAlert,
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
      };

      this.broadcastIntelligenceAlert(alert);
    }, 20000); // Every 20 seconds

    // Generate mock agent activity every 10-20 seconds
    setInterval(() => {
      if (this.connectedClients.size === 0) return;

      const agents = ["Agent Zero", "Document Analyzer", "Case Research", "Contract Review"];
      const tasks = [
        "Analyzing legal precedents",
        "Reviewing contract clauses",
        "Researching case law",
        "Generating legal brief",
        "Extracting key terms",
        "Comparing jurisdictions",
      ];
      const statuses: AgentActivity["status"][] = ["starting", "running", "completed"];

      const activity: AgentActivity = {
        id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        agentName: agents[Math.floor(Math.random() * agents.length)],
        taskDescription: tasks[Math.floor(Math.random() * tasks.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        progress: Math.floor(Math.random() * 100),
        startTime: new Date(Date.now() - Math.random() * 300000), // Started within last 5 minutes
      };

      if (activity.status === "completed") {
        activity.endTime = new Date();
        activity.progress = 100;
        activity.result = "Task completed successfully";
      }

      this.broadcastAgentActivity(activity);
    }, 15000); // Every 15 seconds
  }
}

// Singleton instance
export const intelligenceWebSocket = new IntelligenceWebSocketService();
