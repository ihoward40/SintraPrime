import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Filter, Download, ExternalLink, Mail, Mic, Globe, CheckCircle2, XCircle, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { trpc } from '@/lib/trpc';

export default function TriggerExecutionHistory() {
  const [selectedTrigger, setSelectedTrigger] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState('7d');
  const [selectedExecution, setSelectedExecution] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  // Fetch triggers for filter
  const { data: triggers = [] } = trpc.workflowTriggers.list.useQuery();

  // Mock execution history data
  const executionHistory = [
    {
      id: 1,
      triggerId: 1,
      triggerName: 'FDCPA Violation Email Alert',
      triggerType: 'email_received',
      timestamp: new Date(Date.now() - 3600000),
      status: 'success',
      matchedKeywords: ['FDCPA', 'violation', 'debt collector'],
      workflowId: 101,
      workflowName: 'FDCPA Case Creation Workflow',
      workflowStatus: 'completed',
      executionTime: 2.3,
      eventData: {
        type: 'email',
        from: 'john.doe@example.com',
        subject: 'FDCPA Violation Report - Case #12345',
        body: 'I received multiple calls from a debt collector violating FDCPA regulations...',
        attachments: 2,
      },
    },
    {
      id: 2,
      triggerId: 2,
      triggerName: 'Deposition Audio Transcription',
      triggerType: 'audio_transcribed',
      timestamp: new Date(Date.now() - 7200000),
      status: 'success',
      matchedKeywords: ['deposition', 'testimony', 'witness'],
      workflowId: 102,
      workflowName: 'Evidence Processing Workflow',
      workflowStatus: 'completed',
      executionTime: 45.7,
      eventData: {
        type: 'audio',
        filename: 'deposition_smith_2024-02-15.mp3',
        duration: '1:23:45',
        transcript: 'Q: Can you state your name for the record? A: John Smith...',
        fileSize: '12.3 MB',
      },
    },
    {
      id: 3,
      triggerId: 3,
      triggerName: 'Court Policy Change Monitor',
      triggerType: 'web_change_detected',
      timestamp: new Date(Date.now() - 10800000),
      status: 'success',
      matchedKeywords: ['policy', 'filing', 'procedure'],
      workflowId: 103,
      workflowName: 'Policy Update Alert Workflow',
      workflowStatus: 'completed',
      executionTime: 1.8,
      eventData: {
        type: 'web',
        url: 'https://www.uscourts.gov/rules-policies',
        changeType: 'content_modified',
        changedSections: ['Filing Procedures', 'Electronic Filing'],
        severity: 'high',
      },
    },
    {
      id: 4,
      triggerId: 1,
      triggerName: 'FDCPA Violation Email Alert',
      triggerType: 'email_received',
      timestamp: new Date(Date.now() - 14400000),
      status: 'failed',
      matchedKeywords: ['FDCPA'],
      workflowId: 101,
      workflowName: 'FDCPA Case Creation Workflow',
      workflowStatus: 'failed',
      executionTime: 0.5,
      error: 'Workflow execution failed: Missing required field "case_number"',
      eventData: {
        type: 'email',
        from: 'jane.smith@example.com',
        subject: 'FDCPA Question',
        body: 'I have a question about FDCPA regulations...',
        attachments: 0,
      },
    },
  ];

  const filteredHistory = executionHistory.filter((exec) => {
    if (selectedTrigger !== 'all' && exec.triggerId.toString() !== selectedTrigger) return false;
    if (selectedStatus !== 'all' && exec.status !== selectedStatus) return false;
    return true;
  });

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'email_received':
        return <Mail className="w-4 h-4" />;
      case 'audio_transcribed':
        return <Mic className="w-4 h-4" />;
      case 'web_change_detected':
        return <Globe className="w-4 h-4" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const handleViewDetails = (execution: any) => {
    setSelectedExecution(execution);
    setShowDetailsDialog(true);
  };

  const handleExport = () => {
    // In production, generate CSV/JSON export
    alert('Export functionality coming soon!');
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <History className="w-8 h-8" />
            Trigger Execution History
          </h1>
          <p className="text-muted-foreground mt-2">
            Detailed logs of all trigger executions and workflow outcomes
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Trigger</label>
              <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Triggers</SelectItem>
                  {triggers.map((trigger) => (
                    <SelectItem key={trigger.id} value={trigger.id.toString()}>
                      {trigger.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Logs ({filteredHistory.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredHistory.map((execution) => (
              <Card key={execution.id} className="border-l-4" style={{
                borderLeftColor: execution.status === 'success' ? '#10b981' : execution.status === 'failed' ? '#ef4444' : '#f59e0b'
              }}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          {getTriggerIcon(execution.triggerType)}
                          <h4 className="font-semibold">{execution.triggerName}</h4>
                        </div>
                        {execution.status === 'success' ? (
                          <Badge className="bg-green-500">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Success
                          </Badge>
                        ) : execution.status === 'failed' ? (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-500">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span>{format(execution.timestamp, 'MMM dd, yyyy HH:mm:ss')}</span>
                        <span>•</span>
                        <span>Execution time: {execution.executionTime}s</span>
                      </div>

                      {/* Matched Keywords */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-medium">Matched Keywords:</span>
                        <div className="flex flex-wrap gap-2">
                          {execution.matchedKeywords.map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Workflow Info */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Workflow:</span>
                        <a
                          href={`/workflows/${execution.workflowId}`}
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
                          {execution.workflowName}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <Badge variant={execution.workflowStatus === 'completed' ? 'default' : 'destructive'} className="text-xs">
                          {execution.workflowStatus}
                        </Badge>
                      </div>

                      {/* Error Message */}
                      {execution.error && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                          <strong>Error:</strong> {execution.error}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(execution)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredHistory.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No execution history found</p>
                <p className="text-sm mt-2">Adjust filters to see more results</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Execution Details</DialogTitle>
          </DialogHeader>
          {selectedExecution && (
            <div className="space-y-6">
              {/* Event Data Snapshot */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Event Data Snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedExecution.eventData.type === 'email' && (
                    <div className="space-y-3">
                      <div>
                        <span className="font-semibold">From:</span> {selectedExecution.eventData.from}
                      </div>
                      <div>
                        <span className="font-semibold">Subject:</span> {selectedExecution.eventData.subject}
                      </div>
                      <div>
                        <span className="font-semibold">Attachments:</span> {selectedExecution.eventData.attachments}
                      </div>
                      <div>
                        <span className="font-semibold">Body Preview:</span>
                        <div className="mt-2 p-3 bg-muted rounded text-sm">
                          {selectedExecution.eventData.body}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedExecution.eventData.type === 'audio' && (
                    <div className="space-y-3">
                      <div>
                        <span className="font-semibold">Filename:</span> {selectedExecution.eventData.filename}
                      </div>
                      <div>
                        <span className="font-semibold">Duration:</span> {selectedExecution.eventData.duration}
                      </div>
                      <div>
                        <span className="font-semibold">File Size:</span> {selectedExecution.eventData.fileSize}
                      </div>
                      <div>
                        <span className="font-semibold">Transcript Preview:</span>
                        <div className="mt-2 p-3 bg-muted rounded text-sm">
                          {selectedExecution.eventData.transcript}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedExecution.eventData.type === 'web' && (
                    <div className="space-y-3">
                      <div>
                        <span className="font-semibold">URL:</span>{' '}
                        <a href={selectedExecution.eventData.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {selectedExecution.eventData.url}
                        </a>
                      </div>
                      <div>
                        <span className="font-semibold">Change Type:</span> {selectedExecution.eventData.changeType}
                      </div>
                      <div>
                        <span className="font-semibold">Severity:</span>{' '}
                        <Badge variant={selectedExecution.eventData.severity === 'high' ? 'destructive' : 'default'}>
                          {selectedExecution.eventData.severity}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-semibold">Changed Sections:</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedExecution.eventData.changedSections.map((section: string, idx: number) => (
                            <Badge key={idx} variant="outline">{section}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Execution Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Execution Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                      <div className="flex-1">
                        <div className="font-semibold">Trigger Matched</div>
                        <div className="text-sm text-muted-foreground">
                          {format(selectedExecution.timestamp, 'HH:mm:ss.SSS')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <div className="flex-1">
                        <div className="font-semibold">Workflow Started</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(selectedExecution.timestamp.getTime() + 100), 'HH:mm:ss.SSS')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full ${selectedExecution.status === 'success' ? 'bg-green-500' : 'bg-red-500'} mt-2`} />
                      <div className="flex-1">
                        <div className="font-semibold">Workflow {selectedExecution.status === 'success' ? 'Completed' : 'Failed'}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(selectedExecution.timestamp.getTime() + selectedExecution.executionTime * 1000), 'HH:mm:ss.SSS')}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
