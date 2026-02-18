import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal as TerminalIcon, ChevronRight } from "lucide-react";
import VoiceInput from "@/components/VoiceInput";
import { trpc } from "@/lib/trpc";
import { playSound } from "@/lib/sounds";

type TerminalLine = {
  id: string;
  type: "command" | "output" | "error" | "success";
  content: string;
  timestamp: Date;
};

export default function TerminalPanel() {
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: "welcome",
      type: "success",
      content: "Welcome to SintraPrime Terminal v1.0\\nType 'help' for available commands.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [searchMode, setSearchMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Command list for auto-complete
  const commands = [
    "help", "?", "whoami", "stats", "clear",
    "cases", "cases list", "cases show", "cases create", "cases delete",
    "documents", "documents list", "documents show", "documents search",
    "evidence", "evidence list", "evidence show",
  ];

  // Fetch terminal history from server
  const { data: serverHistory } = trpc.terminal.history.useQuery({ limit: 100 });

  // Load server history into local state
  useEffect(() => {
    if (serverHistory && serverHistory.length > 0) {
      const commands = serverHistory.map((h: any) => h.command);
      setHistory(commands);
    }
  }, [serverHistory]);

  const executeCommand = trpc.terminal.execute.useMutation({
    onSuccess: (result) => {
      // Play sound based on result
      playSound(result.success ? "command" : "error");
      
      setLines((prev) => [
        ...prev,
        {
          id: `output-${Date.now()}`,
          type: result.success ? "output" : "error",
          content: result.output,
          timestamp: new Date(),
        },
      ]);
    },
    onError: (error) => {
      playSound("error");
      
      setLines((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          type: "error",
          content: `Error: ${error.message}`,
          timestamp: new Date(),
        },
      ]);
    },
  });

  useEffect(() => {
    // Auto-scroll to bottom when new lines are added
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [lines]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add command to lines
    setLines((prev) => [
      ...prev,
      {
        id: `cmd-${Date.now()}`,
        type: "command",
        content: input,
        timestamp: new Date(),
      },
    ]);

    // Add to history
    setHistory((prev) => [...prev, input]);
    setHistoryIndex(-1);

    // Handle local commands
    if (input.trim().toLowerCase() === "clear") {
      setLines([]);
      setInput("");
      return;
    }

    // Execute command via backend
    executeCommand.mutate({ command: input });
    setInput("");
  };

  // Update suggestions when input changes
  useEffect(() => {
    if (!input.trim()) {
      setSuggestions([]);
      setSelectedSuggestion(-1);
      return;
    }

    const inputLower = input.toLowerCase();
    const matches = commands.filter(cmd => 
      cmd.toLowerCase().startsWith(inputLower) && cmd !== input
    );
    setSuggestions(matches.slice(0, 5)); // Show top 5 suggestions
    setSelectedSuggestion(-1);
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+R for reverse search
    if (e.ctrlKey && e.key === "r") {
      e.preventDefault();
      setSearchMode(!searchMode);
      if (!searchMode) {
        setSearchTerm("");
        setSearchResults(history.filter(cmd => cmd.length > 0));
        setSearchIndex(0);
      }
      return;
    }

    // In search mode
    if (searchMode) {
      if (e.key === "Escape") {
        setSearchMode(false);
        setSearchTerm("");
        return;
      }
      if (e.key === "Enter") {
        if (searchResults.length > 0) {
          setInput(searchResults[searchIndex]);
        }
        setSearchMode(false);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSearchIndex(Math.max(0, searchIndex - 1));
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSearchIndex(Math.min(searchResults.length - 1, searchIndex + 1));
        return;
      }
      return;
    }

    // Tab for auto-complete
    if (e.key === "Tab") {
      e.preventDefault();
      if (suggestions.length > 0) {
        const suggestion = selectedSuggestion >= 0 
          ? suggestions[selectedSuggestion] 
          : suggestions[0];
        setInput(suggestion);
        setSuggestions([]);
        setSelectedSuggestion(-1);
      }
      return;
    }

    // Arrow keys for suggestion navigation when suggestions are visible
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
    }

    // History navigation (only when no suggestions)
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const newIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(newIndex);
      setInput(history[newIndex]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const newIndex = historyIndex + 1;
      if (newIndex >= history.length) {
        setHistoryIndex(-1);
        setInput("");
      } else {
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    }
  };

  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "command":
        return "text-blue-400";
      case "error":
        return "text-red-400";
      case "success":
        return "text-green-400";
      default:
        return "text-zinc-300";
    }
  };

  return (
    <Card className="bg-black/95 border-zinc-800 overflow-hidden h-full flex flex-col">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50">
        <TerminalIcon className="h-4 w-4 text-green-400" />
        <span className="text-xs font-mono text-zinc-400">SintraPrime Terminal</span>
        <div className="ml-auto flex gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
      </div>

      {/* Terminal Output */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="font-mono text-sm space-y-1">
          {lines.map((line) => (
            <div key={line.id} className="flex gap-2">
              {line.type === "command" && (
                <ChevronRight className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
              )}
              <div className={`flex-1 whitespace-pre-wrap ${getLineColor(line.type)}`}>
                {line.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Terminal Input */}
      <div className="border-t border-zinc-800 relative">
        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 bg-zinc-900 border-t border-zinc-800 max-h-32 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                className={`px-4 py-2 font-mono text-sm cursor-pointer ${
                  index === selectedSuggestion
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:bg-zinc-800"
                }`}
                onClick={() => {
                  setInput(suggestion);
                  setSuggestions([]);
                  setSelectedSuggestion(-1);
                  inputRef.current?.focus();
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>
        )}

        {/* Search Mode Indicator */}
        {searchMode && (
          <div className="absolute bottom-full left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-2">
            <div className="text-xs font-mono text-zinc-400">
              <span className="text-yellow-400">Reverse Search:</span> {searchTerm || "(type to search)"}
              {searchResults.length > 0 && (
                <span className="ml-2 text-zinc-500">
                  [{searchIndex + 1}/{searchResults.length}] {searchResults[searchIndex]}
                </span>
              )}
              <span className="ml-2 text-zinc-600">↑↓ navigate | Enter select | Esc cancel</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4">
          <div className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-green-400 shrink-0" />
            <VoiceInput 
              onTranscript={(text) => {
                if (searchMode) {
                  setSearchTerm(text);
                  const filtered = history.filter(cmd => 
                    cmd.toLowerCase().includes(text.toLowerCase())
                  );
                  setSearchResults(filtered);
                  setSearchIndex(0);
                } else {
                  setInput(text);
                }
              }}
              size="sm"
              className="shrink-0"
            />
            <input
              ref={inputRef}
              type="text"
              value={searchMode ? searchTerm : input}
              onChange={(e) => {
                if (searchMode) {
                  setSearchTerm(e.target.value);
                  const filtered = history.filter(cmd => 
                    cmd.toLowerCase().includes(e.target.value.toLowerCase())
                  );
                  setSearchResults(filtered);
                  setSearchIndex(0);
                } else {
                  setInput(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-zinc-300 placeholder:text-zinc-600"
              placeholder={searchMode ? "Search history... (Ctrl+R)" : "Type a command... (Tab for auto-complete, Ctrl+R for history)"}
              autoFocus
            />
          </div>
        </form>
      </div>
    </Card>
  );
}
