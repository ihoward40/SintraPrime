// useAuth hook defined inline
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  Brain,
  FileText,
  Shield,
  Users,
  Bell,
  Scale,
  Calculator,
  CreditCard,
  BarChart3,
  Mail,
  ClipboardList,
  FileDown,
  CalendarDays,
  Library,
  Settings2,
  Upload,
  Bot,
  Sparkles,
  Presentation,
  Palette,
  Zap,
  Mic,
  ChevronDown,
  Briefcase,
  Wrench,
  FolderKanban,
  Search,
  Pin,
  Keyboard,
  Gavel,
  Trash2,
  ChevronsUpDown,
  Layers,
  Download,
  Settings,
} from "lucide-react";
import React, { CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CommandPalette from "./CommandPalette";
import { ShortcutCheatSheet } from "./ShortcutCheatSheet";
import { SortableFavoriteItem } from "./SortableFavoriteItem";
import { FavoriteGroupsManager } from "./FavoriteGroupsManager";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { useGovernanceNotifications } from '@/hooks/useGovernanceNotifications';
import { KeyboardShortcutsPanel } from "./KeyboardShortcutsPanel";
import { RecentActionsTimeline } from "./RecentActionsTimeline";
import Fuse from 'fuse.js';
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";

// Simplified, organized menu structure
const mainMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", description: "Overview of cases and metrics", aliases: ["home", "overview", "main"] },
  { icon: BarChart3, label: "Analytics", path: "/analytics", description: "Data insights and reports", aliases: ["stats", "metrics", "data", "reports"] },
];

// Featured AI Tools (top-tier features)
const featuredAIItems = [
  { icon: Sparkles, label: "AI Assistant", path: "/ai-assistant", badge: "New", description: "Multi-modal AI chat", aliases: ["chat", "ai", "assistant", "help"] },
  { icon: Zap, label: "Agent Zero", path: "/agent-zero", badge: "God-Tier", description: "Autonomous task execution", aliases: ["agent", "auto", "autonomous", "task"] },
];

// Additional AI Tools (collapsible)
const additionalAIItems = [
  { icon: Brain, label: "AI Companion", path: "/ai", description: "AI-powered legal assistant", aliases: ["companion", "legal ai", "assistant"] },
  { icon: Brain, label: "Legal AI Agents", path: "/legal-agents", description: "Specialized legal AI agents", aliases: ["agents", "legal", "specialists"] },
  { icon: Calculator, label: "IKE Tax Agent", path: "/tax-agent", badge: "New", description: "Trust & estate tax preparation", aliases: ["tax", "1041", "trust", "estate", "dni", "fiduciary"] },
  { icon: Bot, label: "Autonomous Agent", path: "/autonomous-agent", description: "Self-directed task automation", aliases: ["auto", "bot", "automation"] },
];

// Power Tools (collapsible)
const powerToolsItems = [
  { icon: Presentation, label: "Slide Generator", path: "/slides", badge: "God-Tier", description: "AI-powered presentation creator", aliases: ["slides", "presentation", "ppt", "powerpoint"] },
  { icon: Palette, label: "Digital Products", path: "/digital-products", badge: "God-Tier", description: "Create digital assets and products", aliases: ["products", "digital", "assets", "create"] },
  { icon: FileText, label: "NotebookLM", path: "/notebooklm", badge: "New", description: "Documentation Memory System", aliases: ["notebook", "notes", "docs", "memory"] },
  { icon: Zap, label: "Mission Control", path: "/mission-control", badge: "AI OS", description: "AI Operating System Dashboard", aliases: ["mission", "control", "os", "system"] },
  { icon: FolderKanban, label: "Quantum Workspace", path: "/workspace", description: "Advanced collaboration space", aliases: ["workspace", "quantum", "collab", "space"] },
  { icon: Wrench, label: "Command Center", path: "/command-center", description: "Centralized control panel", aliases: ["command", "center", "control", "panel"] },
  { icon: Bot, label: "Workflow Templates", path: "/workflow-templates", description: "Pre-built automation workflows", aliases: ["workflow", "templates", "automation", "prebuilt"] },
];

// Case Management (collapsible)
const caseManagementItems = [
  { icon: Gavel, label: "Court Monitoring", path: "/court-monitoring", badge: "PACER", description: "Real-time federal court tracking", aliases: ["court", "pacer", "monitor", "tracking"] },
  { icon: FileText, label: "Documents", path: "/documents", description: "Manage case documents", aliases: ["docs", "files", "document", "manage"] },
  { icon: FileText, label: "Contract Drafting", path: "/contracts/draft", description: "Create legal contracts", aliases: ["contract", "draft", "create", "write"] },
  { icon: FileText, label: "Contract Review", path: "/contracts/review", description: "Review and analyze contracts", aliases: ["review", "analyze", "check", "contract"] },
  { icon: Shield, label: "Evidence", path: "/evidence", description: "Evidence management system", aliases: ["evidence", "proof", "exhibit", "manage"] },
  { icon: Mail, label: "Email Correspondence", path: "/emails", description: "Case email tracking", aliases: ["email", "mail", "correspondence", "message"] },
  { icon: Scale, label: "Warfare Strategies", path: "/strategies", description: "Legal strategy planning", aliases: ["strategy", "warfare", "plan", "tactics"] },
  { icon: Calculator, label: "Deadline Calculator", path: "/deadlines", description: "Calculate legal deadlines", aliases: ["deadline", "calc", "calculate", "dates"] },
  { icon: ClipboardList, label: "Filing Checklists", path: "/filing-checklists", description: "Court filing checklists", aliases: ["filing", "checklist", "court", "file"] },
  { icon: Library, label: "Research Library", path: "/research", description: "Legal research database", aliases: ["research", "library", "database", "search"] },
  { icon: FileDown, label: "Case Export", path: "/case-export", description: "Export case data", aliases: ["export", "download", "save", "data"] },
  { icon: CalendarDays, label: "Calendar Export", path: "/calendar", description: "Export to calendar apps", aliases: ["calendar", "schedule", "export", "dates"] },
  { icon: Upload, label: "Bulk Case Import", path: "/bulk-import", description: "Import multiple cases", aliases: ["import", "upload", "bulk", "batch"] },
];

