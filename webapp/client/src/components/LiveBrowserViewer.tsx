import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Monitor,
  Play,
  Square,
  Download,
  Maximize2,
  Minimize2,
  Activity,
  Clock,
  MousePointer,
  Type,
  Navigation,
  Scroll,
  Database,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

interface BrowserAction {
  type: 'navigate' | 'click' | 'type' | 'scroll' | 'extract' | 'screenshot';
  timestamp: Date;
  description: string;
  selector?: string;
  value?: string;
  url?: string;
  result?: any;
  screenshot?: string;
}

interface LiveBrowserViewerProps {
  sessionId: string;
  onClose?: () => void;
  className?: string;
}

export function LiveBrowserViewer({ sessionId, onClose, className }: LiveBrowserViewerProps) {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [actions, setActions] = useState<BrowserAction[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const actionsEndRef = useRef<HTMLDivElement>(null);

  const handleDownloadRecording = async () => {
    try {
      // Request recording URL from server
      const response = await fetch(`/api/browser-automation/recording/${sessionId}`);
      const data = await response.json();
      
      if (data.url) {
        // Create download link
        const link = document.createElement('a');
        link.href = data.url;
        link.download = `session-${sessionId}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Failed to download recording:', error);
    }
  };

  useEffect(() => {
    // Connect to Socket.IO
    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[LiveBrowserViewer] Connected to Socket.IO');
      setIsConnected(true);
      
      // Join browser session room
      newSocket.emit('browser:join-session', sessionId);
    });

    newSocket.on('disconnect', () => {
      console.log('[LiveBrowserViewer] Disconnected from Socket.IO');
      setIsConnected(false);
    });

    // Listen for screenshot updates
    newSocket.on('browser:screenshot', (data: { screenshot: string; timestamp: Date }) => {
      setScreenshot(data.screenshot);
    });

    // Listen for actions
    newSocket.on('browser:action', (action: BrowserAction) => {
      setActions((prev) => [...prev, action]);
    });

    // Listen for action completion
    newSocket.on('browser:action-complete', (action: BrowserAction) => {
      setActions((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0) {
          updated[lastIndex] = { ...updated[lastIndex], ...action };
        }
        return updated;
      });

      // Update screenshot if provided
      if (action.screenshot) {
        setScreenshot(action.screenshot);
      }
    });

    // Listen for recording events
    newSocket.on('browser:recording-started', () => {
      setIsRecording(true);
    });

    newSocket.on('browser:recording-stopped', () => {
      setIsRecording(false);
    });

    return () => {
      newSocket.emit('browser:leave-session', sessionId);
      newSocket.disconnect();
    };
  }, [sessionId]);

  // Auto-scroll to latest action
  useEffect(() => {
    actionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [actions]);

  const getActionIcon = (type: BrowserAction['type']) => {
    switch (type) {
      case 'navigate':
        return <Navigation className="h-4 w-4" />;
      case 'click':
        return <MousePointer className="h-4 w-4" />;
      case 'type':
        return <Type className="h-4 w-4" />;
      case 'scroll':
        return <Scroll className="h-4 w-4" />;
      case 'extract':
        return <Database className="h-4 w-4" />;
      case 'screenshot':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActionColor = (type: BrowserAction['type']) => {
    switch (type) {
      case 'navigate':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'click':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'type':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'scroll':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'extract':
        return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">Live Browser Viewer</h3>
            <p className="text-sm text-muted-foreground">Session: {sessionId.slice(0, 8)}...</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
            <div className={cn("h-2 w-2 rounded-full", isConnected ? "bg-green-500 animate-pulse" : "bg-gray-500")} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          {isRecording && (
            <Badge variant="destructive" className="gap-1">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Recording
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadRecording}
            disabled={isRecording}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download Recording
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={cn("flex flex-1 overflow-hidden", isFullscreen ? "flex-col" : "")}>
        {/* Browser Viewport */}
        <div className={cn("flex-1 bg-muted/30 flex items-center justify-center p-4", isFullscreen ? "h-2/3" : "")}>
          {screenshot ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={screenshot}
                alt="Browser viewport"
                className="max-w-full max-h-full object-contain rounded-lg border shadow-lg"
              />
              <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-md text-xs font-mono">
                Live
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Waiting for browser session...</p>
              <p className="text-sm">The live view will appear here once the browser starts</p>
            </div>
          )}
        </div>

        {/* Action Log */}
        <div className={cn("border-l", isFullscreen ? "h-1/3" : "w-96")}>
          <Card className="h-full rounded-none border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Action Log
                <Badge variant="secondary" className="ml-auto">
                  {actions.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100%-4rem)]">
                <div className="space-y-2 p-4">
                  {actions.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      No actions yet
                    </div>
                  ) : (
                    actions.map((action, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-lg border transition-all hover:shadow-sm",
                          getActionColor(action.type)
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">{getActionIcon(action.type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs font-mono">
                                {action.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(action.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm font-medium break-words">{action.description}</p>
                            {action.selector && (
                              <p className="text-xs text-muted-foreground mt-1 font-mono break-all">
                                {action.selector}
                              </p>
                            )}
                            {action.url && (
                              <p className="text-xs text-muted-foreground mt-1 break-all">
                                → {action.url}
                              </p>
                            )}
                            {action.result && (
                              <details className="mt-2">
                                <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                                  View extracted data
                                </summary>
                                <pre className="text-xs mt-2 p-2 bg-background rounded border overflow-x-auto">
                                  {JSON.stringify(action.result, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={actionsEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
