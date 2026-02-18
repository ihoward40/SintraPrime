import type { Server as SocketIOServer, Socket } from 'socket.io';

export interface WorkspaceUser {
  userId: number;
  userName: string;
  userEmail: string;
  socketId: string;
  cursor?: {
    x: number;
    y: number;
  };
  selection?: {
    start: number;
    end: number;
  };
  color: string;
}

export interface WorkspaceRoom {
  roomId: string;
  resourceType: 'document' | 'agent-zero' | 'case';
  resourceId: string;
  users: Map<number, WorkspaceUser>;
  createdAt: Date;
  lastActivity: Date;
}

export class CollaborativeWorkspaceManager {
  private rooms: Map<string, WorkspaceRoom> = new Map();
  private userColors: string[] = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];

  constructor(private io: SocketIOServer) {
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log('[Collaborative] Client connected:', socket.id);

      // Join workspace room
      socket.on('workspace:join', (data: {
        roomId: string;
        resourceType: 'document' | 'agent-zero' | 'case';
        resourceId: string;
        user: {
          userId: number;
          userName: string;
          userEmail: string;
        };
      }) => {
        this.handleJoinWorkspace(socket, data);
      });

      // Leave workspace room
      socket.on('workspace:leave', (data: { roomId: string }) => {
        this.handleLeaveWorkspace(socket, data.roomId);
      });

      // Update cursor position
      socket.on('workspace:cursor', (data: {
        roomId: string;
        cursor: { x: number; y: number };
      }) => {
        this.handleCursorUpdate(socket, data);
      });

      // Update selection
      socket.on('workspace:selection', (data: {
        roomId: string;
        selection: { start: number; end: number };
      }) => {
        this.handleSelectionUpdate(socket, data);
      });

      // Broadcast edit operation
      socket.on('workspace:edit', (data: {
        roomId: string;
        operation: {
          type: 'insert' | 'delete' | 'replace';
          position: number;
          content?: string;
          length?: number;
        };
      }) => {
        this.handleEditOperation(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private handleJoinWorkspace(
    socket: Socket,
    data: {
      roomId: string;
      resourceType: 'document' | 'agent-zero' | 'case';
      resourceId: string;
      user: {
        userId: number;
        userName: string;
        userEmail: string;
      };
    }
  ) {
    const { roomId, resourceType, resourceId, user } = data;

    // Get or create room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        resourceType,
        resourceId,
        users: new Map(),
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      this.rooms.set(roomId, room);
    }

    // Assign color to user
    const colorIndex = room.users.size % this.userColors.length;
    const userColor = this.userColors[colorIndex];

    // Add user to room
    const workspaceUser: WorkspaceUser = {
      userId: user.userId,
      userName: user.userName,
      userEmail: user.userEmail,
      socketId: socket.id,
      color: userColor,
    };
    room.users.set(user.userId, workspaceUser);

    // Join Socket.IO room
    socket.join(roomId);

    // Notify others in the room
    socket.to(roomId).emit('workspace:user-joined', {
      user: workspaceUser,
    });

    // Send current room state to the joining user
    socket.emit('workspace:joined', {
      roomId,
      users: Array.from(room.users.values()),
    });

    console.log(`[Collaborative] User ${user.userName} joined room ${roomId}`);
  }

  private handleLeaveWorkspace(socket: Socket, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Find and remove user
    let removedUser: WorkspaceUser | undefined;
    for (const [userId, user] of Array.from(room.users.entries())) {
      if (user.socketId === socket.id) {
        removedUser = user;
        room.users.delete(userId);
        break;
      }
    }

    if (removedUser) {
      // Leave Socket.IO room
      socket.leave(roomId);

      // Notify others
      socket.to(roomId).emit('workspace:user-left', {
        userId: removedUser.userId,
      });

      console.log(`[Collaborative] User ${removedUser.userName} left room ${roomId}`);

      // Clean up empty rooms
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
        console.log(`[Collaborative] Room ${roomId} deleted (empty)`);
      }
    }
  }

  private handleCursorUpdate(
    socket: Socket,
    data: {
      roomId: string;
      cursor: { x: number; y: number };
    }
  ) {
    const room = this.rooms.get(data.roomId);
    if (!room) return;

    // Update user's cursor position
    for (const user of Array.from(room.users.values())) {
      if (user.socketId === socket.id) {
        user.cursor = data.cursor;
        room.lastActivity = new Date();

        // Broadcast to others
        socket.to(data.roomId).emit('workspace:cursor-update', {
          userId: user.userId,
          cursor: data.cursor,
        });
        break;
      }
    }
  }

  private handleSelectionUpdate(
    socket: Socket,
    data: {
      roomId: string;
      selection: { start: number; end: number };
    }
  ) {
    const room = this.rooms.get(data.roomId);
    if (!room) return;

    // Update user's selection
    for (const user of Array.from(room.users.values())) {
      if (user.socketId === socket.id) {
        user.selection = data.selection;
        room.lastActivity = new Date();

        // Broadcast to others
        socket.to(data.roomId).emit('workspace:selection-update', {
          userId: user.userId,
          selection: data.selection,
        });
        break;
      }
    }
  }

  private handleEditOperation(
    socket: Socket,
    data: {
      roomId: string;
      operation: {
        type: 'insert' | 'delete' | 'replace';
        position: number;
        content?: string;
        length?: number;
      };
    }
  ) {
    const room = this.rooms.get(data.roomId);
    if (!room) return;

    // Find user
    let userId: number | undefined;
    for (const user of Array.from(room.users.values())) {
      if (user.socketId === socket.id) {
        userId = user.userId;
        break;
      }
    }

    if (userId) {
      room.lastActivity = new Date();

      // Broadcast edit to others
      socket.to(data.roomId).emit('workspace:edit', {
        userId,
        operation: data.operation,
      });
    }
  }

  private handleDisconnect(socket: Socket) {
    console.log('[Collaborative] Client disconnected:', socket.id);

    // Remove user from all rooms
    for (const [roomId, room] of Array.from(this.rooms.entries())) {
      for (const [userId, user] of Array.from(room.users.entries())) {
        if (user.socketId === socket.id) {
          room.users.delete(userId);

          // Notify others
          this.io.to(roomId).emit('workspace:user-left', {
            userId,
          });

          console.log(`[Collaborative] User ${user.userName} disconnected from room ${roomId}`);

          // Clean up empty rooms
          if (room.users.size === 0) {
            this.rooms.delete(roomId);
            console.log(`[Collaborative] Room ${roomId} deleted (empty)`);
          }
          break;
        }
      }
    }
  }

  // Public methods for external use
  public getRoomUsers(roomId: string): WorkspaceUser[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.values()) : [];
  }

  public getRoomCount(): number {
    return this.rooms.size;
  }

  public getTotalUsers(): number {
    let total = 0;
    for (const room of Array.from(this.rooms.values())) {
      total += room.users.size;
    }
    return total;
  }
}
