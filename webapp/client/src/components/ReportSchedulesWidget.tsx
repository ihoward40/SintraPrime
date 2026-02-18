import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { Clock, ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'wouter';

export default function ReportSchedulesWidget() {
  const { data: schedules, isLoading } = trpc.governance.listReportSchedules.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Report Schedules
          </CardTitle>
          <CardDescription>Loading schedules...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const activeSchedules = schedules?.filter((s: any) => s.enabled) || [];
  const nextSchedule = activeSchedules
    .sort((a: any, b: any) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime())[0];

  const getFrequencyBadge = (frequency: string) => {
    const colors: Record<string, string> = {
      daily: 'bg-blue-500',
      weekly: 'bg-green-500',
      monthly: 'bg-purple-500',
    };
    return colors[frequency] || 'bg-gray-500';
  };

  const formatNextRun = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      return 'soon';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Report Schedules
        </CardTitle>
        <CardDescription>
          {activeSchedules.length} active schedule{activeSchedules.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeSchedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No active report schedules
            </p>
            <Link href="/governance/report-schedules">
              <Button variant="outline" size="sm">
                Create Schedule
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {nextSchedule && (
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge className={getFrequencyBadge(nextSchedule.frequency)}>
                    {nextSchedule.frequency}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatNextRun(nextSchedule.nextRunAt)}
                  </span>
                </div>
                <p className="text-sm font-medium mb-1">
                  {nextSchedule.reportType} Report
                </p>
                <p className="text-sm text-muted-foreground">
                  Next run: {new Date(nextSchedule.nextRunAt).toLocaleString()}
                </p>
              </div>
            )}
            
            <Link href="/governance/report-schedules">
              <Button variant="outline" className="w-full">
                Manage Schedules
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