// Team & Collaboration (collapsible)
const teamItems = [
  { icon: Users, label: "Workspaces", path: "/workspaces", description: "Team collaboration spaces", aliases: ["workspace", "team", "collab", "space"] },
  { icon: Users, label: "Coalitions", path: "/coalitions", description: "Multi-party collaboration", aliases: ["coalition", "group", "party", "alliance"] },
  { icon: Scale, label: "Legal Alerts", path: "/alerts", description: "Important legal notifications", aliases: ["alert", "notification", "notify", "legal"] },
  { icon: CreditCard, label: "Payment Dashboard", path: "/payments/dashboard", badge: "New", description: "Track tax prep payments", aliases: ["payment", "billing", "revenue", "transactions"] },
  { icon: Shield, label: "Dispute Management", path: "/disputes", badge: "New", description: "Handle chargebacks and disputes", aliases: ["dispute", "chargeback", "refund", "conflict"] },
  { icon: CreditCard, label: "Subscription Management", path: "/subscriptions", badge: "New", description: "Manage subscription plans and billing", aliases: ["subscription", "plan", "recurring", "membership"] },
  { icon: CreditCard, label: "Pricing", path: "/pricing", description: "View plans and billing", aliases: ["price", "billing", "plan", "subscription"] },
];

// Settings (collapsible)
const settingsItems = [
  { icon: Settings2, label: "General Settings", path: "/settings", description: "App configuration", aliases: ["settings", "config", "preferences", "options"] },
  { icon: Shield, label: "IRS Settings", path: "/irs-settings", badge: "New", description: "IRS e-file credentials", aliases: ["irs", "tax", "credentials", "tcc", "efin"] },
  { icon: Bell, label: "Notification Settings", path: "/settings/notifications", badge: "New", description: "Configure governance alerts", aliases: ["notifications", "alerts", "slack", "email"] },
  { icon: Mic, label: "Wake-Word Settings", path: "/settings/wake-word", description: "Voice activation settings", aliases: ["wake", "voice", "activation", "mic"] },
  { icon: Keyboard, label: "Keyboard Shortcuts", path: "/settings/keyboard-shortcuts", description: "Customize shortcuts", aliases: ["keyboard", "shortcuts", "hotkeys", "keys"] },
];

// Governance (collapsible)
const governanceItems = [
  { icon: LayoutDashboard, label: "Admin Dashboard", path: "/admin", badge: "New", description: "Centralized governance overview", aliases: ["admin", "dashboard", "overview", "summary"] },
  { icon: Shield, label: "Governance Dashboard", path: "/governance", badge: "New", description: "Receipt ledger & compliance", aliases: ["governance", "compliance", "audit", "receipts"] },
  { icon: BarChart3, label: "Governance Analytics", path: "/governance/analytics", badge: "New", description: "Trends & insights", aliases: ["analytics", "trends", "insights", "reports"] },
  { icon: ClipboardList, label: "Approval Requests", path: "/governance/approvals", badge: "New", description: "Review & approve high-risk operations", aliases: ["approvals", "requests", "workflow", "review"] },
  { icon: Settings, label: "Governance Settings", path: "/governance/settings", badge: "New", description: "Configure spending limits & policy gates", aliases: ["settings", "configuration", "limits", "thresholds"] },
  { icon: FileText, label: "Audit Log", path: "/governance/audit-log", badge: "New", description: "Filterable timeline of governance events", aliases: ["audit", "log", "timeline", "events", "history"] },
  { icon: Users, label: "Beneficiary Management", path: "/beneficiaries", badge: "New", description: "Manage beneficiaries & distributions", aliases: ["beneficiaries", "distributions", "k1", "trust"] },
];

function NotificationBell() {
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const count = typeof unreadCount === "number" ? unreadCount : 0;

  return (
    <Link href="/notifications">
      <Button variant="ghost" size="icon" className="relative h-9 w-9">
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px] bg-destructive text-destructive-foreground border-0 flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </Badge>
        )}
      </Button>
    </Link>
  );
}

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 240;
const MAX_WIDTH = 400;

type SidebarPreset = 'compact' | 'balanced' | 'spacious' | 'professional';

