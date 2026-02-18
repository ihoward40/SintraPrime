import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink, Play, Pause, RefreshCw, Webhook, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function MakeIntegration() {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Mock data - in production, this would come from tRPC
  const webhooks = [
    {
      id: 1,
      name: 'Email Ingest Webhook',
      url: `${window.location.origin}/api/email/ingest`,
      description: 'Receives emails from Make.com and creates cases automatically',
      status: 'active',
      lastActivity: new Date(Date.now() - 3600000),
      totalCalls: 142,
    },
    {
      id: 2,
      name: 'Audio Ingest Webhook',
      url: `${window.location.origin}/api/audio/ingest`,
      description: 'Receives audio files, transcribes with Whisper API, and links to cases',
      status: 'active',
      lastActivity: new Date(Date.now() - 7200000),
      totalCalls: 67,
    },
    {
      id: 3,
      name: 'Web Monitoring Webhook',
      url: `${window.location.origin}/api/web-monitoring/webhook`,
      description: 'Receives website change notifications from Make.com monitoring scenarios',
      status: 'active',
      lastActivity: new Date(Date.now() - 1800000),
      totalCalls: 89,
    },
  ];

  const scenarios = [
    {
      id: 1,
      name: 'Gmail → SintraPrime Email Ingest',
      status: 'active',
      description: 'Monitors Gmail for new emails with legal keywords and sends to SintraPrime',
      lastRun: new Date(Date.now() - 1800000),
      lastStatus: 'success',
      runsToday: 12,
      webhook: 'Email Ingest Webhook',
    },
    {
      id: 2,
      name: 'Google Drive → Audio Transcription',
      status: 'active',
      description: 'Watches Google Drive folder for new audio files and sends to SintraPrime',
      lastRun: new Date(Date.now() - 3600000),
      lastStatus: 'success',
      runsToday: 5,
      webhook: 'Audio Ingest Webhook',
    },
    {
      id: 3,
      name: 'Court Website Monitor',
      status: 'active',
      description: 'Checks court websites for policy changes every 6 hours',
      lastRun: new Date(Date.now() - 7200000),
      lastStatus: 'success',
      runsToday: 4,
      webhook: 'Web Monitoring Webhook',
    },
    {
      id: 4,
      name: 'PACER Docket Monitor',
      status: 'paused',
      description: 'Monitors PACER for new docket entries',
      lastRun: new Date(Date.now() - 86400000),
      lastStatus: 'warning',
      runsToday: 0,
      webhook: 'Web Monitoring Webhook',
    },
  ];

  const executionLogs = [
    {
      id: 1,
      scenarioName: 'Gmail → SintraPrime Email Ingest',
      timestamp: new Date(Date.now() - 1800000),
      status: 'success',
      duration: 2.3,
      operations: 3,
      dataProcessed: '1 email, 2 attachments',
    },
    {
      id: 2,
      scenarioName: 'Google Drive → Audio Transcription',
      timestamp: new Date(Date.now() - 3600000),
      status: 'success',
      duration: 45.7,
      operations: 5,
      dataProcessed: '1 audio file (12.3 MB)',
    },
    {
      id: 3,
      scenarioName: 'Court Website Monitor',
      timestamp: new Date(Date.now() - 7200000),
      status: 'success',
      duration: 8.1,
      operations: 4,
      dataProcessed: '3 websites checked',
    },
    {
      id: 4,
      scenarioName: 'PACER Docket Monitor',
      timestamp: new Date(Date.now() - 86400000),
      status: 'warning',
      duration: 1.2,
      operations: 1,
      dataProcessed: 'No new entries',
    },
  ];

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success('Webhook URL copied to clipboard');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleOpenMake = () => {
    window.open('https://www.make.com/en/scenarios', '_blank');
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Make.com Integration Hub</h1>
          <p className="text-muted-foreground mt-2">
            Manage connected automation scenarios and webhook endpoints
          </p>
        </div>
        <Button onClick={handleOpenMake}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Open Make.com
        </Button>
      </div>

      {/* MCP Activation Banner */}
      <Card className="mb-8 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Make.com MCP Server Not Connected
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                Currently showing mock data. To enable live Make.com integration:
              </p>
              <ol className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 list-decimal list-inside mb-4">
                <li>Go to Manus Settings → Integrations</li>
                <li>Find "Make.com" in the MCP Servers list</li>
                <li>Click "Connect" and complete OAuth authentication</li>
                <li>Return here to see live scenario data and execution logs</li>
              </ol>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Once connected, this page will automatically pull real-time data from your Make.com account.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Scenarios</p>
                <p className="text-2xl font-bold">{scenarios.filter(s => s.status === 'active').length}</p>
              </div>
              <Play className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Webhooks</p>
                <p className="text-2xl font-bold">{webhooks.length}</p>
              </div>
              <Webhook className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Runs Today</p>
                <p className="text-2xl font-bold">{scenarios.reduce((sum, s) => sum + s.runsToday, 0)}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Webhook Calls</p>
                <p className="text-2xl font-bold">{webhooks.reduce((sum, w) => sum + w.totalCalls, 0)}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Webhook Endpoints
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <Card key={webhook.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{webhook.name}</h4>
                        <Badge className="bg-green-500">Active</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{webhook.description}</p>
                      <div className="flex items-center gap-2 bg-muted p-2 rounded">
                        <code className="text-xs flex-1 truncate">{webhook.url}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopyUrl(webhook.url)}
                        >
                          {copiedUrl === webhook.url ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Last activity: {format(webhook.lastActivity, 'MMM dd, HH:mm')}</span>
                    <span>Total calls: {webhook.totalCalls}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scenarios Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Connected Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scenarios.map((scenario) => (
              <Card key={scenario.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{scenario.name}</h4>
                        {scenario.status === 'active' ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Paused</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Webhook: {scenario.webhook}</span>
                        <span>Last run: {format(scenario.lastRun, 'MMM dd, HH:mm')}</span>
                        <span>Runs today: {scenario.runsToday}</span>
                        {scenario.lastStatus === 'success' ? (
                          <span className="flex items-center gap-1 text-green-500">
                            <CheckCircle2 className="w-3 h-3" />
                            Success
                          </span>
                        ) : scenario.lastStatus === 'warning' ? (
                          <span className="flex items-center gap-1 text-orange-500">
                            <Clock className="w-3 h-3" />
                            Warning
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500">
                            <XCircle className="w-3 h-3" />
                            Error
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Execution Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Scenario</th>
                  <th className="text-left py-3 px-4">Timestamp</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Duration</th>
                  <th className="text-left py-3 px-4">Operations</th>
                  <th className="text-left py-3 px-4">Data Processed</th>
                </tr>
              </thead>
              <tbody>
                {executionLogs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm font-medium">{log.scenarioName}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {format(log.timestamp, 'MMM dd, HH:mm:ss')}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {log.status === 'success' ? (
                        <Badge className="bg-green-500">Success</Badge>
                      ) : log.status === 'warning' ? (
                        <Badge className="bg-orange-500">Warning</Badge>
                      ) : (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{log.duration}s</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{log.operations}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{log.dataProcessed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
