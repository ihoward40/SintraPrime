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
  Loader2, AlertCircle, Folder, Link as LinkIcon, CheckCircle, XCircle, HelpCircle,
  Columns, Save
} from "lucide-react";
import { toast } from "sonner";
import { useTierGate } from "@/hooks/useTierGate";
import UpgradePrompt from "@/components/UpgradePrompt";
import { trpc } from "@/lib/trpc";
import html2canvas from "html2canvas";
import { generateCitationFromUrl, type CitationFormat } from "@/lib/citationGenerator";
import { cn } from "@/lib/utils";

// Site embeddability detection
const EMBEDDABLE_SITES = [
  'wikipedia.org',
  'archive.org',
  'law.justia.com',
  'findlaw.com',
  'oyez.org',
  'supremecourt.gov',
  'courtlistener.com',
  'law.resource.org',
  'law.stackexchange.com'
];

const BLOCKED_SITES = [
  'law.cornell.edu',
  'scholar.google.com',
  'pacer.gov',
  'lexisnexis.com',
  'westlaw.com',
  'bloomberg.com/law',
  'casetext.com',
  'fastcase.com',
  'courts.state',
  'uscourts.gov'
];

type EmbeddabilityStatus = 'allowed' | 'blocked' | 'unknown';

// Legal research sites with embeddability status
const LEGAL_SITES = [
  { name: 'Justia', url: 'https://law.justia.com', embeddable: true, category: 'Case Law' },
  { name: 'CourtListener', url: 'https://www.courtlistener.com', embeddable: true, category: 'Case Law' },
  { name: 'Oyez', url: 'https://www.oyez.org', embeddable: true, category: 'Supreme Court' },
  { name: 'Cornell Law', url: 'https://www.law.cornell.edu', embeddable: false, category: 'Legal Info' },
  { name: 'Google Scholar', url: 'https://scholar.google.com', embeddable: false, category: 'Research' },
  { name: 'PACER', url: 'https://pacer.uscourts.gov', embeddable: false, category: 'Court Filings' },
  { name: 'SEC EDGAR', url: 'https://www.sec.gov/edgar', embeddable: false, category: 'Corporate' },
  { name: 'FTC', url: 'https://www.ftc.gov', embeddable: false, category: 'Regulatory' },
  { name: 'CFPB', url: 'https://www.consumerfinance.gov', embeddable: false, category: 'Consumer' },
  { name: 'FindLaw', url: 'https://www.findlaw.com', embeddable: true, category: 'Legal Info' },
];

