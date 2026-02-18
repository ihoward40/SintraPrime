import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { Zap, Plus, Trash2, Edit2, Play, Pause, Mail, Mic, Globe, History, Settings2 } from 'lucide-react';
import { ConditionBuilder, type ConditionGroup } from '@/components/ConditionBuilder';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function WorkflowTriggers() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<number | null>(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [newTrigger, setNewTrigger] = useState({
    workflowId: '',
    name: '',
    description: '',
    triggerType: 'email_received' as 'email_received' | 'audio_transcribed' | 'web_change_detected' | 'manual',
    keywords: [] as string[],
    keywordInput: '',
    autoStart: true,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    conditions: { id: 'root', type: 'AND' as 'AND' | 'OR', rules: [] } as ConditionGroup,
  });

  const { data: triggers, refetch } = trpc.workflowTriggers.list.useQuery({});
  const { data: workflows } = trpc.workflow.list.useQuery({});
  const { data: executionHistory } = trpc.workflowTriggers.getExecutionHistory.useQuery(
    { triggerId: selectedTrigger || undefined, limit: 50 },
    { enabled: !!selectedTrigger }
  );

  const createTrigger = trpc.workflowTriggers.create.useMutation({
    onSuccess: () => {
      toast.success('Trigger created successfully');
      refetch();
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create trigger: ${error.message}`);
    },
  });

  const toggleTrigger = trpc.workflowTriggers.toggle.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteTrigger = trpc.workflowTriggers.delete.useMutation({
    onSuccess: () => {
      toast.success('Trigger deleted');
      refetch();
    },
  });

  const resetForm = () => {
    setNewTrigger({
      workflowId: '',
      name: '',
      description: '',
      triggerType: 'email_received',
      keywords: [],
      keywordInput: '',
      autoStart: true,
      priority: 'medium',
    });
  };

  const handleAddKeyword = () => {
    if (newTrigger.keywordInput.trim()) {
      setNewTrigger({
        ...newTrigger,
        keywords: [...newTrigger.keywords, newTrigger.keywordInput.trim()],
        keywordInput: '',
      });
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setNewTrigger({
      ...newTrigger,
      keywords: newTrigger.keywords.filter((_, i) => i !== index),
    });
  };

  const handleCreateTrigger = () => {
    if (!newTrigger.workflowId || !newTrigger.name) {
      toast.error('Please fill in workflow and trigger name');
      return;
    }

    createTrigger.mutate({
      workflowId: parseInt(newTrigger.workflowId),
      name: newTrigger.name,
      description: newTrigger.description,
      triggerType: newTrigger.triggerType,
      conditions: {
        keywords: newTrigger.keywords.length > 0 ? newTrigger.keywords : undefined,
      },
      executionParams: {
        autoStart: newTrigger.autoStart,
        priority: newTrigger.priority,
      },
    });
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-blue-500">Medium</Badge>;
      default:
        return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Workflow Triggers</h1>
          <p className="text-muted-foreground mt-2">
            Automate workflow execution based on ingest events
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Trigger
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Workflow Trigger</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Workflow</Label>
                <Select value={newTrigger.workflowId} onValueChange={(v) => setNewTrigger({ ...newTrigger, workflowId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows?.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id.toString()}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Trigger Name</Label>
                <Input
                  value={newTrigger.name}
                  onChange={(e) => setNewTrigger({ ...newTrigger, name: e.target.value })}
                  placeholder="e.g., Auto-respond to FDCPA emails"
                />
              </div>

              <div>
                <Label>Trigger Type</Label>
                <Select value={newTrigger.triggerType} onValueChange={(v: any) => setNewTrigger({ ...newTrigger, triggerType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email_received">Email Received</SelectItem>
                    <SelectItem value="audio_transcribed">Audio Transcribed</SelectItem>
                    <SelectItem value="web_change_detected">Web Change Detected</SelectItem>
                    <SelectItem value="manual">Manual Trigger</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">Condition Mode:</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={!advancedMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAdvancedMode(false)}
                  >
                    Simple
                  </Button>
                  <Button
                    variant={advancedMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAdvancedMode(true)}
                  >
                    Advanced
                  </Button>
                </div>
              </div>

              {/* Simple Mode: Keywords */}
              {!advancedMode && (
                <div>
                  <Label>Keywords (trigger when any keyword matches)</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newTrigger.keywordInput}
                      onChange={(e) => setNewTrigger({ ...newTrigger, keywordInput: e.target.value })}
                      placeholder="Enter keyword"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                    />
                    <Button type="button" onClick={handleAddKeyword}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {newTrigger.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveKeyword(index)}>
                        {keyword} ×
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced Mode: Condition Builder */}
              {advancedMode && (
                <div>
                  <Label className="mb-3 block">Advanced Conditions</Label>
                  <ConditionBuilder
                    conditions={newTrigger.conditions}
                    onChange={(conditions) => setNewTrigger({ ...newTrigger, conditions })}
                    triggerType={newTrigger.triggerType}
                  />
                </div>
              )}

              <div>
                <Label>Priority</Label>
                <Select value={newTrigger.priority} onValueChange={(v: any) => setNewTrigger({ ...newTrigger, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoStart"
                  checked={newTrigger.autoStart}
                  onChange={(e) => setNewTrigger({ ...newTrigger, autoStart: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="autoStart" className="cursor-pointer">
                  Auto-start workflow (execute immediately when triggered)
                </Label>
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={newTrigger.description}
                  onChange={(e) => setNewTrigger({ ...newTrigger, description: e.target.value })}
                  placeholder="Describe what this trigger does"
                  rows={3}
                />
              </div>

              <Button onClick={handleCreateTrigger} className="w-full" disabled={createTrigger.isPending}>
                {createTrigger.isPending ? 'Creating...' : 'Create Trigger'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Triggers List */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Active Triggers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {triggers?.map((trigger) => (
              <Card key={trigger.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getTriggerIcon(trigger.triggerType)}
                        <h4 className="font-semibold">{trigger.name}</h4>
                        {trigger.isActive ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Paused</Badge>
                        )}
                        {trigger.executionParams && getPriorityBadge((trigger.executionParams as any).priority || 'medium')}
                      </div>
                      {trigger.description && (
                        <p className="text-sm text-muted-foreground mb-2">{trigger.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Type: {trigger.triggerType.replace('_', ' ')}</span>
                        {trigger.conditions && (trigger.conditions as any).keywords && (
                          <span>Keywords: {(trigger.conditions as any).keywords.join(', ')}</span>
                        )}
                        <span>Triggered: {trigger.triggerCount} times</span>
                        {trigger.lastTriggered && (
                          <span>Last: {format(new Date(trigger.lastTriggered), 'MMM dd, HH:mm')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTrigger(trigger.id)}
                      >
                        <History className="w-3 h-3 mr-1" />
                        History
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleTrigger.mutate({ triggerId: trigger.id, isActive: !trigger.isActive })}
                      >
                        {trigger.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTrigger.mutate({ triggerId: trigger.id })}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!triggers?.length && (
              <div className="py-12 text-center text-muted-foreground">
                No triggers configured. Create your first trigger to automate workflow execution.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Execution History */}
      {selectedTrigger && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Execution History
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setSelectedTrigger(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Event Type</th>
                    <th className="text-left py-3 px-4">Matched Conditions</th>
                    <th className="text-left py-3 px-4">Workflow Execution</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Triggered At</th>
                  </tr>
                </thead>
                <tbody>
                  {executionHistory?.map((execution) => (
                    <tr key={execution.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 text-sm">{execution.eventType}</td>
                      <td className="py-3 px-4 text-sm">
                        {execution.matchedConditions && (execution.matchedConditions as any).keywords && (
                          <div className="flex flex-wrap gap-1">
                            {(execution.matchedConditions as any).keywords.map((keyword: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">{keyword}</Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {execution.workflowExecutionId ? (
                          <Badge variant="secondary">#{execution.workflowExecutionId}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {execution.status === 'executed' ? (
                          <Badge className="bg-green-500">Executed</Badge>
                        ) : execution.status === 'failed' ? (
                          <Badge variant="destructive">Failed</Badge>
                        ) : (
                          <Badge variant="secondary">{execution.status}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {format(new Date(execution.triggeredAt), 'MMM dd, HH:mm:ss')}
                      </td>
                    </tr>
                  ))}
                  {!executionHistory?.length && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        No execution history yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
