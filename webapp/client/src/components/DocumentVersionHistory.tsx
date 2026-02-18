import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";

interface DocumentVersionHistoryProps {
  documentId: number;
  currentContent: string;
}

export function DocumentVersionHistory({ documentId, currentContent }: DocumentVersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const { data: versions, isLoading } = trpc.documentVersions.list.useQuery({ documentId });
  const restoreVersion = trpc.documentVersions.restore.useMutation({
    onSuccess: () => {
      toast.success("Version restored successfully");
      setSelectedVersion(null);
      window.location.reload(); // Reload to show updated content
    },
    onError: () => {
      toast.error("Failed to restore version");
    },
  });

  const handleRestore = (versionId: number) => {
    if (confirm("Are you sure you want to restore this version? This will overwrite the current content.")) {
      restoreVersion.mutate({ versionId, documentId });
    }
  };

  const selectedVersionData = versions?.find(v => v.id === selectedVersion);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading version history...</div>;
  }

  if (!versions || versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>No previous versions available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>{versions.length} version{versions.length !== 1 ? 's' : ''} available</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Version {version.versionNumber}</span>
                    </div>
                    {version.changeSummary && (
                      <p className="text-sm text-muted-foreground mt-1">{version.changeSummary}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(version.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedVersion(version.id);
                        setShowDiff(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestore(version.id)}
                      disabled={restoreVersion.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={showDiff} onOpenChange={setShowDiff}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Version {selectedVersionData?.versionNumber} Preview</DialogTitle>
            <DialogDescription>
              Created {selectedVersionData && new Date(selectedVersionData.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] border rounded-lg p-4">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap">{selectedVersionData?.content}</pre>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiff(false)}>
              Close
            </Button>
            {selectedVersionData && (
              <Button onClick={() => handleRestore(selectedVersionData.id)} disabled={restoreVersion.isPending}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore This Version
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
