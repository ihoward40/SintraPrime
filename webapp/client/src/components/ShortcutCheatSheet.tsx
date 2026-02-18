import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Keyboard } from "lucide-react";

interface ShortcutCheatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customShortcuts?: Record<string, string>;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
    customizable?: boolean;
  }>;
}

export function ShortcutCheatSheet({ open, onOpenChange, customShortcuts = {} }: ShortcutCheatSheetProps) {
  const shortcutGroups: ShortcutGroup[] = [
    {
      title: "Navigation",
      shortcuts: [
        { keys: ["⌘", "K"], description: "Open command palette" },
        { keys: ["⌘", "/"], description: "Show this cheat sheet" },
      ],
    },
    {
      title: "Sidebar Sections",
      shortcuts: [
        { 
          keys: ["⌘", customShortcuts['ai-tools'] || "1"], 
          description: "Toggle More AI Tools",
          customizable: true 
        },
        { 
          keys: ["⌘", customShortcuts['power-tools'] || "2"], 
          description: "Toggle Power Tools",
          customizable: true 
        },
        { 
          keys: ["⌘", customShortcuts['case-mgmt'] || "3"], 
          description: "Toggle Case Management",
          customizable: true 
        },
        { 
          keys: ["⌘", customShortcuts['team'] || "4"], 
          description: "Toggle Team & Collaboration",
          customizable: true 
        },
        { 
          keys: ["⌘", customShortcuts['settings'] || "5"], 
          description: "Toggle Settings",
          customizable: true 
        },
      ],
    },
    {
      title: "Search & Favorites",
      shortcuts: [
        { keys: ["⌘", "F"], description: "Focus sidebar search" },
        { keys: ["⌘", "P"], description: "Pin/unpin current page" },
      ],
    },
    {
      title: "General",
      shortcuts: [
        { keys: ["Esc"], description: "Close dialogs/modals" },
        { keys: ["⌘", "S"], description: "Save (where applicable)" },
        { keys: ["⌘", "Z"], description: "Undo" },
        { keys: ["⌘", "⇧", "Z"], description: "Redo" },
      ],
    },
  ];

  const renderKey = (key: string) => (
    <kbd className="inline-flex h-7 min-w-[28px] items-center justify-center rounded border border-border bg-muted px-2 font-mono text-sm font-medium text-muted-foreground">
      {key}
    </kbd>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Quick reference for all available keyboard shortcuts. Customizable shortcuts can be changed in Settings → Keyboard Shortcuts.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {shortcutGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  {group.title}
                  {groupIndex === 1 && (
                    <Badge variant="secondary" className="text-[10px]">
                      Customizable
                    </Badge>
                  )}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm text-foreground">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {renderKey(key)}
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground mx-0.5">+</span>
                            )}
                          </React.Fragment>
                        ))}
                        {shortcut.customizable && (
                          <Badge variant="outline" className="ml-2 text-[9px] px-1.5 py-0">
                            Custom
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {groupIndex < shortcutGroups.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Pro tip:</strong> You can customize sidebar section shortcuts in{" "}
              <span className="font-mono text-foreground">Settings → Keyboard Shortcuts</span>.
              Press{" "}
              <kbd className="inline-flex h-5 items-center rounded border bg-background px-1.5 font-mono text-[10px]">
                ⌘K
              </kbd>{" "}
              to quickly navigate there.
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
