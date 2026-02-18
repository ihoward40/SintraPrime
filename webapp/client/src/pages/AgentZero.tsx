import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  Bot,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Loader2,
  ChevronRight,
  AlertCircle,
  Pause,
  History,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { LiveBrowserViewer } from "@/components/LiveBrowserViewer";
import { SCRAPING_TEMPLATES, type ScrapingTemplate, fillTemplate } from "@/data/scraping-templates";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSearch, Sparkle } from "lucide-react";

interface TaskProgress {
  taskId: string;
  phase: string;
  message: string;
  progress: number;
  timestamp: Date;
}

interface Subtask {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: string;
  error?: string;
}

interface Task {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: string;
  error?: string;
  subtasks?: Subtask[];
  startTime?: Date;
  endTime?: Date;
}

export default function AgentZero() {
  const [taskDescription, setTaskDescription] = useState("");
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [progressLog, setProgressLog] = useState<TaskProgress[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [taskHistory, setTaskHistory] = useState<Task[]>([]);
  const [showLiveViewer, setShowLiveViewer] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ScrapingTemplate | null>(null);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const socketRef = useRef<Socket | null>(null);

  // Fetch task history
  const { data: historyData } = trpc.agentZero.getTaskHistory.useQuery(
    { sessionId: sessionId || "" },
    { enabled: !!sessionId, refetchInterval: 5000 }
  );

  // Update task history from server data
  useEffect(() => {
    if (historyData?.history) {
      setTaskHistory(historyData.history);
    }
  }, [historyData]);

  // Socket.IO connection for real-time progress updates
  useEffect(() => {
    // Connect to server
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[AgentZero] Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('[AgentZero] Socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Listen for progress updates
  useEffect(() => {
    if (!sessionId || !socketRef.current) return;

    const socket = socketRef.current;

    // Join session room
    socket.emit('join-agent-session', sessionId);

    // Listen for progress events
    socket.on('agent-progress', (progress: TaskProgress) => {
      setProgressLog((prev) => [...prev, progress]);
      setIsStreaming(true);

      // Update current task status - check both phase and progress percentage
      if (progress.phase === 'completed' || progress.phase === 'done' || progress.progress >= 100) {
        setCurrentTask((prev) => prev ? { ...prev, status: 'completed' } : null);
        setIsStreaming(false);
      } else if (progress.phase === 'failed' || progress.phase === 'error') {
        setCurrentTask((prev) => prev ? { ...prev, status: 'failed' } : null);
        setIsStreaming(false);
      }
    });

    return () => {
      socket.off('agent-progress');
      socket.emit('leave-agent-session', sessionId);
    };
  }, [sessionId]);

  const executeTaskMutation = trpc.agentZero.executeTask.useMutation({
    onSuccess: (data) => {
      setCurrentTask(data.task);
      setSessionId(data.sessionId);
      
      if (data.success) {
        toast.success("Task completed successfully!");
      } else {
        toast.error("Task failed to complete");
      }
    },
    onError: (error) => {
      toast.error(`Task execution failed: ${error.message}`);
      setCurrentTask(null);
    },
  });

  const cancelTaskMutation = trpc.agentZero.cancelTask.useMutation({
    onSuccess: () => {
      toast.success("Task cancelled");
      if (currentTask) {
        setTaskHistory((prev) => [...prev, { ...currentTask, status: "failed" as const, endTime: new Date() }]);
      }
      setCurrentTask(null);
      setSessionId(null);
    },
  });

  const pauseTaskMutation = trpc.agentZero.pauseTask.useMutation({
    onSuccess: () => {
      setIsPaused(true);
      toast.success("Task paused");
    },
    onError: () => {
      toast.error("Failed to pause task");
    },
  });

  const resumeTaskMutation = trpc.agentZero.resumeTask.useMutation({
    onSuccess: () => {
      setIsPaused(false);
      toast.success("Task resumed");
    },
    onError: () => {
      toast.error("Failed to resume task");
    },
  });

  const handleExecuteTask = () => {
    if (!taskDescription.trim()) {
      toast.error("Please enter a task description");
      return;
    }

    setProgressLog([]);
    setCurrentTask({
      id: `task-${Date.now()}`,
      description: taskDescription,
      status: "in_progress",
      startTime: new Date(),
    });

    executeTaskMutation.mutate({
      taskDescription,
    });
  };

  const handleCancelTask = () => {
    if (sessionId) {
      cancelTaskMutation.mutate({ sessionId });
    }
  };

  const handlePauseTask = () => {
    if (sessionId) {
      pauseTaskMutation.mutate({ sessionId });
    }
  };

  const handleResumeTask = () => {
    if (sessionId) {
      resumeTaskMutation.mutate({ sessionId });
    }
  };

  // Save completed tasks to history
  useEffect(() => {
    if (currentTask && (currentTask.status === 'completed' || currentTask.status === 'failed')) {
      setTaskHistory((prev) => {
        // Avoid duplicates
        if (prev.some(t => t.id === currentTask.id)) return prev;
        return [...prev, { ...currentTask, endTime: new Date() }];
      });
    }
  }, [currentTask]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "in_progress":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      in_progress: "secondary",
      pending: "outline",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bot className="h-8 w-8" />
              Agent Zero
            </h1>
            <p className="text-muted-foreground">
              Autonomous AI agent for complex task execution
            </p>
          </div>
          {(sessionId || currentTask) && (
            <Button
              variant={showLiveViewer ? "default" : "outline"}
              onClick={() => setShowLiveViewer(!showLiveViewer)}
              className="gap-2"
            >
              <Monitor className="h-4 w-4" />
              {showLiveViewer ? "Hide" : "Show"} Live Viewer
            </Button>
          )}
        </div>

        {/* Task Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Task Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Describe the task you want Agent Zero to complete autonomously...&#10;&#10;Examples:&#10;- Research the latest FDCPA case law and summarize key findings&#10;- Draft a motion to dismiss based on statute of limitations&#10;- Analyze contract terms and identify potential risks"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={6}
              disabled={executeTaskMutation.isPending}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTemplates(true)}
                disabled={executeTaskMutation.isPending}
                className="gap-2"
              >
                <FileSearch className="h-4 w-4" />
                Use Template
              </Button>
              <Button
                onClick={handleExecuteTask}
                disabled={executeTaskMutation.isPending || !taskDescription.trim()}
                className="flex-1"
              >
                {executeTaskMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Execute Task
                  </>
                )}
              </Button>
              {executeTaskMutation.isPending && (
                <>
                  {!isPaused ? (
                    <Button
                      onClick={handlePauseTask}
                      variant="outline"
                      disabled={pauseTaskMutation.isPending}
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      onClick={handleResumeTask}
                      variant="outline"
                      disabled={resumeTaskMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Resume
                    </Button>
                  )}
                  <Button
                    onClick={handleCancelTask}
                    variant="destructive"
                    disabled={cancelTaskMutation.isPending}
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Task Status */}
        {currentTask && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(currentTask.status)}
                  Current Task
                </CardTitle>
                {getStatusBadge(currentTask.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Task Description</p>
                <p className="text-sm">{currentTask.description}</p>
              </div>

              {/* Subtasks */}
              {currentTask.subtasks && currentTask.subtasks.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">Execution Steps</p>
                  <div className="space-y-2">
                    {currentTask.subtasks.map((subtask, idx) => (
                      <div
                        key={subtask.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getStatusIcon(subtask.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              Step {idx + 1}
                            </span>
                            {getStatusBadge(subtask.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {subtask.description}
                          </p>
                          {subtask.result && (
                            <div className="text-xs bg-background p-2 rounded border">
                              <Streamdown>{subtask.result}</Streamdown>
                            </div>
                          )}
                          {subtask.error && (
                            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{subtask.error}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Final Result */}
              {currentTask.result && (
                <div>
                  <p className="text-sm font-medium mb-2">Final Result</p>
                  <div className="p-4 rounded-lg border bg-background">
                    <Streamdown>{currentTask.result}</Streamdown>
                  </div>
                </div>
              )}

              {/* Error */}
              {currentTask.error && (
                <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive mb-1">
                      Task Failed
                    </p>
                    <p className="text-sm text-destructive/90">{currentTask.error}</p>
                  </div>
                </div>
              )}

              {/* Timing */}
              {currentTask.startTime && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>
                    Started: {new Date(currentTask.startTime).toLocaleTimeString()}
                  </span>
                  {currentTask.endTime && (
                    <span>
                      Completed: {new Date(currentTask.endTime).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Task History */}
        {taskHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Task History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {taskHistory.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className="font-medium text-sm">{task.description}</span>
                        </div>
                        {getStatusBadge(task.status)}
                      </div>
                      {task.result && (
                        <div className="text-xs bg-background p-2 rounded border mt-2">
                          <Streamdown>{task.result.substring(0, 200) + "..."}</Streamdown>
                        </div>
                      )}
                      {task.startTime && task.endTime && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span>
                            {new Date(task.startTime).toLocaleString()}
                          </span>
                          <span>→</span>
                          <span>
                            {new Date(task.endTime).toLocaleString()}
                          </span>
                          <span className="ml-auto">
                            Duration: {Math.round((new Date(task.endTime).getTime() - new Date(task.startTime).getTime()) / 1000)}s
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        {!currentTask && taskHistory.length === 0 && (
          <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/10">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Bot className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    How Agent Zero Works
                  </p>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>Breaks down complex tasks into manageable steps</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>Executes each step autonomously with AI reasoning</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>Self-corrects errors and adapts to challenges</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>Synthesizes results into comprehensive answers</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Browser Viewer */}
        {showLiveViewer && sessionId && (
          <Card className="fixed bottom-4 right-4 w-[800px] h-[600px] shadow-2xl z-50">
            <LiveBrowserViewer
              sessionId={sessionId}
              onClose={() => setShowLiveViewer(false)}
              className="h-full"
            />
          </Card>
        )}

        {/* Template Selector Dialog */}
        <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5" />
                Web Scraping Templates
              </DialogTitle>
              <DialogDescription>
                Choose a pre-built template for common legal research and data extraction tasks
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Template Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SCRAPING_TEMPLATES.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => {
                      setSelectedTemplate(template);
                      // Extract placeholders from template
                      const placeholders = template.taskPrompt.match(/\[([A-Z_]+)\]/g) || [];
                      const initialValues: Record<string, string> = {};
                      placeholders.forEach(p => {
                        const key = p.slice(1, -1).toLowerCase().replace(/_/g, " ");
                        initialValues[key] = "";
                      });
                      setTemplateValues(initialValues);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{template.title}</CardTitle>
                        <Badge variant={template.difficulty === "easy" ? "default" : template.difficulty === "medium" ? "secondary" : "destructive"}>
                          {template.difficulty}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {template.estimatedTime}
                        <span className="mx-1">•</span>
                        <Badge variant="outline" className="text-xs">{template.category}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Template Configuration */}
              {selectedTemplate && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="text-base">Configure Template: {selectedTemplate.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.keys(templateValues).map((key) => (
                      <div key={key} className="space-y-2">
                        <Label htmlFor={key} className="capitalize">
                          {key.replace(/_/g, " ")}
                        </Label>
                        <Input
                          id={key}
                          value={templateValues[key]}
                          onChange={(e) => setTemplateValues({ ...templateValues, [key]: e.target.value })}
                          placeholder={`Enter ${key.replace(/_/g, " ")}`}
                        />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => {
                          const filledPrompt = fillTemplate(selectedTemplate, templateValues);
                          setTaskDescription(filledPrompt);
                          setShowTemplates(false);
                          setSelectedTemplate(null);
                          toast.success("Template applied to task description");
                        }}
                        disabled={Object.values(templateValues).some(v => !v.trim())}
                        className="flex-1"
                      >
                        <Sparkle className="h-4 w-4 mr-2" />
                        Apply Template
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedTemplate(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
