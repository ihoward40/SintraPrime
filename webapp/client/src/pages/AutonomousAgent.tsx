import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bot, Zap, CheckCircle2, XCircle, ChevronRight, Play, AlertCircle, Trash2 } from "lucide-react";

export default function AutonomousAgent() {
  const [task, setTask] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [currentApproval, setCurrentApproval] = useState<any>(null);

  const executeTaskMutation = trpc.agent.executeTask.useMutation();
  const toolsQuery = trpc.agent.getTools.useQuery();
  const { data: pendingApprovals } = trpc.agent.getPendingApprovals.useQuery(undefined, {
    refetchInterval: 2000, // Poll every 2 seconds
  });
  const respondToApprovalMutation = trpc.agent.respondToApproval.useMutation();
  const { data: memoryStats } = trpc.agent.getMemoryStats.useQuery();
  const clearMemoryMutation = trpc.agent.clearMemory.useMutation();

  // Check for pending approvals
  useEffect(() => {
    if (pendingApprovals && pendingApprovals.length > 0 && !showApprovalDialog) {
      setCurrentApproval(pendingApprovals[0]);
      setShowApprovalDialog(true);
    }
  }, [pendingApprovals, showApprovalDialog]);

  const handleApprove = async (feedback?: string) => {
    if (!currentApproval) return;

    try {
      await respondToApprovalMutation.mutateAsync({
        approvalId: currentApproval.id,
        approved: true,
        feedback,
      });
      setShowApprovalDialog(false);
      setCurrentApproval(null);
    } catch (error: any) {
      console.error("Failed to approve:", error.message);
    }
  };

  const handleReject = async (feedback?: string) => {
    if (!currentApproval) return;

    try {
      await respondToApprovalMutation.mutateAsync({
        approvalId: currentApproval.id,
        approved: false,
        feedback,
      });
      setShowApprovalDialog(false);
      setCurrentApproval(null);
    } catch (error: any) {
      console.error("Failed to reject:", error.message);
    }
  };

  const handleClearMemory = async () => {
    if (!confirm("Are you sure you want to clear all agent memory? This cannot be undone.")) {
      return;
    }

    try {
      await clearMemoryMutation.mutateAsync();
    } catch (error: any) {
      console.error("Failed to clear memory:", error.message);
    }
  };

  const handleExecute = async () => {
    if (!task.trim()) return;

    setIsExecuting(true);
    setResult(null);

    try {
      const id = `task_${Date.now()}`;
      setTaskId(id);
      const response = await executeTaskMutation.mutateAsync({ task });
      setResult(response);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const exampleTasks = [
    "Search for recent FDCPA violation cases in California and summarize the key findings",
    "Generate a demand letter for a debt collection violation case",
    "Calculate the deadline for filing a response to a motion filed on 2026-02-01 in federal court",
    "Research the statute of limitations for consumer protection claims in New York",
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Autonomous Agent</h1>
        <p className="text-muted-foreground">
          Describe any legal task and the AI agent will autonomously break it down into steps, use the right tools, and
          complete it for you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Task Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                What would you like the agent to do?
              </CardTitle>
              <CardDescription>
                The agent can search the web, generate documents, fill forms, calculate deadlines, and more.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Example: Search for recent FDCPA cases, then draft a complaint based on the findings..."
                value={task}
                onChange={(e) => setTask(e.target.value)}
                rows={6}
                className="resize-none"
              />

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{task.length} / 5000 characters</div>
                <Button onClick={handleExecute} disabled={isExecuting || !task.trim()} size="lg">
                  {isExecuting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Execute Task
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Example Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Example Tasks</CardTitle>
              <CardDescription>Click any example to try it out</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {exampleTasks.map((example, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4"
                  onClick={() => setTask(example)}
                  disabled={isExecuting}
                >
                  <Zap className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{example}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Execution Result */}
          {result && (
            <Card className={result.success ? "border-green-500" : "border-red-500"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Task Completed Successfully
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      Task Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.success ? (
                  <>
                    {result.steps && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary">{result.steps} steps executed</Badge>
                      </div>
                    )}

                    {result.result && (
                      <div className="prose prose-sm max-w-none">
                        <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">{result.result}</div>
                      </div>
                    )}

                    {result.executionHistory && result.executionHistory.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Execution Steps:</h4>
                        <div className="space-y-2">
                          {result.executionHistory.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                              <div className="flex-shrink-0 mt-1">
                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                                  {idx + 1}
                                </div>
                              </div>
                              <div className="flex-1 space-y-1">
                                <div className="font-medium text-sm">{item.step.description}</div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {item.step.tool}
                                  </Badge>
                                  {item.result.success ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-red-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-red-500">
                    <p className="font-semibold">Error:</p>
                    <p className="text-sm">{result.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Memory Statistics */}
          {memoryStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Memory Statistics</CardTitle>
                <CardDescription>
                  Agent memory and context persistence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Memories</div>
                    <div className="text-2xl font-bold">{memoryStats.totalMemories}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Cache Size</div>
                    <div className="text-2xl font-bold">{memoryStats.cacheSize}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Memory by Type</div>
                  {Object.entries(memoryStats.memoryByType || {}).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="capitalize">{type.replace("_", " ")}</span>
                      <span className="text-muted-foreground">{count as number}</span>
                    </div>
                  ))}
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearMemory}
                  disabled={clearMemoryMutation.isPending}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {clearMemoryMutation.isPending ? "Clearing..." : "Clear All Memory"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Available Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Tools</CardTitle>
              <CardDescription>Tools the agent can use</CardDescription>
            </CardHeader>
            <CardContent>
              {toolsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : toolsQuery.data ? (
                <div className="space-y-2">
                  {toolsQuery.data.map((tool: any) => (
                    <div key={tool.name} className="flex items-start gap-2 p-2 bg-muted rounded">
                      <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 space-y-0.5">
                        <div className="font-medium text-sm">{tool.name}</div>
                        <div className="text-xs text-muted-foreground">{tool.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">Failed to load tools</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approval Dialog */}
      {showApprovalDialog && currentApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Approval Required
              </CardTitle>
              <CardDescription>
                The agent needs your permission to proceed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Action</div>
                <div className="text-lg">{currentApproval.actionName}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Description</div>
                <div className="text-muted-foreground">{currentApproval.description}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Risk Level</div>
                <div className="flex items-center gap-2">
                  {currentApproval.riskLevel === "high" && (
                    <Badge variant="destructive">High Risk</Badge>
                  )}
                  {currentApproval.riskLevel === "medium" && (
                    <Badge className="bg-yellow-500">Medium Risk</Badge>
                  )}
                  {currentApproval.riskLevel === "low" && (
                    <Badge variant="secondary">Low Risk</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Parameters</div>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(currentApproval.params, null, 2)}
                </pre>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => handleReject("User rejected the action")}
                  disabled={respondToApprovalMutation.isPending}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove("User approved the action")}
                  disabled={respondToApprovalMutation.isPending}
                >
                  {respondToApprovalMutation.isPending ? "Processing..." : "Approve"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
