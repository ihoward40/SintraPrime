import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Download,
  FileText,
  AlertCircle,
  Play
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AutomationResult {
  id: number;
  sessionId: string;
  demoType: string;
  resultData: string | null;
  status: "running" | "completed" | "failed";
  errorMessage: string | null;
  recordingUrl: string | null;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
}

interface ResultDetailModalProps {
  result: AutomationResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResultDetailModal({ result, open, onOpenChange }: ResultDetailModalProps) {
  if (!result) return null;

  const getStatusIcon = () => {
    switch (result.status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "running":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = () => {
    switch (result.status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "running":
        return <Badge variant="secondary" className="bg-blue-500">Running</Badge>;
    }
  };

  const getDemoTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "web-scraping": "Web Scraping",
      "document-generation": "Document Generation",
      "video-creation": "Video Creation",
      "full-workflow": "Full Workflow"
    };
    return labels[type] || type;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const parseResultData = () => {
    if (!result.resultData) return null;
    try {
      return JSON.parse(result.resultData);
    } catch {
      return result.resultData;
    }
  };

  const resultData = parseResultData();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <DialogTitle className="text-2xl">Automation Result Details</DialogTitle>
                <DialogDescription className="mt-1">
                  Session ID: {result.sessionId}
                </DialogDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="data">Result Data</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="recording">Recording</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Demo Type</span>
                </div>
                <p className="text-lg font-medium">{getDemoTypeLabel(result.demoType)}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Duration</span>
                </div>
                <p className="text-lg font-medium">{formatDuration(result.duration)}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Started</span>
                </div>
                <p className="text-sm">
                  {new Date(result.startedAt).toLocaleString()}
                  <span className="text-muted-foreground ml-2">
                    ({formatDistanceToNow(new Date(result.startedAt), { addSuffix: true })})
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Completed</span>
                </div>
                <p className="text-sm">
                  {result.completedAt 
                    ? new Date(result.completedAt).toLocaleString()
                    : "In progress..."}
                </p>
              </div>
            </div>

            {result.errorMessage && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">Error Details</h4>
                    <ScrollArea className="h-32">
                      <pre className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap font-mono">
                        {result.errorMessage}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="data" className="mt-4">
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              {resultData ? (
                typeof resultData === "object" ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {JSON.stringify(resultData, null, 2)}
                  </pre>
                ) : (
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{resultData}</p>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No result data available</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div className="w-0.5 h-16 bg-border" />
                </div>
                <div className="flex-1 pt-0">
                  <p className="font-medium">Automation Started</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(result.startedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Session initialized with ID: {result.sessionId}
                  </p>
                </div>
              </div>

              {result.status === "running" && (
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                  </div>
                  <div className="flex-1 pt-0">
                    <p className="font-medium">Execution in Progress</p>
                    <p className="text-sm text-muted-foreground">
                      Currently running automation tasks...
                    </p>
                  </div>
                </div>
              )}

              {result.completedAt && (
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${
                      result.status === "completed" ? "bg-green-500" : "bg-red-500"
                    }`} />
                  </div>
                  <div className="flex-1 pt-0">
                    <p className="font-medium">
                      {result.status === "completed" ? "Completed Successfully" : "Failed"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(result.completedAt).toLocaleString()}
                    </p>
                    {result.duration && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Total duration: {formatDuration(result.duration)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recording" className="mt-4">
            {result.recordingUrl ? (
              <div className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Play className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Session recording available for download
                    </p>
                    <Button
                      onClick={() => result.recordingUrl && window.open(result.recordingUrl, "_blank")}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Recording (MP4)
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Recording captures the entire browser automation session
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center space-y-2">
                  <AlertCircle className="h-12 w-12 mx-auto" />
                  <p>No recording available for this session</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
