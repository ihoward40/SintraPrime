import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

type PresenceUser = {
  socketId: string;
  userId: number;
  name: string;
  activity: string;
};

type ChatMessage = {
  message: string;
  userId: number;
  userName: string;
  caseId?: number;
  timestamp: Date;
};

type TypingIndicator = {
  userId: number;
  userName: string;
  isTyping: boolean;
};

export function useWebSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);

  useEffect(() => {
    if (!user) return;

    // Connect to WebSocket server
    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[WebSocket] Connected");
      setIsConnected(true);
      
      // Join with user info
      socket.emit("user:join", {
        userId: user.id,
        name: user.name || "Unknown",
      });
    });

    socket.on("disconnect", () => {
      console.log("[WebSocket] Disconnected");
      setIsConnected(false);
    });

    // Handle presence updates
    socket.on("presence:update", (users: PresenceUser[]) => {
      setPresenceUsers(users);
    });

    // Handle chat messages
    socket.on("chat:message", (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    // Handle typing indicators
    socket.on("chat:typing", (indicator: TypingIndicator) => {
      setTypingUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== indicator.userId);
        if (indicator.isTyping) {
          return [...filtered, indicator];
        }
        return filtered;
      });

      // Clear typing indicator after 3 seconds
      if (indicator.isTyping) {
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== indicator.userId));
        }, 3000);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const updateActivity = (activity: string) => {
    if (socketRef.current) {
      socketRef.current.emit("user:activity", activity);
    }
  };

  const sendChatMessage = (message: string, caseId?: number) => {
    if (socketRef.current) {
      socketRef.current.emit("chat:message", { message, caseId });
    }
  };

  const sendTypingIndicator = (isTyping: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit("chat:typing", { isTyping });
    }
  };

  const joinTerminalSession = (sessionId: string) => {
    if (socketRef.current) {
      socketRef.current.emit("terminal:join", sessionId);
    }
  };

  const leaveTerminalSession = (sessionId: string) => {
    if (socketRef.current) {
      socketRef.current.emit("terminal:leave", sessionId);
    }
  };

  const sendTerminalCommand = (command: string, sessionId: string) => {
    if (socketRef.current) {
      socketRef.current.emit("terminal:command", { command, sessionId });
    }
  };

  const onTerminalCommand = (callback: (data: { command: string; userId: number; userName: string }) => void) => {
    if (socketRef.current) {
      socketRef.current.on("terminal:command", callback);
    }
  };

  const onTerminalOutput = (callback: (data: { output: string; sessionId: string }) => void) => {
    if (socketRef.current) {
      socketRef.current.on("terminal:output", callback);
    }
  };

  return {
    isConnected,
    presenceUsers,
    chatMessages,
    typingUsers,
    updateActivity,
    sendChatMessage,
    sendTypingIndicator,
    joinTerminalSession,
    leaveTerminalSession,
    sendTerminalCommand,
    onTerminalCommand,
    onTerminalOutput,
  };
}