const SIDEBAR_PRESETS = {
  compact: { width: 240, gap: 'gap-1', fontSize: 'text-xs', padding: 'py-1.5' },
  balanced: { width: 280, gap: 'gap-2', fontSize: 'text-sm', padding: 'py-2' },
  spacious: { width: 320, gap: 'gap-3', fontSize: 'text-sm', padding: 'py-3' },
  professional: { width: 360, gap: 'gap-4', fontSize: 'text-base', padding: 'py-3.5' },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { data: user, isLoading: loading } = trpc.auth.me.useQuery();
  const [location, setLocation] = useLocation();
  
  // Enable real-time governance notifications
  useGovernanceNotifications();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [isGroupsManagerOpen, setIsGroupsManagerOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentItems, setRecentItems] = useState<Array<{ path: string; label: string; timestamp: number }>>([]);
  const [favoriteItems, setFavoriteItems] = useState<string[]>([]);
  const [favoriteGroups, setFavoriteGroups] = useState<Record<string, string[]>>({});
  const [customShortcuts, setCustomShortcuts] = useState<Record<string, string>>({});
  const [isClearRecentDialogOpen, setIsClearRecentDialogOpen] = useState(false);
  const [showRecentSection, setShowRecentSection] = useState(() => {
    const stored = localStorage.getItem('sidebar-show-recent');
    return stored ? JSON.parse(stored) : true;
  });
  const [pinnedItems, setPinnedItems] = useState<string[]>(() => {
    const stored = localStorage.getItem('sidebar-pinned-items');
    return stored ? JSON.parse(stored) : [];
  });
  const [isResizing, setIsResizing] = useState(false);
  const [areAllSectionsCollapsed, setAreAllSectionsCollapsed] = useState(false);
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    const stored = localStorage.getItem('sidebar-section-order');
    return stored ? JSON.parse(stored) : ['ai-tools', 'power-tools', 'case-management', 'team', 'governance', 'settings'];
  });
  const [currentPreset, setCurrentPreset] = useState<SidebarPreset>(() => {
    const stored = localStorage.getItem('sidebar-preset');
    return (stored as SidebarPreset) || 'balanced';
  });
  const [sectionVisibility, setSectionVisibility] = useState<Record<string, boolean>>(() => {
    const stored = localStorage.getItem('sidebar-section-visibility');
    return stored ? JSON.parse(stored) : {
      'ai-tools': true,
      'power-tools': true,
      'case-management': true,
      'team': true,
      'governance': true,
      'settings': true,
    };
  });
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isKeyboardShortcutsPanelOpen, setIsKeyboardShortcutsPanelOpen] = useState(false);

  // Persist Recent section visibility
  useEffect(() => {
    localStorage.setItem('sidebar-show-recent', JSON.stringify(showRecentSection));
  }, [showRecentSection]);

  // Persist pinned items
  useEffect(() => {
    localStorage.setItem('sidebar-pinned-items', JSON.stringify(pinnedItems));
  }, [pinnedItems]);

  // Persist sidebar width
  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  // Persist section order
  useEffect(() => {
    localStorage.setItem('sidebar-section-order', JSON.stringify(sectionOrder));
  }, [sectionOrder]);

  // Persist current preset
  useEffect(() => {
    localStorage.setItem('sidebar-preset', currentPreset);
  }, [currentPreset]);

  // Persist section visibility
  useEffect(() => {
    localStorage.setItem('sidebar-section-visibility', JSON.stringify(sectionVisibility));
  }, [sectionVisibility]);

  // Apply preset
  const applyPreset = (preset: SidebarPreset) => {
    setCurrentPreset(preset);
    setSidebarWidth(SIDEBAR_PRESETS[preset].width);
  };

  // Toggle section visibility
  const toggleSectionVisibility = (sectionId: string) => {
    setSectionVisibility(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Show all sections
  const showAllSections = () => {
    setSectionVisibility({
      'ai-tools': true,
      'power-tools': true,
      'case-management': true,
      'team': true,
      'governance': true,
      'settings': true,
    });
  };

  // Hide all sections
  const hideAllSections = () => {
    setSectionVisibility({
      'ai-tools': false,
      'power-tools': false,
      'case-management': false,
      'team': false,
      'governance': false,
      'settings': false,
    });
  };

  // Export sidebar configuration
  const exportConfiguration = () => {
    const config = {
      version: '1.0',
      sidebarWidth,
      currentPreset,
      sectionOrder,
      sectionVisibility,
      pinnedItems,
      showRecentSection,
      collapsedSections: {
        aiTools: !aiToolsOpen,
        powerTools: !powerToolsOpen,
        caseManagement: !caseManagementOpen,
        team: !teamOpen,
        settings: !settingsOpen,
      },
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sintraprime-sidebar-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Configuration exported successfully');
  };

  // Import sidebar configuration
  const importConfiguration = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        
        // Validate configuration structure
        if (!config.version) {
          throw new Error('Invalid configuration file');
        }
        
        // Apply configuration
        if (config.sidebarWidth) setSidebarWidth(config.sidebarWidth);
        if (config.currentPreset) setCurrentPreset(config.currentPreset);
        if (config.sectionOrder) setSectionOrder(config.sectionOrder);
        if (config.sectionVisibility) setSectionVisibility(config.sectionVisibility);
        if (config.pinnedItems) setPinnedItems(config.pinnedItems);
        if (typeof config.showRecentSection === 'boolean') setShowRecentSection(config.showRecentSection);
        
        // Apply collapsed states
        if (config.collapsedSections) {
          setAiToolsOpen(!config.collapsedSections.aiTools);
          setPowerToolsOpen(!config.collapsedSections.powerTools);
          setCaseManagementOpen(!config.collapsedSections.caseManagement);
          setTeamOpen(!config.collapsedSections.team);
          setSettingsOpen(!config.collapsedSections.settings);
        }
        
        toast.success('Configuration imported successfully');
      } catch (error) {
        toast.error('Failed to import configuration: Invalid file format');
      }
    };
    reader.readAsText(file);
  };

  // Reset to default configuration
  const resetToDefault = () => {
    setSidebarWidth(DEFAULT_WIDTH);
    setCurrentPreset('balanced');
    setSectionOrder(['ai-tools', 'power-tools', 'case-management', 'team', 'settings']);
    setSectionVisibility({
      'ai-tools': true,
      'power-tools': true,
      'case-management': true,
      'team': true,
      'settings': true,
    });
    setPinnedItems([]);
    setShowRecentSection(true);
    setAiToolsOpen(false);
    setPowerToolsOpen(false);
    setCaseManagementOpen(false);
    setTeamOpen(false);
    setSettingsOpen(false);
    toast.success('Configuration reset to default');
  };

  // Handle section drag end
  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    setSectionOrder((items) => {
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  // Handle sidebar resize
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);
  
  // Collapsible section states with localStorage persistence
  const [aiToolsOpen, setAiToolsOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar-ai-tools-open');
    return stored ? JSON.parse(stored) : true;
  });
  const [powerToolsOpen, setPowerToolsOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar-power-tools-open');
    return stored ? JSON.parse(stored) : false;
  });
  const [caseManagementOpen, setCaseManagementOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar-case-management-open');
    return stored ? JSON.parse(stored) : false;
  });
  const [teamOpen, setTeamOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar-team-open');
    return stored ? JSON.parse(stored) : false;
  });
  const [settingsOpen, setSettingsOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar-settings-open');
    return stored ? JSON.parse(stored) : false;
  });
  const [governanceOpen, setGovernanceOpen] = useState(() => {
    const stored = localStorage.getItem('sidebar-governance-open');
    return stored ? JSON.parse(stored) : false;
  });

  // Persist collapsible states to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-ai-tools-open', JSON.stringify(aiToolsOpen));
  }, [aiToolsOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar-power-tools-open', JSON.stringify(powerToolsOpen));
  }, [powerToolsOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar-case-management-open', JSON.stringify(caseManagementOpen));
  }, [caseManagementOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar-team-open', JSON.stringify(teamOpen));
  }, [teamOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar-settings-open', JSON.stringify(settingsOpen));
  }, [settingsOpen]);

  useEffect(() => {
    localStorage.setItem('sidebar-governance-open', JSON.stringify(governanceOpen));
  }, [governanceOpen]);

  // Load recent items and favorites from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recent-items');
    if (stored) {
      try {
        const items = JSON.parse(stored);
        // Remove duplicates based on path and limit to 5 items
        const uniqueItems = items
          .filter((item: any, index: number, self: any[]) =>
            index === self.findIndex((t: any) => t.path === item.path)
          )
          .slice(0, 5);
        setRecentItems(uniqueItems);
        // Save cleaned data back to localStorage
        if (uniqueItems.length !== items.length) {
          localStorage.setItem('recent-items', JSON.stringify(uniqueItems));
        }
      } catch (e) {
        console.error('Failed to parse recent items', e);
      }
    }

    const storedFavorites = localStorage.getItem('favorite-items');
    if (storedFavorites) {
      try {
        setFavoriteItems(JSON.parse(storedFavorites));
      } catch (e) {
        console.error('Failed to parse favorite items', e);
      }
    }

    const storedGroups = localStorage.getItem('favorite-groups');
    if (storedGroups) {
      try {
        setFavoriteGroups(JSON.parse(storedGroups));
      } catch (e) {
        console.error('Failed to parse favorite groups', e);
      }
    }

    const storedShortcuts = localStorage.getItem('keyboard-shortcuts');
    if (storedShortcuts) {
      try {
        const shortcuts = JSON.parse(storedShortcuts);
        const shortcutMap: Record<string, string> = {};
        shortcuts.forEach((s: any) => {
          shortcutMap[s.id] = s.currentKey;
        });
        setCustomShortcuts(shortcutMap);
      } catch (e) {
        console.error('Failed to parse keyboard shortcuts', e);
      }
    }
  }, []);

  // Track page visits
  useEffect(() => {
    if (!location || location === '/') return;
    
    const currentItem = allItems.find(item => item.path === location);
    if (!currentItem) return;

    setRecentItems(prev => {
      const filtered = prev.filter(item => item.path !== location);
      const updated = [
        { path: location, label: currentItem.label, timestamp: Date.now() },
        ...filtered
      ].slice(0, 5);
      
      localStorage.setItem('recent-items', JSON.stringify(updated));
      return updated;
    });
  }, [location]);

  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = getLoginUrl();
    },
  });

  const handleLogout = () => {
    logout.mutate();
  };

  const handleClearRecent = () => {
    setRecentItems([]);
    localStorage.removeItem('recent-items');
    setIsClearRecentDialogOpen(false);
  };

  const togglePin = (path: string) => {
    setPinnedItems(prev => {
      if (prev.includes(path)) {
        return prev.filter(p => p !== path);
      } else {
        // Limit to 5 pinned items
        if (prev.length >= 5) {
          return prev;
        }
        return [...prev, path];
      }
    });
  };

  const handleCollapseAll = () => {
    const newState = !areAllSectionsCollapsed;
    setAreAllSectionsCollapsed(newState);
    setAiToolsOpen(!newState);
    setPowerToolsOpen(!newState);
    setCaseManagementOpen(!newState);
    setTeamOpen(!newState);
    setGovernanceOpen(!newState);
    setSettingsOpen(!newState);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // Cheat sheet (Cmd+/)
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setIsCheatSheetOpen(true);
        return;
      }

      // Toggle Recent section (Cmd+Shift+R)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "R") {
        e.preventDefault();
        setShowRecentSection((prev: boolean) => !prev);
        return;
      }

      // Keyboard shortcuts for collapsible sections (use custom shortcuts if available)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const key = e.key;
        const aiKey = customShortcuts['ai-tools'] || '1';
        const powerKey = customShortcuts['power-tools'] || '2';
        const caseKey = customShortcuts['case-mgmt'] || '3';
        const teamKey = customShortcuts['team'] || '4';
        const settingsKey = customShortcuts['settings'] || '5';

        if (key === aiKey) {
          e.preventDefault();
          setAiToolsOpen((prev: boolean) => !prev);
        } else if (key === powerKey) {
          e.preventDefault();
          setPowerToolsOpen((prev: boolean) => !prev);
        } else if (key === caseKey) {
          e.preventDefault();
          setCaseManagementOpen((prev: boolean) => !prev);
        } else if (key === teamKey) {
          e.preventDefault();
          setTeamOpen((prev: boolean) => !prev);
        } else if (key === settingsKey) {
          e.preventDefault();
          setSettingsOpen((prev: boolean) => !prev);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const allItems = [
    ...mainMenuItems,
    ...featuredAIItems,
    ...additionalAIItems,
    ...powerToolsItems,
    ...caseManagementItems,
    ...teamItems,
    ...governanceItems,
    ...settingsItems,
  ];
  const activeMenuItem = allItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setSidebarWidth(64);
    } else {
      const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      setSidebarWidth(saved ? parseInt(saved, 10) : DEFAULT_WIDTH);
    }
  }, [isCollapsed]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isCollapsed) return;
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + e.pageX - startX));
      setSidebarWidth(newWidth);
      localStorage.setItem(SIDEBAR_WIDTH_KEY, newWidth.toString());
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [sidebarWidth, isCollapsed]);

  const toggleFavorite = (path: string) => {
    setFavoriteItems(prev => {
      const updated = prev.includes(path)
        ? prev.filter(p => p !== path)
        : [...prev, path];
      localStorage.setItem('favorite-items', JSON.stringify(updated));
      return updated;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFavoriteItems((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const updated = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('favorite-items', JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Helper function to highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-900 text-foreground rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Helper function to check if item matches search
  const matchesSearch = (item: { label: string; description?: string; aliases?: string[] }) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    
    // Check label, description, and aliases
    const labelMatch = item.label.toLowerCase().includes(query);
    const descMatch = item.description && item.description.toLowerCase().includes(query);
    const aliasMatch = item.aliases && item.aliases.some(alias => alias.toLowerCase().includes(query));
    
    return labelMatch || descMatch || aliasMatch;
  };

  const renderMenuItem = (item: typeof mainMenuItems[0] | typeof powerToolsItems[0], showPin = true) => (
    <SidebarMenuItem key={item.path}>
      <div className="group/item relative flex items-center gap-1 min-w-0">
        <SidebarMenuButton
          asChild
          isActive={location === item.path}
          className="flex-1 h-9 px-2"
        >
          <Link href={item.path} className="flex items-center gap-2 w-full">
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 truncate text-sm">{highlightText(item.label, searchQuery)}</span>
            {'badge' in item && item.badge && (
              <Badge variant="secondary" className="flex-shrink-0 text-[10px] px-1.5 py-0 h-5">
                {item.badge}
              </Badge>
            )}
          </Link>
        </SidebarMenuButton>
        {showPin && !isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity"
            onClick={() => toggleFavorite(item.path)}
          >
            <Pin className={`h-3.5 w-3.5 ${favoriteItems.includes(item.path) ? 'fill-current text-primary' : ''}`} />
          </Button>
        )}
      </div>
    </SidebarMenuItem>
  );

  const renderFeaturedAIItem = (item: typeof featuredAIItems[0]) => (
    <SidebarMenuItem key={item.path}>
      <SidebarMenuButton
        asChild
        isActive={location === item.path}
        className="group relative h-auto py-3.5 px-2 min-h-[68px]"
      >
        <Link href={item.path} className="flex flex-col items-start gap-2 w-full min-w-0">
          <div className="flex items-center w-full gap-2 min-w-0">
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className="font-semibold text-sm flex-1 truncate leading-tight">{highlightText(item.label, searchQuery)}</span>
            {item.badge && (
              <Badge 
                variant={item.badge === "God-Tier" ? "default" : "secondary"} 
                className="flex-shrink-0 text-[10px] px-1.5 py-0 h-5"
              >
                {item.badge}
              </Badge>
            )}
          </div>
          {!isCollapsed && item.description && (
            <span className="text-[11px] text-muted-foreground ml-7 line-clamp-1 leading-tight">
              {item.description}
            </span>
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderCollapsibleSection = (
    title: string,
    items: Array<{ icon: any; label: string; path: string; badge?: string; description?: string }>,
    icon: React.ElementType,
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
    shortcut?: string
  ) => (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarGroup className="py-2">
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="flex items-center justify-between w-full group/collapsible px-2 py-2 hover:bg-accent rounded-md transition-colors">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {React.createElement(icon, { className: "h-4 w-4 flex-shrink-0" })}
              <span className="truncate text-sm font-medium">{title}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              {shortcut && !isCollapsed && (
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  {shortcut}
                </kbd>
              )}
              <ChevronDown className="h-4 w-4 flex-shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
            </div>
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent className="mt-1">
            <SidebarMenu className="gap-0.5">
              {items.map((item) => (
                <SidebarMenuItem key={item.path}>
                  {isCollapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.path}
                          className="h-9 px-2"
                        >
                          <Link href={item.path} className="flex items-center gap-2 w-full">
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex flex-col gap-1">
                        <span className="font-semibold">{item.label}</span>
                        {item.description && (
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.path}
                      className="h-9 px-2"
                    >
                      <Link href={item.path} className="flex items-center gap-2 w-full">
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 truncate text-sm">{highlightText(item.label, searchQuery)}</span>
                      {item.badge && (
                        <Badge 
                          variant={item.badge === "God-Tier" ? "default" : "secondary"}
                          className="flex-shrink-0 text-[10px] px-1.5 py-0 h-5"
                        >
                          {item.badge}
                        </Badge>
                      )}
                      <Pin
                        className={`h-3 w-3 flex-shrink-0 cursor-pointer transition-colors ${
                          pinnedItems.includes(item.path)
                            ? 'text-primary fill-primary'
                            : 'text-muted-foreground hover:text-primary'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          togglePin(item.path);
                        }}
                      />
                    </Link>
                  </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    window.location.href = getLoginUrl();
    return null;
  }

  return (
    <>
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
      <ShortcutCheatSheet
        open={isCheatSheetOpen}
        onOpenChange={setIsCheatSheetOpen}
        customShortcuts={customShortcuts}
      />
      <FavoriteGroupsManager
        open={isGroupsManagerOpen}
        onOpenChange={setIsGroupsManagerOpen}
        groups={favoriteGroups}
        onUpdateGroups={(groups) => {
          setFavoriteGroups(groups);
          localStorage.setItem('favorite-groups', JSON.stringify(groups));
        }}
        allItems={allItems}
        favoriteItems={favoriteItems}
      />
      <TooltipProvider delayDuration={300}>
        <SidebarProvider>
          <div className="flex h-screen w-full overflow-hidden">
          <Sidebar
            ref={sidebarRef}
            style={
              {
                "--sidebar-width": `${sidebarWidth}px`,
              } as CSSProperties
            }
            className="border-r"
          >
            <SidebarHeader className="border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Scale className="h-4 w-4" />
                  </div>
                  {!isCollapsed && (
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">SintraPrime</span>
                      <span className="text-[10px] text-muted-foreground">Legal AI Platform</span>
                    </div>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                            >
                              <Layers className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <span>Sidebar Presets</span>
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => applyPreset('compact')}>
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded border-2 border-current" />
                            <div>
                              <div className="font-medium">Compact</div>
                              <div className="text-xs text-muted-foreground">240px, tight spacing</div>
                            </div>
                            {currentPreset === 'compact' && <span className="ml-auto">✓</span>}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyPreset('balanced')}>
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded border-2 border-current" />
                            <div>
                              <div className="font-medium">Balanced</div>
                              <div className="text-xs text-muted-foreground">280px, standard spacing</div>
                            </div>
                            {currentPreset === 'balanced' && <span className="ml-auto">✓</span>}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyPreset('spacious')}>
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded border-2 border-current" />
                            <div>
                              <div className="font-medium">Spacious</div>
                              <div className="text-xs text-muted-foreground">320px, comfortable spacing</div>
                            </div>
                            {currentPreset === 'spacious' && <span className="ml-auto">✓</span>}
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => applyPreset('professional')}>
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 rounded border-2 border-current" />
                            <div>
                              <div className="font-medium">Professional</div>
                              <div className="text-xs text-muted-foreground">360px, generous spacing</div>
                            </div>
                            {currentPreset === 'professional' && <span className="ml-auto">✓</span>}
                          </div>
                        </DropdownMenuItem>
                        <Separator className="my-1" />
                        <DropdownMenuItem onClick={exportConfiguration}>
                          <Download className="h-4 w-4 mr-2" />
                          Export Configuration
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.json';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) importConfiguration(file);
                            };
                            input.click();
                          }}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Import Configuration
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setIsSettingsPanelOpen(true)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <span>Sidebar Settings</span>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={handleCollapseAll}
                        >
                          <ChevronsUpDown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <span>{areAllSectionsCollapsed ? 'Expand All' : 'Collapse All'}</span>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>
            </SidebarHeader>

            <SidebarContent className="px-2 py-4">
              {/* Search Filter */}
              {!isCollapsed && (
                <div className="px-2 mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search menu..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {/* Pinned Items */}
              {!searchQuery && pinnedItems.length > 0 && (
                <>
                  <SidebarGroup>
                    <SidebarGroupLabel className="text-xs font-semibold text-primary">
                      Pinned
                    </SidebarGroupLabel>
                    <SidebarMenu className="gap-2 mt-2">
                      {pinnedItems.map((path) => {
                        const menuItem = allItems.find(mi => mi.path === path);
                        if (!menuItem) return null;
                        return (
                          <SidebarMenuItem key={path}>
                            <SidebarMenuButton
                              asChild
                              isActive={location === path}
                            >
                              <Link href={path}>
                                <menuItem.icon className="h-4 w-4" />
                                <span>{menuItem.label}</span>
                                <Pin
                                  className="h-3 w-3 ml-auto text-primary fill-primary cursor-pointer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    togglePin(path);
                                  }}
                                />
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroup>
                  <Separator className="my-4" />
                </>
              )}

              {/* Recent Items */}
              {!searchQuery && showRecentSection && recentItems.length > 0 && (
                <>
                  <SidebarGroup>
                    <div className="flex items-center justify-between px-2 mb-2">
                      <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground mb-0">
                        Recent
                      </SidebarGroupLabel>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                        onClick={() => setIsClearRecentDialogOpen(true)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                    <SidebarMenu className="gap-2 mt-2">
                      {recentItems.map((item) => {
                        const menuItem = allItems.find(mi => mi.path === item.path);
                        if (!menuItem) return null;
                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              asChild
                              isActive={location === item.path}
                            >
                              <Link href={item.path}>
                                <menuItem.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroup>
                  <Separator className="my-4" />
                </>
              )}

              {/* Favorites Section */}
              {!searchQuery && favoriteItems.length > 0 && (
                <>
                  <SidebarGroup>
                    <div className="flex items-center justify-between px-2 mb-2">
                      <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground">
                        Favorites
                      </SidebarGroupLabel>
                      {!isCollapsed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => setIsGroupsManagerOpen(true)}
                        >
                          Manage
                        </Button>
                      )}
                    </div>

                    {/* Render grouped favorites */}
                    {Object.keys(favoriteGroups).length > 0 && (
                      <div className="space-y-2 mb-2">
                        {Object.entries(favoriteGroups).map(([groupName, groupPaths]) => {
                          const groupItems = groupPaths
                            .map(path => allItems.find(item => item.path === path))
                            .filter((item): item is typeof allItems[0] => item !== undefined);
                          
                          if (groupItems.length === 0) return null;

                          return (
                            <Collapsible key={groupName} defaultOpen={false}>
                              <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors group/folder">
                                <span className="text-xs font-medium">{groupName}</span>
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                  {groupItems.length}
                                </Badge>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenu className="gap-1 mt-1 ml-2">
                                  {groupItems.map(item => (
                                    <SidebarMenuItem key={item.path}>
                                      <SidebarMenuButton
                                        asChild
                                        isActive={location === item.path}
                                        className="text-sm"
                                      >
                                        <Link href={item.path}>
                                          <item.icon className="h-3.5 w-3.5" />
                                          <span>{item.label}</span>
                                        </Link>
                                      </SidebarMenuButton>
                                    </SidebarMenuItem>
                                  ))}
                                </SidebarMenu>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    )}

                    {/* Ungrouped favorites with drag-and-drop */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={favoriteItems}
                        strategy={verticalListSortingStrategy}
                      >
                        <SidebarMenu className="gap-2 mt-2">
                          {favoriteItems
                            .filter(path => {
                              // Only show items not in any group
                              return !Object.values(favoriteGroups).some(groupPaths => groupPaths.includes(path));
                            })
                            .map(path => allItems.find(item => item.path === path))
                            .filter((item): item is typeof allItems[0] => item !== undefined)
                            .map(item => (
                              <SortableFavoriteItem
                                key={item.path}
                                item={item}
                                location={location}
                              />
                            ))}
                        </SidebarMenu>
                      </SortableContext>
                    </DndContext>
                  </SidebarGroup>
                  <Separator className="my-4" />
                </>
              )}

              {/* Main Menu */}
              {!searchQuery && (
                <SidebarGroup>
                  <SidebarMenu className="gap-1">
                    {mainMenuItems.map(item => renderMenuItem(item))}
                  </SidebarMenu>
                </SidebarGroup>
              )}

              {!searchQuery && <Separator className="my-4" />}

              {/* Featured AI Tools */}
              {!searchQuery && (
                <>
                  <SidebarGroup>
                    <SidebarGroupLabel className="text-xs font-semibold text-primary">
                      Featured AI
                    </SidebarGroupLabel>
                    <SidebarMenu className="gap-4 mt-2">
                      {featuredAIItems.map(renderFeaturedAIItem)}
                    </SidebarMenu>
                  </SidebarGroup>
                  <Separator className="my-4" />
                </>
              )}

              {/* Collapsible Sections or Search Results */}
              {searchQuery ? (
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-semibold">
                    Search Results
                  </SidebarGroupLabel>
                  <SidebarMenu className="gap-2 mt-2">
                    {allItems
                      .filter(item => 
                        item.label.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((item) => (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton
                            asChild
                            isActive={location === item.path}
                            className="h-auto py-2"
                          >
                            <Link href={item.path} className="flex-col items-start gap-0.5">
                              <div className="flex items-center w-full">
                                <item.icon className="h-4 w-4 mr-2" />
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: item.label.replace(
                                      new RegExp(searchQuery, 'gi'),
                                      (match) => `<mark class="bg-yellow-200 dark:bg-yellow-900">${match}</mark>`
                                    )
                                  }}
                                />
                              </div>
                              {item.description && (
                                <span className="text-[10px] text-muted-foreground ml-6">
                                  {item.description}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                  </SidebarMenu>
                </SidebarGroup>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleSectionDragEnd}
                >
                  <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                    {sectionOrder.filter(sectionId => sectionVisibility[sectionId]).map((sectionId) => {
                      switch (sectionId) {
                        case 'ai-tools':
                          return <div key="ai-tools">{renderCollapsibleSection("More AI Tools", additionalAIItems, Brain, aiToolsOpen, setAiToolsOpen, `⌘${customShortcuts['ai-tools'] || '1'}`)}</div>;
                        case 'power-tools':
                          return <div key="power-tools">{renderCollapsibleSection("Power Tools", powerToolsItems, Wrench, powerToolsOpen, setPowerToolsOpen, `⌘${customShortcuts['power-tools'] || '2'}`)}</div>;
                        case 'case-management':
                          return <div key="case-management">{renderCollapsibleSection("Case Management", caseManagementItems, Briefcase, caseManagementOpen, setCaseManagementOpen, `⌘${customShortcuts['case-mgmt'] || '3'}`)}</div>;
                        case 'team':
                          return <div key="team">{renderCollapsibleSection("Team & Collaboration", teamItems, Users, teamOpen, setTeamOpen, `⌘${customShortcuts['team'] || '4'}`)}</div>;
                        case 'governance':
                          return <div key="governance">{renderCollapsibleSection("Governance", governanceItems, Shield, governanceOpen, setGovernanceOpen, `⌘${customShortcuts['governance'] || '6'}`)}</div>;
                        case 'settings':
                          return <div key="settings">{renderCollapsibleSection("Settings", settingsItems, Settings2, settingsOpen, setSettingsOpen, `⌘${customShortcuts['settings'] || '5'}`)}</div>;
                        default:
                          return null;
                      }
                    })}
                  </SortableContext>
                </DndContext>
              )}
            </SidebarContent>

            <SidebarFooter className="border-t p-3">
              {!isCollapsed && (
                <>
                  <div className="px-2 py-2 mb-2 rounded-lg bg-muted/50 text-[10px] text-muted-foreground leading-tight">
                    SintraPrime is a tool, not a lawyer. It does not provide legal advice or representation.
                  </div>
                  <Link
                    href="/circular-230"
                    className="px-2 py-1.5 mb-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-[10px] text-amber-800 dark:text-amber-200 leading-tight hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors flex items-start gap-1.5"
                  >
                    <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>IRS Circular 230 Notice:</strong> This platform does not provide tax advice. Not authorized to practice before the IRS. <span className="underline">View full disclosure</span>
                    </span>
                  </Link>
                </>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 px-2"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">
                        {user.name?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-medium truncate max-w-[180px]">
                          {user.name || "User"}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {user.email || ""}
                        </span>
                      </div>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => setLocation("/settings")}
                    className="cursor-pointer"
                  >
                    <Settings2 className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>

            {!isCollapsed && (
              <div
                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors group"
                onMouseDown={handleResizeMouseDown}
              >
                <div className="absolute inset-0 group-hover:bg-primary/30 transition-colors" />
              </div>
            )}
          </Sidebar>

          <SidebarInset className="flex flex-col flex-1 overflow-hidden">
            <header className="flex h-14 items-center gap-4 border-b px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-6" />
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => setIsCommandPaletteOpen(true)}
              >
                <Search className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Search...</span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
              <NotificationBell />
            </header>
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
      </TooltipProvider>

      {/* Sidebar Settings Panel */}
      <Dialog open={isSettingsPanelOpen} onOpenChange={setIsSettingsPanelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sidebar Settings</DialogTitle>
            <DialogDescription>
              Customize which sections appear in your sidebar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Section Visibility</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="ai-tools" className="text-sm cursor-pointer">More AI Tools</label>
                  <input
                    type="checkbox"
                    id="ai-tools"
                    checked={sectionVisibility['ai-tools']}
                    onChange={() => toggleSectionVisibility('ai-tools')}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="power-tools" className="text-sm cursor-pointer">Power Tools</label>
                  <input
                    type="checkbox"
                    id="power-tools"
                    checked={sectionVisibility['power-tools']}
                    onChange={() => toggleSectionVisibility('power-tools')}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="case-management" className="text-sm cursor-pointer">Case Management</label>
                  <input
                    type="checkbox"
                    id="case-management"
                    checked={sectionVisibility['case-management']}
                    onChange={() => toggleSectionVisibility('case-management')}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="team" className="text-sm cursor-pointer">Team & Collaboration</label>
                  <input
                    type="checkbox"
                    id="team"
                    checked={sectionVisibility['team']}
                    onChange={() => toggleSectionVisibility('team')}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label htmlFor="settings-section" className="text-sm cursor-pointer">Settings</label>
                  <input
                    type="checkbox"
                    id="settings-section"
                    checked={sectionVisibility['settings']}
                    onChange={() => toggleSectionVisibility('settings')}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={showAllSections} className="flex-1">
                  Show All
                </Button>
                <Button variant="outline" size="sm" onClick={hideAllSections} className="flex-1">
                  Hide All
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Recent Confirmation Dialog */}
      <AlertDialog open={isClearRecentDialogOpen} onOpenChange={setIsClearRecentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Recent Items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all recent items from your sidebar. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearRecent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Keyboard Shortcuts Panel */}
      <KeyboardShortcutsPanel
        open={isKeyboardShortcutsPanelOpen}
        onOpenChange={setIsKeyboardShortcutsPanelOpen}
      />
    </>
  );
}
