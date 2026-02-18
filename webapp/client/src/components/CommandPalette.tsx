import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Search, FileText, Folder, Shield, StickyNote, X,
  Plus, Brain, Globe, Calculator, Scale, Users, Bell,
  BarChart3, ArrowRight
} from "lucide-react";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type ResultCategory = "cases" | "documents" | "evidence" | "notes" | "actions";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  category: "actions";
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "new-case", title: "New Case", description: "Create a new legal case", icon: <Plus className="w-4 h-4" />, path: "/dashboard", category: "actions" },
  { id: "ai-companion", title: "AI Companion", description: "Chat with legal AI assistant", icon: <Brain className="w-4 h-4" />, path: "/ai", category: "actions" },
  { id: "quantum-workspace", title: "Quantum Workspace", description: "Open dual-browser research", icon: <Globe className="w-4 h-4" />, path: "/quantum", category: "actions" },
  { id: "deadline-calc", title: "Deadline Calculator", description: "Calculate legal deadlines", icon: <Calculator className="w-4 h-4" />, path: "/deadlines", category: "actions" },
  { id: "documents", title: "Documents", description: "Manage legal documents", icon: <FileText className="w-4 h-4" />, path: "/documents", category: "actions" },
  { id: "evidence", title: "Evidence", description: "Manage case evidence", icon: <Shield className="w-4 h-4" />, path: "/evidence", category: "actions" },
  { id: "strategies", title: "Warfare Strategies", description: "Plan legal strategies", icon: <Scale className="w-4 h-4" />, path: "/strategies", category: "actions" },
  { id: "coalitions", title: "Coalitions", description: "Manage team coalitions", icon: <Users className="w-4 h-4" />, path: "/coalitions", category: "actions" },
  { id: "notifications", title: "Notifications", description: "View notifications", icon: <Bell className="w-4 h-4" />, path: "/notifications", category: "actions" },
  { id: "analytics", title: "Analytics", description: "View case analytics", icon: <BarChart3 className="w-4 h-4" />, path: "/analytics", category: "actions" },
  { id: "filing-checklist", title: "Filing Checklist", description: "Generate court filing checklists", icon: <FileText className="w-4 h-4" />, path: "/filing-checklists", category: "actions" },
];

const CATEGORY_LABELS: Record<ResultCategory, string> = {
  actions: "Quick Actions",
  cases: "Cases",
  documents: "Documents",
  evidence: "Evidence",
  notes: "Notes",
};

const CATEGORY_ICONS: Record<ResultCategory, React.ReactNode> = {
  actions: <ArrowRight className="w-3.5 h-3.5" />,
  cases: <Folder className="w-3.5 h-3.5" />,
  documents: <FileText className="w-3.5 h-3.5" />,
  evidence: <Shield className="w-3.5 h-3.5" />,
  notes: <StickyNote className="w-3.5 h-3.5" />,
};

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  const { data: searchResults, isFetching } = trpc.search.global.useQuery(
    { query },
    { enabled: query.length >= 2, placeholderData: (prev: any) => prev }
  );

  // Filter quick actions based on query
  const filteredActions = query.length === 0
    ? QUICK_ACTIONS
    : QUICK_ACTIONS.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.description.toLowerCase().includes(query.toLowerCase())
      );

  // Build flat list of all results
  const allResults: Array<{ category: ResultCategory; id: string | number; title: string; subtitle?: string; path: string; icon?: React.ReactNode }> = [];

  // Add quick actions first
  filteredActions.forEach((action) => {
    allResults.push({
      category: "actions",
      id: action.id,
      title: action.title,
      subtitle: action.description,
      path: action.path,
      icon: action.icon,
    });
  });

  // Add search results
  if (searchResults && query.length >= 2) {
    searchResults.cases?.forEach((c: any) => {
      allResults.push({
        category: "cases",
        id: c.id,
        title: c.title,
        subtitle: `${c.caseType || "Case"} · ${c.status}`,
        path: `/cases/${c.id}`,
      });
    });
    searchResults.documents?.forEach((d: any) => {
      allResults.push({
        category: "documents",
        id: d.id,
        title: d.title,
        subtitle: d.documentType || "Document",
        path: "/documents",
      });
    });
    searchResults.evidence?.forEach((e: any) => {
      allResults.push({
        category: "evidence",
        id: e.id,
        title: e.title,
        subtitle: e.evidenceType || "Evidence",
        path: "/evidence",
      });
    });
    searchResults.notes?.forEach((n: any) => {
      allResults.push({
        category: "notes",
        id: n.id,
        title: n.content?.substring(0, 80) || "Note",
        subtitle: n.noteType || "Note",
        path: n.caseId ? `/cases/${n.caseId}` : "/dashboard",
      });
    });
  }

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, searchResults]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, allResults.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (allResults[selectedIndex]) {
            navigate(allResults[selectedIndex].path);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [allResults, selectedIndex, navigate, onClose]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selected?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Group results by category for display
  const groupedResults: Record<ResultCategory, typeof allResults> = {
    actions: [],
    cases: [],
    documents: [],
    evidence: [],
    notes: [],
  };
  allResults.forEach((r) => {
    groupedResults[r.category].push(r);
  });

  let globalIndex = -1;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search cases, documents, evidence, or type a command..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
          {isFetching && query.length >= 2 && (
            <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Searching...
            </div>
          )}

          {allResults.length === 0 && query.length >= 2 && !isFetching && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          )}

          {(Object.keys(groupedResults) as ResultCategory[]).map((category) => {
            const items = groupedResults[category];
            if (items.length === 0) return null;

            return (
              <div key={category}>
                <div className="px-4 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {CATEGORY_LABELS[category]}
                </div>
                {items.map((item) => {
                  globalIndex++;
                  const idx = globalIndex;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={`${category}-${item.id}`}
                      data-index={idx}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "text-foreground hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        navigate(item.path);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span className={`shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                        {item.icon || CATEGORY_ICONS[category]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">{item.subtitle}</div>
                        )}
                      </div>
                      {isSelected && (
                        <ArrowRight className="w-4 h-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded border border-border font-mono text-[10px]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded border border-border font-mono text-[10px]">↵</kbd>
              Open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded border border-border font-mono text-[10px]">Esc</kbd>
              Close
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">SintraPrime Search</span>
        </div>
      </div>
    </div>
  );
}
