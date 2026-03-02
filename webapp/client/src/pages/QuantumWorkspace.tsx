import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef, useEffect } from "react";
import { 
  Globe, Link2, StickyNote, Maximize2, Minimize2, Plus, Trash2, ExternalLink, 
  AlertTriangle, Search, FolderPlus, Download, Camera, Archive, FileText,
  Loader2, AlertCircle, Folder, Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";
import { useTierGate } from "@/hooks/useTierGate";
import UpgradePrompt from "@/components/UpgradePrompt";
import { trpc } from "@/lib/trpc";


type Bookmark = {
  id: string;
  url: string;
  title: string;
  notes: string;
  timestamp: number;
  folder?: string;
  caseId?: number;
};

type IframeStatus = "loading" | "loaded" | "blocked" | "error";

export default function QuantumWorkspace() {
  const { tier, canAccess, requiredTier } = useTierGate();
  const [leftUrl, setLeftUrl] = useState("");
  const [rightUrl, setRightUrl] = useState("");
  const [leftInput, setLeftInput] = useState("https://www.law.cornell.edu");
  const [rightInput, setRightInput] = useState("https://scholar.google.com");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [newNote, setNewNote] = useState("");
  const [expandedPanel, setExpandedPanel] = useState<"left" | "right" | null>(null);
  const [leftStatus, setLeftStatus] = useState<IframeStatus>("loading");
  const [rightStatus, setRightStatus] = useState<IframeStatus>("loading");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [newFolder, setNewFolder] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<number | undefined>();
  
  const leftIframeRef = useRef<HTMLIFrameElement | null>(null);
  const rightIframeRef = useRef<HTMLIFrameElement | null>(null);

  const { data: cases } = trpc.cases.list.useQuery();

  // Get unique folders from bookmarks
  // FIXED: Added explicit Array.isArray guard before calling .map() (Line 55)
  // This prevents "undefined.map is not a function" error when bookmarks is undefined
  const safeBookmarks = Array.isArray(bookmarks) ? bookmarks : [];
  const folders = Array.from(new Set(safeBookmarks.map(b => b.folder).filter(Boolean))) as string[];

  // Detect iframe load status
  useEffect(() => {
    if (leftUrl) {
      setLeftStatus("loading");
      const timer = setTimeout(() => {
        try {
          if (leftIframeRef.current) {
            // Try to access iframe content to detect blocking
            const iframeDoc = leftIframeRef.current.contentDocument;
            if (iframeDoc) {
              setLeftStatus("loaded");
            } else {
              setLeftStatus("blocked");
            }
          }
        } catch (e) {
          setLeftStatus("blocked");
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [leftUrl]);

  useEffect(() => {
    if (rightUrl) {
      setRightStatus("loading");
      const timer = setTimeout(() => {
        try {
          if (rightIframeRef.current) {
            const iframeDoc = rightIframeRef.current.contentDocument;
            if (iframeDoc) {
              setRightStatus("loaded");
            } else {
              setRightStatus("blocked");
            }
          }
        } catch (e) {
          setRightStatus("blocked");
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [rightUrl]);

  const navigateLeft = () => {
    const url = leftInput.startsWith("http") ? leftInput : `https://${leftInput}`;
    setLeftUrl(url);
  };

  const navigateRight = () => {
    const url = rightInput.startsWith("http") ? rightInput : `https://${rightInput}`;
    setRightUrl(url);
  };

  const addBookmark = (url: string, side: string) => {
    if (!url) {
      toast.error("No URL to bookmark");
      return;
    }
    const bookmark: Bookmark = {
      id: `bm-${Date.now()}`,
      url,
      title: `${side} Research - ${new URL(url).hostname}`,
      notes: newNote,
      timestamp: Date.now(),
      folder: selectedFolder !== "all" ? selectedFolder : undefined,
      caseId: selectedCaseId,
    };
    setBookmarks(prev => [bookmark, ...prev]);
    setNewNote("");
    toast.success("Bookmark saved");
  };

  const removeBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    toast.success("Bookmark removed");
  };

  const createFolder = () => {
    if (!newFolder.trim()) {
      toast.error("Folder name cannot be empty");
      return;
    }
    if (folders.includes(newFolder)) {
      toast.error("Folder already exists");
      return;
    }
    setSelectedFolder(newFolder);
    setNewFolder("");
    toast.success(`Folder "${newFolder}" created`);
  };

  const exportBookmarksToPDF = () => {
    toast.info("PDF export feature coming soon");
  };

  const captureScreenshot = (panel: "left" | "right") => {
    toast.info("Screenshot capture feature coming soon");
  };

  const archiveWebpage = (url: string) => {
    toast.info("Webpage archiving feature coming soon");
  };

  const generateCitation = (url: string) => {
    try {
      const urlObj = new URL(url);
      const citation = `${urlObj.hostname}. Retrieved ${new Date().toLocaleDateString()} from ${url}`;
      navigator.clipboard.writeText(citation);
      toast.success("Citation copied to clipboard");
    } catch (e) {
      toast.error("Invalid URL");
    }
  };

  const filteredBookmarks = bookmarks.filter(b => {
    const matchesSearch = !searchQuery || 
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === "all" || b.folder === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  const quickLinks = [
    { label: "Cornell Law", url: "https://www.law.cornell.edu" },
    { label: "Google Scholar", url: "https://scholar.google.com" },
    { label: "PACER", url: "https://pacer.uscourts.gov" },
    { label: "SEC EDGAR", url: "https://www.sec.gov/cgi-bin/browse-edgar" },
    { label: "CFPB", url: "https://www.consumerfinance.gov" },
    { label: "FTC", url: "https://www.ftc.gov" },
  ];

  const renderIframePanel = (
    url: string,
    status: IframeStatus,
    iframeRef: React.RefObject<HTMLIFrameElement | null>,
    panel: "left" | "right"
  ) => {
    if (!url) {
      return (
        <div className="flex items-center justify-center text-muted-foreground" style={{ height: "55vh" }}>
          <div className="text-center space-y-2">
            <Globe className="h-12 w-12 mx-auto opacity-30" />
            <p className="text-sm">Enter a URL or click a quick link to start researching</p>
          </div>
        </div>
      );
    }

    if (status === "blocked") {
      return (
        <div className="flex items-center justify-center text-muted-foreground" style={{ height: "55vh" }}>
          <div className="text-center space-y-3 max-w-md px-4">
            <AlertCircle className="h-12 w-12 mx-auto text-yellow-500" />
            <div>
              <p className="text-sm font-medium">This site blocks iframe embedding</p>
              <p className="text-xs text-muted-foreground mt-1">
                Due to X-Frame-Options security policy, this website cannot be displayed in an iframe.
              </p>
            </div>
            <Button
              onClick={() => window.open(url, '_blank')}
              className="mt-2"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full border-0"
          style={{ height: expandedPanel === panel ? "70vh" : "55vh" }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          title={`${panel} research panel`}
          onLoad={() => {
            setTimeout(() => {
              try {
                if (iframeRef.current?.contentDocument) {
                  panel === "left" ? setLeftStatus("loaded") : setRightStatus("loaded");
                }
              } catch (e) {
                panel === "left" ? setLeftStatus("blocked") : setRightStatus("blocked");
              }
            }, 500);
          }}
          onError={() => {
            panel === "left" ? setLeftStatus("error") : setRightStatus("error");
          }}
        />
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quantum Workspace</h1>
            <p className="text-muted-foreground">
              Dual-browser research interface with evidence capture
            </p>
          </div>
        </div>

        {!canAccess("quantumWorkspace") && (
          <UpgradePrompt
            feature="Quantum Workspace"
            requiredTier={requiredTier("quantumWorkspace") as "pro" | "coalition" | "enterprise"}
            currentTier={tier}
            description="The dual-browser research interface with evidence capture and quantum linking requires a Pro plan or higher."
          />
        )}

        {canAccess("quantumWorkspace") && (<>

        {/* Info Banner */}
        <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/10">
          <CardContent className="py-3 flex items-start gap-2">
            <Globe className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Quick access buttons open research sites in new browser tabs. Use the dual-browser panels below for side-by-side comparison. Sites that block iframes will automatically show an "Open in New Tab" button.
            </p>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <Button
              key={link.url}
              variant="outline"
              size="sm"
              onClick={() => window.open(link.url, '_blank')}
              className="text-xs"
            >
              <Globe className="h-3 w-3 mr-1" />
              {link.label}
            </Button>
          ))}
        </div>

        {/* Dual Browser Panels */}
        <div className={`grid gap-4 ${expandedPanel ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
          {/* Left Panel */}
          {expandedPanel !== "right" && (
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={leftInput}
                    onChange={(e) => setLeftInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && navigateLeft()}
                    placeholder="Enter URL..."
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={navigateLeft} className="h-8 px-3">Go</Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => addBookmark(leftUrl, "Left")}
                    title="Bookmark this page"
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => captureScreenshot("left")}
                    title="Capture screenshot"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => leftUrl && generateCitation(leftUrl)}
                    title="Generate citation"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  {leftUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      asChild
                    >
                      <a href={leftUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setExpandedPanel(expandedPanel === "left" ? null : "left")}
                  >
                    {expandedPanel === "left" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderIframePanel(leftUrl, leftStatus, leftIframeRef, "left")}
              </CardContent>
            </Card>
          )}

          {/* Right Panel */}
          {expandedPanel !== "left" && (
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={rightInput}
                    onChange={(e) => setRightInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && navigateRight()}
                    placeholder="Enter URL..."
                    className="h-8 text-sm"
                  />
                  <Button size="sm" onClick={navigateRight} className="h-8 px-3">Go</Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => addBookmark(rightUrl, "Right")}
                    title="Bookmark this page"
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => captureScreenshot("right")}
                    title="Capture screenshot"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => rightUrl && generateCitation(rightUrl)}
                    title="Generate citation"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  {rightUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      asChild
                    >
                      <a href={rightUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setExpandedPanel(expandedPanel === "right" ? null : "right")}
                  >
                    {expandedPanel === "right" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderIframePanel(rightUrl, rightStatus, rightIframeRef, "right")}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Research Notes & Bookmarks */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Enhanced Research Notes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Research Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Link to Case (Optional)</label>
                  <Select
                    value={selectedCaseId?.toString() || "none"}
                    onValueChange={(value) => setSelectedCaseId(value === "none" ? undefined : parseInt(value))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select a case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No case</SelectItem>
                      {cases?.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Notes</label>
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note about your research findings..."
                    rows={4}
                    className="text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (leftUrl) addBookmark(leftUrl, "Left");
                      else if (rightUrl) addBookmark(rightUrl, "Right");
                      else toast.error("Navigate to a page first");
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Save with Bookmark
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Bookmarks */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Bookmarks ({filteredBookmarks.length})
                </CardTitle>
                <div className="flex gap-1">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <FolderPlus className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Folder</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input
                          value={newFolder}
                          onChange={(e) => setNewFolder(e.target.value)}
                          placeholder="Folder name..."
                          onKeyDown={(e) => e.key === "Enter" && createFolder()}
                        />
                        <Button onClick={createFolder} className="w-full">
                          Create Folder
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={exportBookmarksToPDF}
                    title="Export to PDF"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search bookmarks..."
                    className="h-8 text-sm pl-7"
                  />
                </div>
                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                  <SelectTrigger className="h-8 w-[140px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Folders</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder} value={folder}>
                        <div className="flex items-center gap-1">
                          <Folder className="h-3 w-3" />
                          {folder}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredBookmarks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No bookmarks yet. Click the link icon to save research URLs.
                  </p>
                ) : (
                  filteredBookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="p-2 border rounded-lg hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <a
                            href={bookmark.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium hover:underline block truncate"
                          >
                            {bookmark.title}
                          </a>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {bookmark.url}
                          </p>
                          {bookmark.notes && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {bookmark.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {bookmark.folder && (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                <Folder className="h-2 w-2 mr-0.5" />
                                {bookmark.folder}
                              </Badge>
                            )}
                            {bookmark.caseId && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1">
                                Case #{bookmark.caseId}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(bookmark.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                          onClick={() => removeBookmark(bookmark.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        </>)}
      </div>
    </DashboardLayout>
  );
}
