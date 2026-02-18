import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Bell, CheckCircle, ExternalLink, AlertTriangle } from "lucide-react";

export default function LegalAlerts() {
  const { data: alerts, isLoading, refetch } = trpc.legalAlerts.list.useQuery({});
  const markAsRead = trpc.legalAlerts.markAsRead.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Legal Alerts</h1>
            <p className="text-muted-foreground">
              Living Law Engine — Real-time legal updates and regulatory changes
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
          <CardContent className="py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              Legal alerts are for informational purposes only and do not constitute legal advice. 
              Always verify information with official sources and consult a licensed attorney.
            </p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : alerts && alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Card key={alert.id} className={alert.isRead ? "opacity-70" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{alert.alertType}</Badge>
                        {alert.jurisdiction && (
                          <Badge variant="outline">{alert.jurisdiction}</Badge>
                        )}
                        {alert.relevanceScore && alert.relevanceScore > 70 && (
                          <Badge className="bg-green-500">High Relevance</Badge>
                        )}
                        {!alert.isRead && (
                          <Badge className="bg-blue-500">New</Badge>
                        )}
                      </div>
                      <CardTitle className="text-base">{alert.title}</CardTitle>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!alert.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead.mutate({ id: alert.id })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Read
                        </Button>
                      )}
                      {alert.sourceUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {alert.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    {alert.publishedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Published: {new Date(alert.publishedAt).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
              <Bell className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">No legal alerts yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  The Living Law Engine monitors federal and state legal changes. 
                  Alerts will appear here when relevant updates are detected for your cases.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
