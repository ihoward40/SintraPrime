import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap,
  Cpu,
  Database,
  Globe
} from "lucide-react";

interface AgentTask {
  id: string;
  agent: "Agent Zero" | "Browser Automation" | "Video Generator" | "Web Scraper";
  task: string;
  status: "running" | "completed" | "failed" | "queued";
  progress: number;
  startedAt: Date;
  duration?: number; // in seconds
  cost?: number; // in USD
}

export function AgentActivityMonitor() {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState({
    cpuUsage: 45,
    memoryUsage: 62,
    activeAgents: 3,
    queuedTasks: 2,
  });

  // Connect to real-time WebSocket for agent activity
  useEffect(() => {
    // Connect to WebSocket server
    const newSocket = io({
      path: "/intelligence-ws",
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("Connected to Agent Activity WebSocket");
      setIsConnected(true);
      // Subscribe to agent activity channel
      newSocket.emit("subscribe", "agent-activity");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Agent Activity WebSocket");
      setIsConnected(false);
    });

    newSocket.on("agent_activity", (activity: any) => {
      console.log("Received agent activity:", activity);
      // Convert to AgentTask format
      const newTask: AgentTask = {
        id: activity.id,
        agent: activity.agentName as AgentTask["agent"],
        task: activity.taskDescription,
        status: activity.status === "starting" ? "queued" :
                activity.status === "running" ? "running" :
                activity.status === "completed" ? "completed" : "failed",
        progress: activity.progress,
        startedAt: new Date(activity.startTime),
        duration: activity.endTime ? 
          Math.floor((new Date(activity.endTime).getTime() - new Date(activity.startTime).getTime()) / 1000) : 
          undefined,
        cost: activity.status === "completed" ? Math.random() * 0.2 : undefined,
      };

      setTasks((prev) => {
        // Update existing task or add new one
        const existingIndex = prev.findIndex(t => t.id === newTask.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newTask;
          return updated;
        }
        return [newTask, ...prev].slice(0, 20); // Keep last 20 tasks
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Initialize with mock data
  useEffect(() => {
    const mockTasks: AgentTask[] = [
      {
        id: "1",
        agent: "Agent Zero",
        task: "Analyzing case documents and extracting key evidence",
        status: "running",
        progress: 65,
        startedAt: new Date(Date.now() - 1000 * 60 * 2),
      },
      {
        id: "2",
        agent: "Browser Automation",
        task: "Scraping court docket for case updates",
        status: "running",
        progress: 82,
        startedAt: new Date(Date.now() - 1000 * 60 * 1.5),
      },
      {
        id: "3",
        agent: "Web Scraper",
        task: "Monitoring opposing counsel public filings",
        status: "completed",
        progress: 100,
        startedAt: new Date(Date.now() - 1000 * 60 * 5),
        duration: 180,
        cost: 0.05,
      },
      {
        id: "4",
        agent: "Video Generator",
        task: "Creating case summary presentation",
        status: "queued",
        progress: 0,
        startedAt: new Date(),
      },
      {
        id: "5",
        agent: "Agent Zero",
        task: "Legal research on precedent cases",
        status: "completed",
        progress: 100,
        startedAt: new Date(Date.now() - 1000 * 60 * 10),
        duration: 420,
        cost: 0.12,
      },
    ];

    setTasks(mockTasks);

    // Simulate progress updates
    const interval = setInterval(() => {
      setTasks(prev => prev.map(task => {
        if (task.status === "running" && task.progress < 100) {
          const newProgress = Math.min(task.progress + Math.random() * 10, 100);
          return {
            ...task,
            progress: newProgress,
            status: newProgress >= 100 ? "completed" : "running",
            duration: newProgress >= 100 ? Math.floor((Date.now() - task.startedAt.getTime()) / 1000) : undefined,
            cost: newProgress >= 100 ? Math.random() * 0.2 : undefined,
          };
        }
        return task;
      }));

      // Update system metrics
      setSystemMetrics(prev => ({
        cpuUsage: Math.min(Math.max(prev.cpuUsage + (Math.random() - 0.5) * 10, 20), 80),
        memoryUsage: Math.min(Math.max(prev.memoryUsage + (Math.random() - 0.5) * 5, 40), 85),
        activeAgents: Math.floor(Math.random() * 5) + 1,
        queuedTasks: Math.floor(Math.random() * 4),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: AgentTask["status"]) => {
    switch (status) {
      case "running": return <Activity className="h-4 w-4 text-primary animate-pulse" />;
      case "completed": return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "failed": return <XCircle className="h-4 w-4 text-destructive" />;
      case "queued": return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: AgentTask["status"]) => {
    switch (status) {
      case "running": return <Badge className="status-indicator status-info">Running</Badge>;
      case "completed": return <Badge className="status-indicator status-active">Completed</Badge>;
      case "failed": return <Badge className="status-indicator status-error">Failed</Badge>;
      case "queued": return <Badge className="status-indicator status-warning">Queued</Badge>;
    }
  };

  const getAgentIcon = (agent: AgentTask["agent"]) => {
    switch (agent) {
      case "Agent Zero": return <Zap className="h-4 w-4" />;
      case "Browser Automation": return <Globe className="h-4 w-4" />;
      case "Video Generator": return <Activity className="h-4 w-4" />;
      case "Web Scraper": return <Database className="h-4 w-4" />;
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const runningTasks = tasks.filter(t => t.status === "running");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const totalCost = tasks.reduce((sum, t) => sum + (t.cost || 0), 0);

  return (
    <Card className="panel">
      <CardHeader className="panel-header">
        <CardTitle className="panel-title">
          <Activity className="h-5 w-5 text-primary" />
          Agent Activity Monitor
          {runningTasks.length > 0 && (
            <span className="ml-3 flex items-center gap-2 text-sm font-normal text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              {runningTasks.length} Active
            </span>
          )}
        </CardTitle>
        <CardDescription className="panel-description">
          Real-time automation execution tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                CPU
              </span>
              <span className="font-mono font-semibold">{systemMetrics.cpuUsage}%</span>
            </div>
            <Progress value={systemMetrics.cpuUsage} className="h-2" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Database className="h-4 w-4" />
                Memory
              </span>
              <span className="font-mono font-semibold">{systemMetrics.memoryUsage}%</span>
            </div>
            <Progress value={systemMetrics.memoryUsage} className="h-2" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono">{systemMetrics.activeAgents}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Active Agents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono">${totalCost.toFixed(3)}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Cost</div>
          </div>
        </div>

        {/* Task List */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-muted text-primary">
                        {getAgentIcon(task.agent)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{task.agent}</span>
                          {getStatusBadge(task.status)}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {task.task}
                        </p>
                      </div>
                    </div>
                    {getStatusIcon(task.status)}
                  </div>

                  {/* Progress Bar */}
                  {task.status === "running" && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span className="font-mono font-semibold">{Math.round(task.progress)}%</span>
                      </div>
                      <Progress value={task.progress} className="h-2" />
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-mono">
                      Started: {task.startedAt.toLocaleTimeString()}
                    </span>
                    {task.duration && (
                      <span className="font-mono">
                        Duration: {formatDuration(task.duration)}
                      </span>
                    )}
                    {task.cost && (
                      <span className="font-mono">
                        Cost: ${task.cost.toFixed(3)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-primary">{runningTasks.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Running</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-success">{completedTasks.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold font-mono text-warning">{systemMetrics.queuedTasks}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Queued</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
