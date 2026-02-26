import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { CollaborativeWorkspaceManager } from "../lib/collaborative-workspace";

let socketIOInstance: SocketIOServer | null = null;

export function getSocketIO(): SocketIOServer | null {
  return socketIOInstance;
}

export function setupWebSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "production"
        ? (process.env.ALLOWED_ORIGINS || "https://sintraprime.manus.space").split(",")
        : "*",
      methods: ["GET", "POST"],
    },
  });

  // Store connected users
  const connectedUsers = new Map<string, { socketId: string; userId: number; name: string; activity: string }>();

  io.on("connection", (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Handle user join
    socket.on("user:join", (data: { userId: number; name: string }) => {
      connectedUsers.set(socket.id, {
        socketId: socket.id,
        userId: data.userId,
        name: data.name,
        activity: "Active in Command Center",
      });

      // Broadcast updated presence to all clients
      io.emit("presence:update", Array.from(connectedUsers.values()));
      
      console.log(`[WebSocket] User joined: ${data.name} (${socket.id})`);
    });

    // Handle activity updates
    socket.on("user:activity", (activity: string) => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        user.activity = activity;
        io.emit("presence:update", Array.from(connectedUsers.values()));
      }
    });

    // Handle terminal commands (shared sessions)
    socket.on("terminal:command", (data: { command: string; sessionId: string }) => {
      // Broadcast to all users in the same session
      socket.to(data.sessionId).emit("terminal:command", {
        command: data.command,
        userId: connectedUsers.get(socket.id)?.userId,
        userName: connectedUsers.get(socket.id)?.name,
      });
    });

    // Handle terminal output
    socket.on("terminal:output", (data: { output: string; sessionId: string }) => {
      socket.to(data.sessionId).emit("terminal:output", data);
    });

    // Handle chat messages
    socket.on("chat:message", (data: { message: string; caseId?: number }) => {
      io.emit("chat:message", {
        message: data.message,
        userId: connectedUsers.get(socket.id)?.userId,
        userName: connectedUsers.get(socket.id)?.name,
        caseId: data.caseId,
        timestamp: new Date(),
      });
    });

    // Handle typing indicators
    socket.on("chat:typing", (data: { isTyping: boolean }) => {
      socket.broadcast.emit("chat:typing", {
        userId: connectedUsers.get(socket.id)?.userId,
        userName: connectedUsers.get(socket.id)?.name,
        isTyping: data.isTyping,
      });
    });

    // Handle joining terminal sessions
    socket.on("terminal:join", (sessionId: string) => {
      socket.join(sessionId);
      console.log(`[WebSocket] User ${socket.id} joined terminal session: ${sessionId}`);
    });

    // Handle leaving terminal sessions
    socket.on("terminal:leave", (sessionId: string) => {
      socket.leave(sessionId);
      console.log(`[WebSocket] User ${socket.id} left terminal session: ${sessionId}`);
    });

    // Handle agent task rooms
    socket.on("agent:join_task", (taskId: string) => {
      socket.join(`task_${taskId}`);
      console.log(`[WebSocket] Client ${socket.id} joined agent task ${taskId}`);
    });

    socket.on("agent:leave_task", (taskId: string) => {
      socket.leave(`task_${taskId}`);
      console.log(`[WebSocket] Client ${socket.id} left agent task ${taskId}`);
    });

    // Handle Agent Zero session rooms
    socket.on("join-agent-session", (sessionId: string) => {
      socket.join(sessionId);
      console.log(`[AgentZero] Client ${socket.id} joined session ${sessionId}`);
    });

    socket.on("leave-agent-session", (sessionId: string) => {
      socket.leave(sessionId);
      console.log(`[AgentZero] Client ${socket.id} left session ${sessionId}`);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const user = connectedUsers.get(socket.id);
      if (user) {
        console.log(`[WebSocket] User disconnected: ${user.name} (${socket.id})`);
        connectedUsers.delete(socket.id);
        io.emit("presence:update", Array.from(connectedUsers.values()));
      }
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`[WebSocket] Socket error for ${socket.id}:`, error);
    });
  });

  console.log("[WebSocket] Socket.io server initialized");
  
  // Store instance for access from other modules
  socketIOInstance = io;
  
  // Initialize collaborative workspace manager
  const workspaceManager = new CollaborativeWorkspaceManager(io);
  console.log('[WebSocket] Collaborative workspace manager initialized');
  
  // Register with agent progress emitter (dynamic import to avoid circular dependency)
  import("../agent/services/agentProgressEmitter").then(({ setSocketIOInstance }) => {
    setSocketIOInstance(io);
  }).catch((err) => {
    console.log("[WebSocket] agentProgressEmitter not found, skipping registration");
  });
  
  return io;
}
