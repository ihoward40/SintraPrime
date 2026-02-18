import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Layout,
  Columns2,
  Rows2,
  Grid2X2,
  Maximize2,
  Bot,
  Terminal,
  Code,
  Globe,
} from "lucide-react";
import AIChatEnhanced from "@/components/AIChatEnhanced";
import CodeEditor from "@/components/CodeEditor";
import TerminalPanel from "@/components/TerminalPanel";
import BrowserPanel from "@/components/BrowserPanel";
import PresenceIndicator from "@/components/PresenceIndicator";

type PanelType = "chat" | "terminal" | "editor" | "browser";
type LayoutMode = "single" | "dual-horizontal" | "dual-vertical" | "quad";

type Panel = {
  id: string;
  type: PanelType;
};

export default function CommandCenter() {
  const [layout, setLayout] = useState<LayoutMode>("dual-horizontal");

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + 1-4 for layout switching
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case "1":
            e.preventDefault();
            setLayout("single");
            break;
          case "2":
            e.preventDefault();
            setLayout("dual-horizontal");
            break;
          case "3":
            e.preventDefault();
            setLayout("dual-vertical");
            break;
          case "4":
            e.preventDefault();
            setLayout("quad");
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const [panels, setPanels] = useState<Panel[]>([
    { id: "1", type: "chat" },
    { id: "2", type: "editor" },
  ]);

  const getPanelIcon = (type: PanelType) => {
    switch (type) {
      case "chat":
        return <Bot className="h-4 w-4" />;
      case "terminal":
        return <Terminal className="h-4 w-4" />;
      case "editor":
        return <Code className="h-4 w-4" />;
      case "browser":
        return <Globe className="h-4 w-4" />;
    }
  };

  const renderPanel = (panel: Panel) => {
    switch (panel.type) {
      case "chat":
        return <AIChatEnhanced />;
      case "terminal":
        return <TerminalPanel />;
      case "editor":
        return <CodeEditor />;
      case "browser":
        return <BrowserPanel />;
    }
  };

  const changePanelType = (panelId: string, newType: PanelType) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === panelId ? { ...p, type: newType } : p))
    );
  };

  const getLayoutClass = () => {
    switch (layout) {
      case "single":
        return "grid-cols-1 grid-rows-1";
      case "dual-horizontal":
        return "grid-cols-2 grid-rows-1";
      case "dual-vertical":
        return "grid-cols-1 grid-rows-2";
      case "quad":
        return "grid-cols-2 grid-rows-2";
    }
  };

  const updateLayout = (newLayout: LayoutMode) => {
    setLayout(newLayout);
    // Adjust panels based on layout
    switch (newLayout) {
      case "single":
        setPanels([{ id: "1", type: "chat" }]);
        break;
      case "dual-horizontal":
      case "dual-vertical":
        setPanels([
          { id: "1", type: "chat" },
          { id: "2", type: "editor" },
        ]);
        break;
      case "quad":
        setPanels([
          { id: "1", type: "chat" },
          { id: "2", type: "editor" },
          { id: "3", type: "terminal" },
          { id: "4", type: "browser" },
        ]);
        break;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Command Center Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Layout className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Command Center</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Presence Indicator */}
          <PresenceIndicator />
          
          <div className="flex items-center gap-2">
          {/* Layout Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Maximize2 className="h-4 w-4 mr-2" />
                Layout
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => updateLayout("single")}>
                <Layout className="h-4 w-4 mr-2" />
                Single View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateLayout("dual-horizontal")}>
                <Columns2 className="h-4 w-4 mr-2" />
                Dual Horizontal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateLayout("dual-vertical")}>
                <Rows2 className="h-4 w-4 mr-2" />
                Dual Vertical
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateLayout("quad")}>
                <Grid2X2 className="h-4 w-4 mr-2" />
                Quad View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Panel Grid */}
      <div className={`flex-1 grid ${getLayoutClass()} gap-2 p-2 overflow-hidden`}>
        {panels.map((panel) => (
          <div key={panel.id} className="relative overflow-hidden rounded-lg border border-border">
            {/* Panel Type Selector */}
            <div className="absolute top-2 right-2 z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" className="h-8 px-2">
                    {getPanelIcon(panel.type)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => changePanelType(panel.id, "chat")}>
                    <Bot className="h-4 w-4 mr-2" />
                    AI Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changePanelType(panel.id, "terminal")}>
                    <Terminal className="h-4 w-4 mr-2" />
                    Terminal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changePanelType(panel.id, "editor")}>
                    <Code className="h-4 w-4 mr-2" />
                    Editor
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changePanelType(panel.id, "browser")}>
                    <Globe className="h-4 w-4 mr-2" />
                    Browser
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Panel Content */}
            <div className="h-full">{renderPanel(panel)}</div>
          </div>
        ))}
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-1 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Layout: {layout}</span>
          <span>Panels: {panels.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Online</span>
        </div>
      </div>
    </div>
  );
}
