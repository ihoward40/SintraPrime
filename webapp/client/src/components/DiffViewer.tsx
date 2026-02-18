import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Download, RotateCcw, SplitSquareHorizontal, FileText } from "lucide-react";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { formatDistanceToNow } from "date-fns";
import { trpc } from "@/lib/trpc";

type DiffViewerProps = {
  documentId: number;
  onClose: () => void;
};

export default function DiffViewer({ documentId, onClose }: DiffViewerProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [compareVersionId, setCompareVersionId] = useState<number | null>(null);
  const [splitView, setSplitView] = useState(true);

  // Fetch document versions
  const { data: versions = [] } = trpc.documentVersions.list.useQuery({ documentId });
  
  // Fetch current document
  const { data: document } = trpc.documents.get.useQuery({ id: documentId });

  // Restore version mutation
  const restoreVersion = trpc.documentVersions.restore.useMutation({
    onSuccess: () => {
      onClose();
    },
  });

  const currentVersion = versions.find((v: any) => v.id === selectedVersionId);
  const compareVersion = versions.find((v: any) => v.id === compareVersionId);

  const oldContent = compareVersion?.content || document?.content || "";
  const newContent = currentVersion?.content || document?.content || "";

  const handleRestore = () => {
    if (selectedVersionId && window.confirm("Are you sure you want to restore this version? This will create a new version with this content.")) {
      restoreVersion.mutate({ versionId: selectedVersionId, documentId });
    }
  };

  const handleExport = () => {
    const content = `# Document Version Comparison\n\n## Old Version\n${compareVersion?.createdAt ? `Created: ${new Date(compareVersion.createdAt).toLocaleString()}` : "Current"}\n\n${oldContent}\n\n---\n\n## New Version\n${currentVersion?.createdAt ? `Created: ${new Date(currentVersion.createdAt).toLocaleString()}` : "Current"}\n\n${newContent}`;
    
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `version-comparison-${Date.now()}.md`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <FileText className="h-5 w-5" />
          <h2 className="font-semibold">Version Comparison</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSplitView(!splitView)}
          >
            <SplitSquareHorizontal className="h-4 w-4 mr-2" />
            {splitView ? "Unified" : "Split"} View
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {selectedVersionId && (
            <Button variant="default" size="sm" onClick={handleRestore}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore Version
            </Button>
          )}
        </div>
      </div>

      {/* Version Selectors */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-muted/50">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Compare From</label>
          <Select
            value={compareVersionId?.toString() || "current"}
            onValueChange={(v) => setCompareVersionId(v === "current" ? null : parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Current</Badge>
                  <span>Latest Version</span>
                </div>
              </SelectItem>
              {versions.map((version: any) => (
                <SelectItem key={version.id} value={version.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">v{version.versionNumber}</span>
                    <span>{formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Compare To</label>
          <Select
            value={selectedVersionId?.toString() || "current"}
            onValueChange={(v) => setSelectedVersionId(v === "current" ? null : parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Current</Badge>
                  <span>Latest Version</span>
                </div>
              </SelectItem>
              {versions.map((version: any) => (
                <SelectItem key={version.id} value={version.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">v{version.versionNumber}</span>
                    <span>{formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Diff Viewer */}
      <div className="flex-1 overflow-auto">
        <ReactDiffViewer
          oldValue={oldContent}
          newValue={newContent}
          splitView={splitView}
          compareMethod={DiffMethod.WORDS}
          leftTitle={compareVersion ? `Version ${compareVersion.versionNumber}` : "Current Version"}
          rightTitle={currentVersion ? `Version ${currentVersion.versionNumber}` : "Current Version"}
          styles={{
            variables: {
              light: {
                diffViewerBackground: "#ffffff",
                diffViewerColor: "#212529",
                addedBackground: "#e6ffed",
                addedColor: "#24292e",
                removedBackground: "#ffeef0",
                removedColor: "#24292e",
                wordAddedBackground: "#acf2bd",
                wordRemovedBackground: "#fdb8c0",
                addedGutterBackground: "#cdffd8",
                removedGutterBackground: "#ffdce0",
                gutterBackground: "#f7f7f7",
                gutterBackgroundDark: "#f3f1f1",
                highlightBackground: "#fffbdd",
                highlightGutterBackground: "#fff5b1",
              },
              dark: {
                diffViewerBackground: "#0d1117",
                diffViewerColor: "#c9d1d9",
                addedBackground: "#0d4429",
                addedColor: "#c9d1d9",
                removedBackground: "#5c0d11",
                removedColor: "#c9d1d9",
                wordAddedBackground: "#1a7f37",
                wordRemovedBackground: "#da3633",
                addedGutterBackground: "#0d4429",
                removedGutterBackground: "#5c0d11",
                gutterBackground: "#161b22",
                gutterBackgroundDark: "#0d1117",
                highlightBackground: "#6e5a00",
                highlightGutterBackground: "#6e5a00",
              },
            },
          }}
          useDarkTheme={window.document.documentElement.classList.contains("dark")}
        />
      </div>
    </Card>
  );
}
