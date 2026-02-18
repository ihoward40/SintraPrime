import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Radio, 
  AlertCircle, 
  TrendingUp, 
  FileText, 
  Scale, 
  Gavel,
  ExternalLink
} from "lucide-react";

interface IntelligenceItem {
  id: string;
  type: "alert" | "news" | "filing" | "legislation" | "market";
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  priority: "high" | "medium" | "low";
  url?: string;
}

export function LiveIntelligenceFeed() {
  const [feed, setFeed] = useState<IntelligenceItem[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Connect to real-time WebSocket feed
  useEffect(() => {
    // Connect to WebSocket server
    const newSocket = io({
      path: "/intelligence-ws",
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("Connected to Intelligence WebSocket");
      setIsConnected(true);
      // Subscribe to intelligence feed channel
      newSocket.emit("subscribe", "intelligence-feed");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from Intelligence WebSocket");
      setIsConnected(false);
    });

    newSocket.on("intelligence_alert", (alert: any) => {
      console.log("Received intelligence alert:", alert);
      // Convert alert to IntelligenceItem format
      const item: IntelligenceItem = {
        id: alert.id,
        type: alert.type === "legal_update" ? "news" : 
              alert.type === "case_alert" ? "alert" :
              alert.type === "regulatory_change" ? "legislation" :
              alert.type === "court_decision" ? "filing" : "news",
        title: alert.title,
        description: alert.description,
        source: alert.source,
        timestamp: new Date(alert.timestamp),
        priority: alert.severity === "critical" || alert.severity === "high" ? "high" :
                  alert.severity === "medium" ? "medium" : "low",
        url: alert.url,
      };
      setFeed((prev) => [item, ...prev].slice(0, 50)); // Keep last 50 items
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Initialize with mock data
  useEffect(() => {
    const mockFeed: IntelligenceItem[] = [
      {
        id: "1",
        type: "alert",
        title: "Supreme Court Decision: Patent Law Reform",
        description: "Major ruling affects software patent litigation nationwide",
        source: "SCOTUS",
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        priority: "high",
        url: "https://www.supremecourt.gov"
      },
      {
        id: "2",
        type: "filing",
        title: "Class Action Filed: Consumer Protection",
        description: "New class action in Northern District of California",
        source: "PACER",
        timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
        priority: "medium",
      },
      {
        id: "3",
        type: "legislation",
        title: "Senate Bill 2024: Privacy Act Amendment",
        description: "Proposed changes to data privacy regulations",
        source: "Congress.gov",
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        priority: "medium",
        url: "https://www.congress.gov"
      },
      {
        id: "4",
        type: "news",
        title: "Circuit Split on Arbitration Clauses",
        description: "9th and 5th Circuits disagree on enforceability standards",
        source: "Law360",
        timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
        priority: "high",
      },
      {
        id: "5",
        type: "market",
        title: "Legal Tech Funding Reaches Record High",
        description: "$2.3B invested in Q1 2026, AI tools lead growth",
        source: "Bloomberg Law",
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        priority: "low",
      },
      {
        id: "6",
        type: "alert",
        title: "Emergency Motion Filed in Related Case",
        description: "Opposing counsel seeks expedited hearing",
        source: "Case Alert",
        timestamp: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
        priority: "high",
      },
    ];

    setFeed(mockFeed);

    // Simulate live updates
    const interval = setInterval(() => {
      if (isLive) {
        // Add a new random item every 30 seconds
        const types: IntelligenceItem["type"][] = ["alert", "news", "filing", "legislation", "market"];
        const priorities: IntelligenceItem["priority"][] = ["high", "medium", "low"];
        const newItem: IntelligenceItem = {
          id: Date.now().toString(),
          type: types[Math.floor(Math.random() * types.length)],
          title: "New Intelligence Update",
          description: "Real-time monitoring detected a relevant event",
          source: "Live Feed",
          timestamp: new Date(),
          priority: priorities[Math.floor(Math.random() * priorities.length)],
        };
        setFeed(prev => [newItem, ...prev].slice(0, 20)); // Keep last 20 items
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isLive]);

  const getTypeIcon = (type: IntelligenceItem["type"]) => {
    switch (type) {
      case "alert": return <AlertCircle className="h-4 w-4" />;
      case "news": return <FileText className="h-4 w-4" />;
      case "filing": return <Gavel className="h-4 w-4" />;
      case "legislation": return <Scale className="h-4 w-4" />;
      case "market": return <TrendingUp className="h-4 w-4" />;
      default: return <Radio className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: IntelligenceItem["type"]) => {
    switch (type) {
      case "alert": return "text-destructive";
      case "news": return "text-primary";
      case "filing": return "text-warning";
      case "legislation": return "text-success";
      case "market": return "text-muted-foreground";
      default: return "text-muted-foreground";
    }
  };

  const getPriorityBadge = (priority: IntelligenceItem["priority"]) => {
    switch (priority) {
      case "high": return <Badge variant="destructive" className="text-xs">High</Badge>;
      case "medium": return <Badge variant="secondary" className="text-xs">Medium</Badge>;
      case "low": return <Badge variant="outline" className="text-xs">Low</Badge>;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <Card className="panel">
      <CardHeader className="panel-header">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="panel-title">
              <Radio className="h-5 w-5 text-primary" />
              Live Intelligence Feed
              {isLive && (
                <span className="ml-3 flex items-center gap-2 text-sm font-normal text-success">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  LIVE
                </span>
              )}
            </CardTitle>
            <CardDescription className="panel-description">
              Real-time legal intelligence and monitoring
            </CardDescription>
          </div>
          <button
            onClick={() => setIsLive(!isLive)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLive ? "Pause" : "Resume"}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {feed.map((item) => (
              <div
                key={item.id}
                className="group p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${getTypeColor(item.type)}`}>
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">
                        {item.title}
                      </h4>
                      {getPriorityBadge(item.priority)}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{item.source}</span>
                        <span className="font-mono">{formatTimestamp(item.timestamp)}</span>
                      </div>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
