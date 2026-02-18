import { useState, useEffect } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Circle } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PresenceUser = {
  id: number;
  name: string;
  email: string;
  activity: string;
  lastSeen: Date;
};

export default function PresenceIndicator() {
  const { user } = useAuth();
  const { presenceUsers, isConnected } = useWebSocket();

  // Convert WebSocket presence users to local format
  const onlineUsers: PresenceUser[] = presenceUsers.map((u) => ({
    id: u.userId,
    name: u.name,
    email: "", // Not transmitted over WebSocket for privacy
    activity: u.activity,
    lastSeen: new Date(), // Always current since they're connected
  }));

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getActivityColor = (activity: string) => {
    if (activity.includes("Terminal")) return "text-green-500";
    if (activity.includes("Chat")) return "text-blue-500";
    if (activity.includes("Editor")) return "text-yellow-500";
    if (activity.includes("Browser")) return "text-purple-500";
    return "text-zinc-500";
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <Badge variant="secondary" className="text-xs">
          {onlineUsers.length} online
        </Badge>
        {isConnected && (
          <Tooltip>
            <TooltipTrigger>
              <Circle className="h-2 w-2 fill-green-500 text-green-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Connected to server</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        <div className="flex -space-x-2">
          {onlineUsers.slice(0, 5).map((onlineUser) => (
            <Tooltip key={onlineUser.id}>
              <TooltipTrigger>
                <div className="relative">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {getInitials(onlineUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <Circle
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 fill-green-500 text-green-500"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-semibold">{onlineUser.name}</p>
                  <p className={`text-[10px] ${getActivityColor(onlineUser.activity)}`}>
                    {onlineUser.activity}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Last seen: {onlineUser.lastSeen.toLocaleTimeString()}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {onlineUsers.length > 5 && (
          <Badge variant="outline" className="text-xs">
            +{onlineUsers.length - 5}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}
