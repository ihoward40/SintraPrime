import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Activity, CheckCircle, XCircle, AlertTriangle, Wrench, 
  Brain, Clock, Zap 
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: "health_check" | "error_detected" | "diagnosis" | "repair" | "approval_required";
  title: string;
  description: string;
  timestamp: Date;
  status: "success" | "failed" | "pending" | "info";
  metadata?: Record<string, any>;
}

export function NanobotActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  
  const { data: healthChecks } = trpc.nanobot.getHealthChecks.useQuery({ limit: 5 });
  const { data: errors } = trpc.nanobot.getUnresolvedErrors.useQuery({ limit: 5 });
  const { data: repairs } = trpc.nanobot.getRepairHistory.useQuery({ limit: 5 });
  const { data: pendingApprovals } = trpc.nanobot.getPendingApprovals.useQuery();

  useEffect(() => {
    const newActivities: ActivityItem[] = [];

    // Add health checks
    if (healthChecks) {
      healthChecks.forEach((check: any) => {
        newActivities.push({
          id: `health-${check.id}`,
          type: "health_check",
          title: "Health Check",
          description: `${check.checkType} - ${check.status}`,
          timestamp: new Date(check.createdAt),
          status: check.status === "healthy" ? "success" : check.status === "degraded" ? "pending" : "failed",
          metadata: check,
        });
      });
    }

    // Add errors
    if (errors) {
      errors.forEach((error: any) => {
        newActivities.push({
          id: `error-${error.id}`,
          type: "error_detected",
          title: "Error Detected",
          description: error.errorMessage,
          timestamp: new Date(error.createdAt),
          status: "failed",
          metadata: error,
        });
      });
    }

    // Add repairs
    if (repairs) {
      repairs.forEach((repair: any) => {
        newActivities.push({
          id: `repair-${repair.id}`,
          type: "repair",
          title: repair.success ? "Repair Successful" : "Repair Failed",
          description: repair.repairDescription,
          timestamp: new Date(repair.createdAt),
          status: repair.success ? "success" : "failed",
          metadata: repair,
        });
      });
    }

    // Add pending approvals
    if (pendingApprovals) {
      pendingApprovals.forEach((approval: any) => {
        newActivities.push({
          id: `approval-${approval.id}`,
          type: "approval_required",
          title: "Approval Required",
          description: approval.repairDescription,
          timestamp: new Date(approval.metadata?.requestedAt || approval.createdAt),
          status: "pending",
          metadata: approval,
        });
      });
    }

    // Sort by timestamp (newest first)
    newActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setActivities(newActivities.slice(0, 20)); // Keep only 20 most recent
  }, [healthChecks, errors, repairs, pendingApprovals]);

  const getActivityIcon = (type: ActivityItem["type"], status: ActivityItem["status"]) => {
    if (type === "health_check") {
      return status === "success" ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : status === "pending" ? (
        <AlertTriangle className="h-5 w-5 text-yellow-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      );
    }
    if (type === "error_detected") {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
    if (type === "diagnosis") {
      return <Brain className="h-5 w-5 text-purple-500" />;
    }
    if (type === "repair") {
      return status === "success" ? (
        <Wrench className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      );
    }
    if (type === "approval_required") {
      return <Clock className="h-5 w-5 text-orange-500" />;
    }
    return <Activity className="h-5 w-5 text-gray-500" />;
  };

  const getStatusBadge = (status: ActivityItem["status"]) => {
    switch (status) {
      case "success":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Success</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "info":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Info</Badge>;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Activity Feed
            </CardTitle>
            <CardDescription>
              Real-time nanobot system activity
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No recent activity
                </p>
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-0.5">
                    {getActivityIcon(activity.type, activity.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{activity.title}</h4>
                      {getStatusBadge(activity.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
