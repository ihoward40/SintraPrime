import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FileText,
  Image,
  StickyNote,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  UserPlus,
  Crosshair,
} from "lucide-react";

interface CaseActivityFeedProps {
  caseId: number;
  limit?: number;
}

const activityIcons: Record<string, React.ReactNode> = {
  case_created: <CheckCircle className="h-4 w-4 text-green-500" />,
  case_updated: <AlertCircle className="h-4 w-4 text-blue-500" />,
  status_changed: <Clock className="h-4 w-4 text-amber-500" />,
  document_added: <FileText className="h-4 w-4 text-purple-500" />,
  document_updated: <FileText className="h-4 w-4 text-purple-400" />,
  evidence_added: <Image className="h-4 w-4 text-emerald-500" />,
  note_added: <StickyNote className="h-4 w-4 text-yellow-500" />,
  party_added: <Users className="h-4 w-4 text-indigo-500" />,
  strategy_added: <Crosshair className="h-4 w-4 text-red-500" />,
  member_joined: <UserPlus className="h-4 w-4 text-teal-500" />,
  deadline_added: <Clock className="h-4 w-4 text-orange-500" />,
};

export function CaseActivityFeed({ caseId, limit = 20 }: CaseActivityFeedProps) {
  const { data: activities, isLoading } = trpc.caseActivity.list.useQuery({ caseId, limit });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>Loading activity...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>No activity yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Case activity will appear here as you work on the case.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Feed</CardTitle>
        <CardDescription>{activities.length} recent activities</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3 items-start">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {activityIcons[activity.activityType] || <AlertCircle className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                  {activity.metadata ? (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-1">
                      <pre className="whitespace-pre-wrap">{JSON.stringify(activity.metadata, null, 2)}</pre>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