function checkEmbeddability(url: string): EmbeddabilityStatus {
  if (!url) return 'unknown';
  try {
    const domain = new URL(url).hostname.toLowerCase();
    if (EMBEDDABLE_SITES.some(site => domain.includes(site))) return 'allowed';
    if (BLOCKED_SITES.some(site => domain.includes(site))) return 'blocked';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function getStatusIcon(status: EmbeddabilityStatus) {
  switch (status) {
    case 'allowed':
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case 'blocked':
      return <XCircle className="h-3 w-3 text-red-500" />;
    default:
      return <HelpCircle className="h-3 w-3 text-yellow-500" />;
  }
}

function getStatusBadge(embeddable: boolean) {
  return embeddable ? (
    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
      <CheckCircle className="h-3 w-3 mr-1" />
      Embeddable
    </Badge>
  ) : (
    <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
      <XCircle className="h-3 w-3 mr-1" />
      New Tab
    </Badge>
  );
}

// Split window manager
async function openInSplitView(url: string) {
  try {
    // Check if Window Management API is available (Chrome 100+)
    if ('getScreenDetails' in window) {
      const screenDetails = await (window as any).getScreenDetails();
      const primary = screenDetails.screens[0];
      
      // Open new window in right half of screen
      window.open(
        url, 
        '_blank', 
        `left=${primary.width / 2},top=0,width=${primary.width / 2},height=${primary.height}`
      );
      toast.success("Opened in split view (right half of screen)");
    } else {
      // Fallback to regular new tab
      window.open(url, '_blank');
      toast.info("Opened in new tab (split view requires Chrome 100+)");
    }
  } catch (error) {
    // Fallback if permission denied
    window.open(url, '_blank');
    toast.info("Opened in new tab");
  }
}

type Bookmark = {
  id: string;
  url: string;
  title: string;
  notes: string;
  timestamp: number;
  folder?: string;
  caseId?: number;
  embeddabilityStatus?: EmbeddabilityStatus;
};

type IframeStatus = "loading" | "loaded" | "error";

type PreflightResult = {
  requestedUrl: string;
  finalUrl: string;
  status: number | null;
  allowed: true | false | null;
  reason: string;
  details?: {
    xFrameOptions?: string | null;
    csp?: string | null;
    frameAncestors?: string | null;
  };
  checkedAt: string;
};

export default function QuantumWorkspaceEnhanced() {
  const { tier, canAccess, requiredTier } = useTierGate();
  const [leftUrl, setLeftUrl] = useState("");
  const [rightUrl, setRightUrl] = useState("");
  const [leftInput, setLeftInput] = useState("https://law.justia.com");
  const [rightInput, setRightInput] = useState("https://www.courtlistener.com");
  // Fetch bookmarks from database
  const { data: dbBookmarks, refetch: refetchBookmarks } = trpc.workspaceBookmarks.list.useQuery();
  const createBookmarkMutation = trpc.workspaceBookmarks.create.useMutation();
  const deleteBookmarkMutation = trpc.workspaceBookmarks.delete.useMutation();
  const updateBookmarkMutation = trpc.workspaceBookmarks.update.useMutation();

  // Convert database bookmarks to local format
  const bookmarks: Bookmark[] = dbBookmarks?.map(b => ({
    id: b.id.toString(),
    url: b.url,
    title: b.title,
    notes: b.notes || "",
    timestamp: b.createdAt.getTime(),
    folder: b.category || undefined,
    embeddabilityStatus: checkEmbeddability(b.url),
  })) || [];
  const [newNote, setNewNote] = useState("");
  const [expandedPanel, setExpandedPanel] = useState<"left" | "right" | null>(null);
  const [leftStatus, setLeftStatus] = useState<IframeStatus>("loading");
  const [rightStatus, setRightStatus] = useState<IframeStatus>("loading");
  const [leftPreflight, setLeftPreflight] = useState<PreflightResult | null>(null);
  const [rightPreflight, setRightPreflight] = useState<PreflightResult | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [newFolder, setNewFolder] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<number | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [quickCaptureUrl, setQuickCaptureUrl] = useState("");
  const [quickCaptureNotes, setQuickCaptureNotes] = useState("");
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  
  const leftIframeRef = useRef<HTMLIFrameElement | null>(null);
  const rightIframeRef = useRef<HTMLIFrameElement | null>(null);

  const { data: cases } = trpc.cases.list.useQuery();

  // Get unique folders and categories
  const folders = Array.from(new Set(bookmarks.map(b => b.folder).filter(Boolean))) as string[];
  const categories = Array.from(new Set(LEGAL_SITES.map(s => s.category)));

  // Iframe header preflight (server-side) + load status
  useEffect(() => {
    if (leftUrl) {
      setLeftStatus("loading");
      setLeftPreflight(null);
      const controller = new AbortController();

      fetch(`/api/iframe-preflight?url=${encodeURIComponent(leftUrl)}`, {
        signal: controller.signal,
      })
        .then(r => r.json())
        .then((data: PreflightResult) => setLeftPreflight(data))
        .catch(() =>
          setLeftPreflight({
            requestedUrl: leftUrl,
            finalUrl: leftUrl,
            status: null,
            allowed: null,
            reason: "FETCH_ERROR",
            checkedAt: new Date().toISOString(),
          })
        );

      return () => controller.abort();
    }
    setLeftPreflight(null);
  }, [leftUrl]);

  useEffect(() => {
    if (rightUrl) {
      setRightStatus("loading");
      setRightPreflight(null);
      const controller = new AbortController();

      fetch(`/api/iframe-preflight?url=${encodeURIComponent(rightUrl)}`, {
        signal: controller.signal,
      })
        .then(r => r.json())
        .then((data: PreflightResult) => setRightPreflight(data))
        .catch(() =>
          setRightPreflight({
            requestedUrl: rightUrl,
            finalUrl: rightUrl,
            status: null,
            allowed: null,
            reason: "FETCH_ERROR",
            checkedAt: new Date().toISOString(),
          })
        );

      return () => controller.abort();
    }
    setRightPreflight(null);
  }, [rightUrl]);

  const navigateLeft = () => {
    if (leftInput.trim()) {
      let url = leftInput.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      setLeftUrl(url);
      toast.success("Loading left panel...");
    }
  };

  const navigateRight = () => {
    if (rightInput.trim()) {
      let url = rightInput.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      setRightUrl(url);
      toast.success("Loading right panel...");
    }
  };

  const addBookmark = async (url: string, title: string) => {
    if (!url) {
      toast.error("No URL to bookmark");
      return;
    }
    try {
      await createBookmarkMutation.mutateAsync({
        url,
        title,
        notes: newNote,
        category: selectedFolder === "all" ? undefined : selectedFolder,
      });
      await refetchBookmarks();
      setNewNote("");
      toast.success(`Bookmarked: ${title}`);
    } catch (error) {
      toast.error("Failed to save bookmark");
    }
  };

  const deleteBookmark = async (id: string) => {
    try {
      await deleteBookmarkMutation.mutateAsync({ id: parseInt(id) });
      await refetchBookmarks();
      toast.success("Bookmark deleted");
    } catch (error) {
      toast.error("Failed to delete bookmark");
    }
  };

  const createFolder = () => {
    if (newFolder.trim()) {
      toast.success(`Folder "${newFolder}" created`);
      setNewFolder("");
    }
  };

  const captureScreenshot = async (panel: "left" | "right") => {
    const iframeRef = panel === "left" ? leftIframeRef : rightIframeRef;
    const url = panel === "left" ? leftUrl : rightUrl;
    
    if (!iframeRef.current) {
      toast.error("No content to capture");
      return;
    }

    try {
      toast.info("Capturing screenshot...");
      
      // Try to capture iframe content
      let canvas;
      try {
        const iframeDoc = iframeRef.current.contentDocument;
        if (iframeDoc && iframeDoc.body) {
          // If we can access iframe content (same-origin)
          canvas = await html2canvas(iframeDoc.body, {
            allowTaint: true,
            useCORS: true,
            logging: false,
          });
        } else {
          throw new Error("Cannot access iframe content");
        }
      } catch (iframeError) {
        // Fallback: capture the iframe container itself
        const container = iframeRef.current.parentElement;
        if (container) {
          canvas = await html2canvas(container, {
            allowTaint: true,
            useCORS: true,
            logging: false,
          });
        } else {
          throw new Error("Cannot capture screenshot");
        }
      }

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `quantum-workspace-${panel}-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success("Screenshot saved!");
        }
      });
    } catch (error) {
      console.error("Screenshot error:", error);
      toast.error("Failed to capture screenshot. This may be due to cross-origin restrictions.");
    }
  };

  const [citationFormat, setCitationFormat] = useState<CitationFormat>("bluebook");
  const [showCitationDialog, setShowCitationDialog] = useState(false);
  const [generatedCitation, setGeneratedCitation] = useState("");

  const generateCitation = (url: string, title?: string) => {
    if (!url) {
      toast.error("No URL to generate citation");
      return;
    }
    try {
      const pageTitle = title || new URL(url).hostname;
      const citation = generateCitationFromUrl(url, pageTitle, citationFormat);
      setGeneratedCitation(citation);
      setShowCitationDialog(true);
    } catch (error) {
      toast.error("Failed to generate citation");
    }
  };

  const copyCitation = () => {
    navigator.clipboard.writeText(generatedCitation);
    toast.success("Citation copied to clipboard!");
  };

  const archiveBookmark = (id: string) => {
    toast.info("Archiving coming soon");
  };

  const exportBookmarks = () => {
    const data = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quantum-workspace-bookmarks.json';
    a.click();
    toast.success("Bookmarks exported");
  };

  // Quick capture for external tabs
  const openQuickCapture = (url: string) => {
    setQuickCaptureUrl(url);
    setShowQuickCapture(true);
  };

  const saveQuickCapture = async () => {
    if (quickCaptureUrl) {
      try {
        await createBookmarkMutation.mutateAsync({
          url: quickCaptureUrl,
          title: new URL(quickCaptureUrl).hostname,
          notes: quickCaptureNotes,
        });
        await refetchBookmarks();
        setQuickCaptureUrl("");
        setQuickCaptureNotes("");
        setShowQuickCapture(false);
        toast.success("Research captured!");
      } catch (error) {
        toast.error("Failed to save bookmark");
      }
    }
  };

  // Filter bookmarks
  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = !searchQuery || 
      bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = selectedFolder === "all" || bookmark.folder === selectedFolder;
    return matchesSearch && matchesFolder;
  });

  // Filter legal sites by category
  const filteredLegalSites = selectedCategory === "all" 
    ? LEGAL_SITES 
    : LEGAL_SITES.filter(site => site.category === selectedCategory);

  const renderBrowserPanel = (
    panel: "left" | "right",
    url: string,
    status: IframeStatus,
    iframeRef: React.RefObject<HTMLIFrameElement | null>,
    preflight: PreflightResult | null
  ) => {
    if (!url) {
      return (
        <div className="flex items-center justify-center text-muted-foreground h-[55vh]">
          <div className="text-center space-y-2">
            <Globe className="h-12 w-12 mx-auto opacity-50" />
            <p className="text-sm">Enter a URL or click a quick link to start researching</p>
          </div>
        </div>
      );
    }

    if (!preflight) {
      return (
        <div className="flex items-center justify-center text-muted-foreground h-[55vh]">
          <div className="text-center space-y-3 max-w-md px-4">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-sm">Checking preview compatibility...</p>
            <Button
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              variant="outline"
              size="sm"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      );
    }

    if (preflight.allowed === false) {
      return (
        <div className="flex items-center justify-center text-muted-foreground h-[55vh]">
          <div className="text-center space-y-3 max-w-md px-4">
            <AlertCircle className="h-12 w-12 mx-auto text-yellow-500" />
            <div>
              <p className="text-sm font-medium">This site disallows embedding (security policy)</p>
              <p className="text-xs text-muted-foreground mt-1">
                Open in a new tab for the full experience.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => window.open(url, '_blank')}
                className="mt-2"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
            <Button
              onClick={() => openQuickCapture(url)}
              variant="ghost"
              size="sm"
              className="mt-2"
            >
              <Save className="h-4 w-4 mr-2" />
              Quick Capture
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        {preflight.allowed === null && (
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-2 bg-background/90 px-3 py-2 text-xs text-muted-foreground">
            <span>Preview may be unavailable. Open in a new tab.</span>
            <Button
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              variant="outline"
              size="sm"
              className="h-7"
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Open in New Tab
            </Button>
          </div>
        )}
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={url}
          className={cn(
            "w-full border-0",
            expandedPanel === panel ? "h-[70vh]" : "h-[55vh]"
          )}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          title={`${panel} research panel`}
          onLoad={() => {
            panel === "left" ? setLeftStatus("loaded") : setRightStatus("loaded");
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
              Enhanced dual-browser research with smart detection and split-view
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
            <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <p>
                <strong>Smart Detection:</strong> Sites are automatically checked for iframe compatibility. 
                {getStatusIcon('allowed')} = Embeddable, {getStatusIcon('blocked')} = Opens in new tab, {getStatusIcon('unknown')} = Unknown
              </p>
              <p>
                <strong>Split View:</strong> Blocked sites can open in split-screen mode (Chrome 100+) for side-by-side research.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Toolbar */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Legal Research Sites</CardTitle>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex flex-wrap gap-2">
              {filteredLegalSites.map((site) => (
                <Button
                  key={site.url}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (site.embeddable) {
                      setLeftInput(site.url);
                      setLeftUrl(site.url);
                    } else {
                      openInSplitView(site.url);
                    }
                  }}
                  className="text-xs flex items-center gap-2"
                >
                  {getStatusIcon(site.embeddable ? 'allowed' : 'blocked')}
                  <span>{site.name}</span>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                    {site.category}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dual Browser Panels */}
        <div className={`grid gap-4 ${expandedPanel ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
          {/* Left Panel */}
          {expandedPanel !== "right" && (
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(checkEmbeddability(leftInput))}
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
                    onClick={() => leftUrl && window.open(leftUrl, "_blank", "noopener,noreferrer")}
                    disabled={!leftUrl}
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => addBookmark(leftUrl, "Left Panel")}
                    title="Bookmark this page"
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setExpandedPanel(expandedPanel === "left" ? null : "left")}
                    title={expandedPanel === "left" ? "Restore" : "Maximize"}
                  >
                    {expandedPanel === "left" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderBrowserPanel("left", leftUrl, leftStatus, leftIframeRef, leftPreflight)}
              </CardContent>
            </Card>
          )}

          {/* Right Panel */}
          {expandedPanel !== "left" && (
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(checkEmbeddability(rightInput))}
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
                    onClick={() => rightUrl && window.open(rightUrl, "_blank", "noopener,noreferrer")}
                    disabled={!rightUrl}
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => addBookmark(rightUrl, "Right Panel")}
                    title="Bookmark this page"
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => setExpandedPanel(expandedPanel === "right" ? null : "right")}
                    title={expandedPanel === "right" ? "Restore" : "Maximize"}
                  >
                    {expandedPanel === "right" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderBrowserPanel("right", rightUrl, rightStatus, rightIframeRef, rightPreflight)}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Research Notes Section */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                Bookmarks ({filteredBookmarks.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={exportBookmarks}>
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bookmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger className="w-[150px] h-9 text-sm">
                  <Folder className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="All folders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All folders</SelectItem>
                  {folders.map(folder => (
                    <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bookmarks List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {filteredBookmarks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <LinkIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No bookmarks yet. Click the bookmark icon to save research.</p>
                </div>
              ) : (
                filteredBookmarks.map((bookmark) => (
                  <Card key={bookmark.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {bookmark.embeddabilityStatus && getStatusIcon(bookmark.embeddabilityStatus)}
                          <a
                            href={bookmark.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline truncate"
                          >
                            {bookmark.title}
                          </a>
                          {bookmark.folder && (
                            <Badge variant="secondary" className="text-xs">
                              {bookmark.folder}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{bookmark.url}</p>
                        {bookmark.notes && (
                          <p className="text-xs mt-1">{bookmark.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(bookmark.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => generateCitation(bookmark.url, bookmark.title)}
                          title="Generate citation"
                        >
                          <FileText className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteBookmark(bookmark.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Capture Dialog */}
        <Dialog open={showQuickCapture} onOpenChange={setShowQuickCapture}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Quick Capture</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">URL</label>
                <Input
                  value={quickCaptureUrl}
                  onChange={(e) => setQuickCaptureUrl(e.target.value)}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={quickCaptureNotes}
                  onChange={(e) => setQuickCaptureNotes(e.target.value)}
                  placeholder="Add your research notes..."
                  className="mt-1"
                  rows={4}
                />
              </div>
              <Button onClick={saveQuickCapture} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save Research
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Citation Generator Dialog */}
        <Dialog open={showCitationDialog} onOpenChange={setShowCitationDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generated Citation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Format</label>
                <Select value={citationFormat} onValueChange={(v) => setCitationFormat(v as CitationFormat)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bluebook">Bluebook</SelectItem>
                    <SelectItem value="apa">APA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Citation</label>
                <Textarea
                  value={generatedCitation}
                  readOnly
                  className="mt-1 font-mono text-sm"
                  rows={4}
                />
              </div>
              <Button onClick={copyCitation} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        </>)}
      </div>
    </DashboardLayout>
  );
}
