import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ["⌘", "K"], description: "Open keyboard shortcuts", category: "Navigation" },
  { keys: ["⌘", "Shift", "R"], description: "Toggle Recent section", category: "Navigation" },
  { keys: ["⌘", "/"], description: "Focus sidebar search", category: "Navigation" },
  { keys: ["⌘", "B"], description: "Toggle sidebar", category: "Navigation" },
  { keys: ["Esc"], description: "Close dialogs/panels", category: "Navigation" },
  
  // Actions
  { keys: ["⌘", "N"], description: "New case", category: "Actions" },
  { keys: ["⌘", "S"], description: "Save current work", category: "Actions" },
  { keys: ["⌘", "Z"], description: "Undo last action", category: "Actions" },
  { keys: ["⌘", "Shift", "Z"], description: "Redo action", category: "Actions" },
  { keys: ["⌘", "P"], description: "Print current page", category: "Actions" },
  
  // AI Tools
  { keys: ["⌘", "1"], description: "Open AI Assistant", category: "AI Tools" },
  { keys: ["⌘", "2"], description: "Open AI Companion", category: "AI Tools" },
  { keys: ["⌘", "3"], description: "Open Agent Zero", category: "AI Tools" },
  { keys: ["⌘", "4"], description: "Open Legal AI Agents", category: "AI Tools" },
  { keys: ["⌘", "5"], description: "Open IKE Tax Agent", category: "AI Tools" },
  
  // Editing
  { keys: ["⌘", "C"], description: "Copy", category: "Editing" },
  { keys: ["⌘", "V"], description: "Paste", category: "Editing" },
  { keys: ["⌘", "X"], description: "Cut", category: "Editing" },
  { keys: ["⌘", "A"], description: "Select all", category: "Editing" },
  { keys: ["⌘", "F"], description: "Find in page", category: "Editing" },
  
  // Case Management
  { keys: ["⌘", "E"], description: "Export case", category: "Case Management" },
  { keys: ["⌘", "I"], description: "Import data", category: "Case Management" },
  { keys: ["⌘", "D"], description: "Delete selected", category: "Case Management" },
  { keys: ["⌘", "R"], description: "Refresh data", category: "Case Management" },
];

interface KeyboardShortcutsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsPanel({ open, onOpenChange }: KeyboardShortcutsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const filteredShortcuts = shortcuts.filter(
    (shortcut) =>
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.keys.some((key) => key.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  const copyAllShortcuts = () => {
    const text = shortcuts
      .map((s) => `${s.keys.join(" + ")}: ${s.description}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("All shortcuts copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Master SintraPrime with these keyboard shortcuts for faster navigation and actions
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyAllShortcuts}
            className="flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy All
              </>
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {categories.map((category) => {
            const categoryShortcuts = filteredShortcuts.filter(
              (s) => s.category === category
            );
            if (categoryShortcuts.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center gap-1">
                            <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground text-xs">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No shortcuts found matching "{searchQuery}"</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          <p>
            <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted border rounded">⌘ K</kbd> anytime to open this panel
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
