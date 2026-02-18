import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Globe, ExternalLink, RefreshCw, Loader2 } from "lucide-react";

type IframeStatus = "idle" | "loading" | "loaded" | "blocked";

export default function BrowserPanel() {
  const [url, setUrl] = useState("https://www.law.cornell.edu");
  const [inputUrl, setInputUrl] = useState("https://www.law.cornell.edu");
  const [status, setStatus] = useState<IframeStatus>("idle" as IframeStatus);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  const handleLoad = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setStatus("loaded");
  };

  const handleError = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    setStatus("blocked");
  };

  const loadUrl = (targetUrl: string) => {
    if (!targetUrl) return;
    
    setStatus("loading");
    setUrl(targetUrl);
    setInputUrl(targetUrl);

    // Set timeout to detect blocked iframes
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    loadTimeoutRef.current = setTimeout(() => {
      if (status === "loading") {
        setStatus("blocked");
      }
    }, 3000);
  };

  const handleGo = () => {
    loadUrl(inputUrl);
  };

  const handleRefresh = () => {
    loadUrl(url);
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank");
  };

  return (
    <Card className="bg-background border-border overflow-hidden h-full flex flex-col">
      {/* Browser Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
        <Globe className="h-4 w-4 text-primary shrink-0" />
        <Input
          type="url"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGo()}
          placeholder="Enter URL..."
          className="flex-1 h-8 text-xs"
        />
        <Button size="sm" variant="secondary" onClick={handleGo}>
          Go
        </Button>
        <Button size="sm" variant="ghost" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleOpenExternal}>
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {/* Browser Content */}
      <div className="flex-1 relative bg-muted/10">
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {status === "blocked" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background z-10 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
              <Globe className="h-8 w-8 text-yellow-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Site Blocks Embedding</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Due to X-Frame-Options security policy, this website cannot be displayed in an iframe.
            </p>
            <Button onClick={handleOpenExternal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        )}

        {status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Enter a URL to start browsing
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-none"
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </Card>
  );
}
