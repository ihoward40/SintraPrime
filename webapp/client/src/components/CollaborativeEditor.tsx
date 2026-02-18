import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Users } from 'lucide-react';

interface User {
  id: string;
  name: string;
  color: string;
}

interface Cursor {
  userId: string;
  x: number;
  y: number;
  selection?: { start: number; end: number };
}

interface CollaborativeEditorProps {
  workspaceId: string;
  documentId: string;
  currentUser: User;
  children: React.ReactNode;
}

export function CollaborativeEditor({
  workspaceId,
  documentId,
  currentUser,
  children,
}: CollaborativeEditorProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [cursors, setCursors] = useState<Map<string, Cursor>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to Socket.IO server
    const newSocket = io(window.location.origin, {
      path: '/socket.io',
    });

    newSocket.on('connect', () => {
      // Join workspace
      newSocket.emit('workspace:join', {
        workspaceId,
        documentId,
        user: currentUser,
      });
    });

    // Listen for user presence updates
    newSocket.on('workspace:users', (users: User[]) => {
      setActiveUsers(users.filter((u) => u.id !== currentUser.id));
    });

    // Listen for cursor updates
    newSocket.on('workspace:cursor', (cursor: Cursor) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.set(cursor.userId, cursor);
        return next;
      });
    });

    // Listen for user left
    newSocket.on('workspace:user-left', (userId: string) => {
      setActiveUsers((prev) => prev.filter((u) => u.id !== userId));
      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('workspace:leave', { workspaceId, documentId });
      newSocket.disconnect();
    };
  }, [workspaceId, documentId, currentUser]);

  useEffect(() => {
    if (!socket || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      socket.emit('workspace:cursor', {
        workspaceId,
        documentId,
        cursor: {
          userId: currentUser.id,
          x,
          y,
        },
      });
    };

    const container = containerRef.current;
    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [socket, workspaceId, documentId, currentUser.id]);

  return (
    <div ref={containerRef} className="relative">
      {/* Active Users Indicator */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <Badge variant="secondary" className="flex items-center gap-2">
          <Users className="h-3 w-3" />
          {activeUsers.length + 1} active
        </Badge>

        <div className="flex -space-x-2">
          {/* Current User */}
          <Tooltip>
            <TooltipTrigger>
              <Avatar className="h-8 w-8 border-2" style={{ borderColor: currentUser.color }}>
                <AvatarFallback style={{ backgroundColor: currentUser.color }}>
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p>{currentUser.name} (You)</p>
            </TooltipContent>
          </Tooltip>

          {/* Other Users */}
          {activeUsers.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger>
                <Avatar className="h-8 w-8 border-2" style={{ borderColor: user.color }}>
                  <AvatarFallback style={{ backgroundColor: user.color }}>
                    {user.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Live Cursors */}
      {Array.from(cursors.entries()).map(([userId, cursor]) => {
        const user = activeUsers.find((u) => u.id === userId);
        if (!user) return null;

        return (
          <div
            key={userId}
            className="absolute pointer-events-none z-40 transition-all duration-100"
            style={{
              left: `${cursor.x}%`,
              top: `${cursor.y}%`,
            }}
          >
            {/* Cursor */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.65376 12.3673L5.46026 12.4196L5.65376 12.3673L19.2914 7.92728C19.5796 7.83092 19.8833 7.99567 19.9796 8.28389C20.0759 8.57211 19.9112 8.87582 19.623 8.97218L9.00001 12.5L6.50001 21L5.65376 12.3673Z"
                fill={user.color}
                stroke={user.color}
                strokeWidth="1.5"
              />
            </svg>

            {/* User Label */}
            <div
              className="ml-4 -mt-2 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        );
      })}

      {/* Content */}
      {children}
    </div>
  );
}
