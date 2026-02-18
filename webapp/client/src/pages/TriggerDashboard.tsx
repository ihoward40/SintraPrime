import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, Zap, TrendingUp, CheckCircle2, XCircle, Clock, Mail, Mic, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { trpc } from '@/lib/trpc';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TriggerDashboard() {
  const [filterType, setFilterType] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      // Trigger refetch
      window.location.reload();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Mock data - replace with real tRPC queries
  const liveTriggerFeed = [
    {
      id: 1,
      triggerName: 'FDCPA Violation Email Alert',
      triggerType: 'email_received',
      timestamp: new Date(Date.now() - 30000),
      status: 'success',
      workflowName: 'FDCPA Case Creation',
      executionTime: 2.3,
    },
    {
      id: 2,
      triggerName: 'Deposition Audio Transcription',
      triggerType: 'audio_transcribed',
      timestamp: new Date(Date.now() - 120000),
      status: 'success',
      workflowName: 'Evidence Processing',
      executionTime: 45.7,
    },
    {
      id: 3,
      triggerName: 'Court Policy Change Monitor',
      triggerType: 'web_change_detected',
      timestamp: new Date(Date.now() - 180000),
      status: 'success',
      workflowName: 'Policy Update Alert',
      executionTime: 1.8,
    },
    {
      id: 4,
      triggerName: 'TCPA Violation Email',
      triggerType: 'email_received',
      timestamp: new Date(Date.now() - 240000),
      status: 'failed',
      workflowName: 'TCPA Case Creation',
      executionTime: 0.5,
      error: 'Missing required field',
    },
  ];

  const activeWorkflows = [
    {
      id: 101,
      name: 'Document Analysis Workflow',
      progress: 65,
      startedAt: new Date(Date.now() - 45000),
      currentStep: 'Extracting text from PDF',
    },
    {
      id: 102,
      name: 'Evidence Chain Verification',
      progress: 30,
      startedAt: new Date(Date.now() - 90000),
      currentStep: 'Validating timestamps',
    },
  ];

  const fireRateData = [
    { hour: '00:00', count: 5 },
    { hour: '01:00', count: 3 },
    { hour: '02:00', count: 2 },
    { hour: '03:00', count: 4 },
    { hour: '04:00', count: 6 },
    { hour: '05:00', count: 8 },
    { hour: '06:00', count: 12 },
    { hour: '07:00', count: 15 },
    { hour: '08:00', count: 18 },
  ];

  const topTriggers = [
    { name: 'FDCPA Violation Email Alert', count: 45, type: 'email_received' },
    { name: 'Deposition Audio Transcription', count: 32, type: 'audio_transcribed' },
    { name: 'Court Policy Change Monitor', count: 28, type: 'web_change_detected' },
    { name: 'TCPA Violation Email', count: 24, type: 'email_received' },
    { name: 'FCRA Dispute Monitor', count: 19, type: 'email_received' },
  ];

  const systemHealth = {
    successRate: 94.5,
    avgExecutionTime: 12.3,
    totalFires: 148,
    activeTriggers: 12,
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'email_received':
        return <Mail className="w-4 h-4" />;
      case 'audio_transcribed':
        return <Mic className="w-4 h-4" />;
      case 'web_change_detected':
        return <Globe className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const filteredFeed = filterType === 'all' 
    ? liveTriggerFeed 
    : liveTriggerFeed.filter(item => item.triggerType === filterType);

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="w-8 h-8" />
            Real-Time Trigger Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Live monitoring of trigger fires and workflow executions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={autoRefresh ? "default" : "secondary"} className="cursor-pointer" onClick={() => setAutoRefresh(!autoRefresh)}>
            {autoRefresh ? 'Auto-Refresh: ON' : 'Auto-Refresh: OFF'}
          </Badge>
        </div>
      </div>

      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{systemHealth.successRate}%</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Execution Time</p>
                <p className="text-2xl font-bold">{systemHealth.avgExecutionTime}s</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Fires (24h)</p>
                <p className="text-2xl font-bold">{systemHealth.totalFires}</p>
              </div>
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Triggers</p>
                <p className="text-2xl font-bold">{systemHealth.activeTriggers}</p>
              </div>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Live Trigger Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Live Trigger Feed
              </CardTitle>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="email_received">Email</SelectItem>
                  <SelectItem value="audio_transcribed">Audio</SelectItem>
                  <SelectItem value="web_change_detected">Web</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredFeed.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="mt-1">
                    {getTriggerIcon(item.triggerType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">{item.triggerName}</span>
                      {item.status === 'success' ? (
                        <Badge className="bg-green-500 text-xs">Success</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Failed</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Workflow: {item.workflowName} • {item.executionTime}s
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(item.timestamp, 'HH:mm:ss')}
                    </p>
                    {item.error && (
                      <p className="text-xs text-red-500 mt-1">{item.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Workflow Executions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Active Workflow Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeWorkflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active workflows</p>
                </div>
              ) : (
                activeWorkflows.map((workflow) => (
                  <div key={workflow.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{workflow.name}</span>
                      <Badge variant="outline">{workflow.progress}%</Badge>
                    </div>
                    <Progress value={workflow.progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{workflow.currentStep}</span>
                      <span>Started {format(workflow.startedAt, 'HH:mm:ss')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trigger Fire Rate Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Trigger Fire Rate (Last 24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fireRateData.map((data, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-16">{data.hour}</span>
                  <div className="flex-1">
                    <div className="h-6 bg-blue-500 rounded" style={{ width: `${(data.count / 20) * 100}%` }} />
                  </div>
                  <span className="text-sm font-semibold w-8">{data.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Triggers */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Most-Fired Triggers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topTriggers.map((trigger, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getTriggerIcon(trigger.type)}
                    <span className="text-sm truncate">{trigger.name}</span>
                  </div>
                  <Badge variant="outline">{trigger.count} fires</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
