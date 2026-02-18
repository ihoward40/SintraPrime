import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function AlertHistoryWidget() {
  const { data: alerts, isLoading } = trpc.governance.listAlertHistory.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Alerts
          </CardTitle>
          <CardDescription>Loading alert history...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const unresolvedAlerts = alerts?.filter((a: any) => !a.alert_history.resolvedAt) || [];
  const mostRecentUnresolved = unresolvedAlerts[0];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Recent Alerts
        </CardTitle>
        <CardDescription>
          {unresolvedAlerts.length} unresolved alert{unresolvedAlerts.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unresolvedAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
            <p className="text-sm text-muted-foreground">
              No unresolved alerts
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mostRecentUnresolved && (
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge className={getSeverityColor(mostRecentUnresolved.alert_history.severity)}>
                    {mostRecentUnresolved.alert_history.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(mostRecentUnresolved.alert_history.triggeredAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm font-medium mb-1">
                  {mostRecentUnresolved.alert_history.alertType}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {mostRecentUnresolved.alert_history.message}
                </p>
              </div>
            )}
            
            <Link href="/governance/alert-history">
              <Button variant="outline" className="w-full">
                View All Alerts
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
