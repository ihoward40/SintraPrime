import { useState, useEffect } from "react";
import { Clock, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface RecentAction {
  id: string;
  type: 'case_created' | 'document_generated' | 'ai_query' | 'contract_drafted' | 'evidence_added' | 'email_sent' | 'strategy_planned';
  title: string;
  description: string;
  timestamp: number;
  undoable: boolean;
  metadata?: Record<string, any>;
}

const ACTION_LABELS: Record<RecentAction['type'], { label: string; color: string }> = {
  case_created: { label: "Case Created", color: "bg-blue-500" },
  document_generated: { label: "Document", color: "bg-green-500" },
  ai_query: { label: "AI Query", color: "bg-purple-500" },
  contract_drafted: { label: "Contract", color: "bg-amber-500" },
  evidence_added: { label: "Evidence", color: "bg-red-500" },
  email_sent: { label: "Email", color: "bg-cyan-500" },
  strategy_planned: { label: "Strategy", color: "bg-indigo-500" },
};

const STORAGE_KEY = "recent-actions-timeline";
const MAX_ACTIONS = 10;

export function RecentActionsTimeline() {
  const [actions, setActions] = useState<RecentAction[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
  }, [actions]);

  const handleUndo = (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (!action) return;

    // TODO: Implement actual undo logic based on action type
    toast.success(`Undoing: ${action.title}`);
    
    // Remove action from timeline after undo
    setActions(prev => prev.filter(a => a.id !== actionId));
  };

  const handleRemove = (actionId: string) => {
    setActions(prev => prev.filter(a => a.id !== actionId));
  };

  const handleClearAll = () => {
    setActions([]);
    toast.success("Timeline cleared");
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (actions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <Clock className="h-12 w-12 mb-2 opacity-20" />
        <p className="text-sm">No recent actions</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="font-semibold text-sm">Recent Actions</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
            {actions.length}
          </Badge>
        </div>
        {actions.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-7 text-xs"
          >
            Clear All
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {actions.map((action) => {
            const actionConfig = ACTION_LABELS[action.type];
            return (
              <div
                key={action.id}
                className="group relative flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${actionConfig.color}`} />
                </div>
                
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{action.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {action.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0 text-[10px] px-1.5 py-0 h-5">
                      {actionConfig.label}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {formatTimestamp(action.timestamp)}
                    </span>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {action.undoable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleUndo(action.id)}
                        >
                          <Undo2 className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemove(action.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// Helper function to add action to timeline (export for use in other components)
export function addRecentAction(action: Omit<RecentAction, 'id' | 'timestamp'>) {
  const stored = localStorage.getItem(STORAGE_KEY);
  const actions: RecentAction[] = stored ? JSON.parse(stored) : [];
  
  const newAction: RecentAction = {
    ...action,
    id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  
  const updatedActions = [newAction, ...actions].slice(0, MAX_ACTIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedActions));
  
  // Trigger storage event for other components to update
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEY,
    newValue: JSON.stringify(updatedActions),
  }));
}
