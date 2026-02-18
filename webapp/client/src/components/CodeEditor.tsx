import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Code, Save, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CodeEditor() {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [filename, setFilename] = useState("untitled.txt");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save every 30 seconds if content changed
  useEffect(() => {
    if (!content.trim()) return;
    
    const autoSaveTimer = setTimeout(() => {
      handleSave();
    }, 30000); // 30 seconds

    return () => clearTimeout(autoSaveTimer);
  }, [content]);

  const handleSave = async () => {
    if (!content.trim()) return;
    
    setIsSaving(true);
    try {
      // Save as a document in the database
      // For now, just simulate save - full implementation would use documents.create
      await new Promise(resolve => setTimeout(resolve, 500));
      setLastSaved(new Date());
      toast.success(`Saved ${filename}`);
    } catch (error) {
      toast.error("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-background border-border overflow-hidden h-full flex flex-col">
      {/* Editor Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
        <Code className="h-4 w-4 text-primary" />
        <input
          type="text"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          className="text-sm font-mono bg-transparent border-none outline-none flex-1"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>

      {/* Editor Content */}
      <div className="flex-1 relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full border-none resize-none font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder="Start typing..."
        />
      </div>

      {/* Editor Footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Lines: {content.split("\n").length}</span>
          <span>Characters: {content.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-3 w-3" />
          <span>Plain Text</span>
          {lastSaved && (
            <span className="ml-4 text-green-600">• Saved {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
