import { Server as SocketIOServer } from "socket.io";
import { BrowserSessionManager } from "./service";

export function setupBrowserAutomationSocket(io: SocketIOServer, sessionManager: BrowserSessionManager) {
  io.on("connection", (socket) => {
    // Handle browser session join
    socket.on("browser:join-session", (sessionId: string) => {
      socket.join(sessionId);
      console.log(`[BrowserAutomation] Client ${socket.id} joined browser session ${sessionId}`);

      const session = sessionManager.getSession(sessionId);
      if (session) {
        // Forward all browser events to this socket
        session.on('screenshot', (data) => {
          io.to(sessionId).emit('browser:screenshot', data);
        });

        session.on('action', (data) => {
          io.to(sessionId).emit('browser:action', data);
        });

        session.on('action-complete', (data) => {
          io.to(sessionId).emit('browser:action-complete', data);
        });

        session.on('recording-started', (data) => {
          io.to(sessionId).emit('browser:recording-started', data);
        });

        session.on('recording-stopped', (data) => {
          io.to(sessionId).emit('browser:recording-stopped', data);
        });

        session.on('initialized', (data) => {
          io.to(sessionId).emit('browser:initialized', data);
        });

        session.on('cleanup', (data) => {
          io.to(sessionId).emit('browser:cleanup', data);
        });
      }
    });

    // Handle browser session leave
    socket.on("browser:leave-session", (sessionId: string) => {
      socket.leave(sessionId);
      console.log(`[BrowserAutomation] Client ${socket.id} left browser session ${sessionId}`);
    });
  });

  console.log("[BrowserAutomation] Socket.IO integration initialized");
}
