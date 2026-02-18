import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Filter,
  AlertCircle,
  FileText,
  Folder,
  Users,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type NotificationFilter = "all" | "unread" | "case_update" | "deadline_alert" | "mention" | "document_shared" | "evidence_added";

export default function NotificationCenter() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const utils = trpc.useUtils();

  // Fetch notifications
  const { data: notifications = [], isLoading } = trpc.notifications.list.useQuery();

  // Mark as read mutation
  const markAsRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  // Mark all as read mutation
  const markAllAsRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  // Delete notification mutation
  const deleteNotification = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "case_update":
        return <Folder className="h-4 w-4" />;
      case "deadline_alert":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "mention":
        return <Users className="h-4 w-4 text-blue-500" />;
      case "document_shared":
      case "evidence_added":
        return <FileText className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "deadline_alert":
        return "bg-red-500/10 border-red-500/20";
      case "mention":
        return "bg-blue-500/10 border-blue-500/20";
      case "document_shared":
      case "evidence_added":
        return "bg-green-500/10 border-green-500/20";
      default:
        return "bg-muted border-border";
    }
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="font-semibold">Notifications</h2>
          {notifications.filter((n: any) => !n.isRead).length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {notifications.filter((n: any) => !n.isRead).length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as NotificationFilter)}>
            <SelectTrigger className="w-[140px] h-9">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="case_update">Case Updates</SelectItem>
              <SelectItem value="deadline_alert">Deadlines</SelectItem>
              <SelectItem value="mention">Mentions</SelectItem>
              <SelectItem value="document_shared">Documents</SelectItem>
              <SelectItem value="evidence_added">Evidence</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={notifications.filter((n: any) => !n.isRead).length === 0}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <BellOff className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {notifications.map((notification: any) => (
              <div
                key={notification.id}
                className={cn(
                  "p-4 rounded-lg border transition-colors",
                  notification.isRead ? "bg-background" : getNotificationColor(notification.type)
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => markAsRead.mutate({ notificationId: notification.id })}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => deleteNotification.mutate({ notificationId: notification.id })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {notification.actionUrl && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 mt-2"
                        onClick={() => {
                          window.location.href = notification.actionUrl;
                          if (!notification.isRead) {
                            markAsRead.mutate({ notificationId: notification.id });
                          }
                        }}
                      >
                        View Details →
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
