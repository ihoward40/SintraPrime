import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Keyboard, RotateCcw, AlertCircle } from "lucide-react";

interface ShortcutConfig {
  id: string;
  label: string;
  defaultKey: string;
  currentKey: string;
  description: string;
}

const defaultShortcuts: ShortcutConfig[] = [
  { id: "ai-tools", label: "More AI Tools", defaultKey: "1", currentKey: "1", description: "Toggle More AI Tools section" },
  { id: "power-tools", label: "Power Tools", defaultKey: "2", currentKey: "2", description: "Toggle Power Tools section" },
  { id: "case-mgmt", label: "Case Management", defaultKey: "3", currentKey: "3", description: "Toggle Case Management section" },
  { id: "team", label: "Team & Collaboration", defaultKey: "4", currentKey: "4", description: "Toggle Team & Collaboration section" },
  { id: "settings", label: "Settings", defaultKey: "5", currentKey: "5", description: "Toggle Settings section" },
];

export default function KeyboardShortcuts() {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>(defaultShortcuts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempKey, setTempKey] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("keyboard-shortcuts");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setShortcuts(parsed);
      } catch (e) {
        console.error("Failed to parse keyboard shortcuts", e);
      }
    }
  }, []);

  const saveShortcuts = (newShortcuts: ShortcutConfig[]) => {
    localStorage.setItem("keyboard-shortcuts", JSON.stringify(newShortcuts));
    setShortcuts(newShortcuts);
    toast.success("Keyboard shortcuts saved");
  };

  const handleEdit = (id: string, currentKey: string) => {
    setEditingId(id);
    setTempKey(currentKey);
  };

  const handleSave = (id: string) => {
    // Check for conflicts
    const conflict = shortcuts.find(
      (s) => s.id !== id && s.currentKey === tempKey
    );

    if (conflict) {
      toast.error(`Shortcut conflict: ${tempKey} is already assigned to "${conflict.label}"`);
      return;
    }

    // Validate key (must be single digit or letter)
    if (!/^[0-9a-zA-Z]$/.test(tempKey)) {
      toast.error("Shortcut must be a single digit (0-9) or letter (a-z)");
      return;
    }

    const updated = shortcuts.map((s) =>
      s.id === id ? { ...s, currentKey: tempKey } : s
    );

    saveShortcuts(updated);
    setEditingId(null);
    setTempKey("");
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempKey("");
  };

  const handleReset = (id: string) => {
    const updated = shortcuts.map((s) =>
      s.id === id ? { ...s, currentKey: s.defaultKey } : s
    );
    saveShortcuts(updated);
  };

  const handleResetAll = () => {
    saveShortcuts(defaultShortcuts);
    toast.success("All shortcuts reset to defaults");
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Keyboard Shortcuts</h1>
        <p className="text-muted-foreground">
          Customize keyboard shortcuts for quick navigation. Use Cmd (Mac) or Ctrl (Windows/Linux) + your chosen key.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Section Toggle Shortcuts
              </CardTitle>
              <CardDescription>
                Quickly expand or collapse sidebar sections with keyboard shortcuts
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetAll}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold">{shortcut.label}</h3>
                    {shortcut.currentKey !== shortcut.defaultKey && (
                      <Badge variant="secondary" className="text-xs">
                        Custom
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {shortcut.description}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {editingId === shortcut.id ? (
                    <>
                      <div className="flex items-center gap-2">
                        <kbd className="px-3 py-1.5 text-sm font-semibold border rounded bg-muted">
                          ⌘
                        </kbd>
                        <span className="text-muted-foreground">+</span>
                        <Input
                          type="text"
                          value={tempKey}
                          onChange={(e) => setTempKey(e.target.value.slice(-1))}
                          className="w-16 text-center font-mono"
                          maxLength={1}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleSave(shortcut.id);
                            } else if (e.key === "Escape") {
                              handleCancel();
                            }
                          }}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSave(shortcut.id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <kbd className="px-3 py-1.5 text-sm font-semibold border rounded bg-muted">
                          ⌘
                        </kbd>
                        <span className="text-muted-foreground">+</span>
                        <kbd className="px-3 py-1.5 text-sm font-semibold border rounded bg-muted min-w-[2.5rem] text-center">
                          {shortcut.currentKey}
                        </kbd>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleEdit(shortcut.id, shortcut.currentKey)
                        }
                      >
                        Edit
                      </Button>
                      {shortcut.currentKey !== shortcut.defaultKey && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleReset(shortcut.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Shortcuts work with both Cmd (Mac) and Ctrl (Windows/Linux)</li>
            <li>• Use single digits (0-9) or letters (a-z) for shortcuts</li>
            <li>• Avoid conflicts with browser shortcuts (e.g., Cmd+T, Cmd+W)</li>
            <li>• Press Enter to save or Escape to cancel when editing</li>
            <li>• Changes take effect immediately after saving</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
