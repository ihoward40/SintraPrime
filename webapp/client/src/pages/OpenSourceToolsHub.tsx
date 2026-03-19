/**
 * Open Source Tools Hub
 *
 * A comprehensive, interactive overview of the 10 top open-source tools
 * that replace paid software across hosting, AI voice, prompt testing,
 * RAG workflows, autonomous agents, database versioning, chatbot infrastructure,
 * meeting transcription, agent-native interfaces, and web automation.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Server,
  Mic,
  ShieldCheck,
  Database,
  Zap,
  GitBranch,
  Bot,
  Video,
  Terminal,
  Globe,
  Search,
  ExternalLink,
  Star,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Package,
  CheckCircle2,
  Lightbulb,
  Code2,
  Users,
  ArrowUpRight,
} from "lucide-react";

// ============================================================================
// Icon mapping
// ============================================================================

const ICON_MAP: Record<string, React.ElementType> = {
  Server,
  Mic,
  ShieldCheck,
  Database,
  Zap,
  GitBranch,
  Bot,
  Video,
  Terminal,
  Globe,
};

// ============================================================================
// Badge color mapping
// ============================================================================

const BADGE_VARIANT_MAP: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  blue: "default",
  purple: "default",
  red: "destructive",
  green: "secondary",
  orange: "default",
  teal: "secondary",
  indigo: "default",
  yellow: "outline",
};

const BADGE_CLASS_MAP: Record<string, string> = {
  blue: "bg-blue-500 text-white border-0",
  purple: "bg-purple-600 text-white border-0",
  red: "bg-red-500 text-white border-0",
  green: "bg-emerald-500 text-white border-0",
  orange: "bg-orange-500 text-white border-0",
  teal: "bg-teal-500 text-white border-0",
  indigo: "bg-indigo-500 text-white border-0",
  yellow: "bg-yellow-400 text-yellow-900 border-0",
};

// ============================================================================
// Types
// ============================================================================

type Tool = {
  id: number;
  name: string;
  slug: string;
  tagline: string;
  category: string;
  categorySlug: string;
  replaces: string;
  githubUrl: string;
  websiteUrl: string;
  stars: string;
  license: string;
  badge: string;
  badgeColor: string;
  icon: string;
  description: string;
  whyItMatters: string;
  features: string[];
  useCases: string[];
  trend: string;
};

type Category = {
  id: string;
  label: string;
  count: number;
};

// ============================================================================
// Tool Card Component
// ============================================================================

function ToolCard({
  tool,
  onSelect,
}: {
  tool: Tool;
  onSelect: (tool: Tool) => void;
}) {
  const IconComponent = ICON_MAP[tool.icon] || Package;
  const badgeClass = BADGE_CLASS_MAP[tool.badgeColor] || "";

  return (
    <Card
      className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 flex flex-col h-full"
      onClick={() => onSelect(tool)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight">{tool.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5 line-clamp-1">
                {tool.category}
              </CardDescription>
            </div>
          </div>
          <Badge className={`text-[10px] px-1.5 py-0.5 shrink-0 ${badgeClass}`}>
            {tool.badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-3">
        <p className="text-sm font-medium text-foreground leading-snug">
          {tool.tagline}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {tool.description}
        </p>

        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Replaces:</span>
            <span className="line-clamp-1">{tool.replaces}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                {tool.stars}
              </span>
              <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">
                {tool.license}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tool Detail Dialog
// ============================================================================

function ToolDetailDialog({
  tool,
  open,
  onClose,
}: {
  tool: Tool | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!tool) return null;
  const IconComponent = ICON_MAP[tool.icon] || Package;
  const badgeClass = BADGE_CLASS_MAP[tool.badgeColor] || "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <IconComponent className="h-7 w-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl">{tool.name}</DialogTitle>
                <Badge className={`text-xs ${badgeClass}`}>{tool.badge}</Badge>
              </div>
              <DialogDescription className="mt-1 text-sm font-medium text-foreground/80">
                {tool.tagline}
              </DialogDescription>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  {tool.stars} stars
                </span>
                <span className="bg-muted px-1.5 py-0.5 rounded font-mono">
                  {tool.license}
                </span>
                <span className="text-muted-foreground">{tool.category}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 mt-4">
          <div className="pr-4 space-y-6">
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="use-cases">Use Cases</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    What It Does
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Why It Matters
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {tool.whyItMatters}
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-blue-500" />
                    Replaces
                  </h3>
                  <p className="text-sm text-muted-foreground">{tool.replaces}</p>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    Trend
                  </h3>
                  <Badge variant="outline" className="text-xs capitalize">
                    #{tool.trend}
                  </Badge>
                </div>
              </TabsContent>

              {/* Features Tab */}
              <TabsContent value="features" className="mt-4">
                <div className="space-y-2">
                  {tool.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Use Cases Tab */}
              <TabsContent value="use-cases" className="mt-4">
                <div className="space-y-3">
                  {tool.useCases.map((useCase, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/50"
                    >
                      <Users className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        {useCase}
                      </span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        {/* Footer Links */}
        <div className="shrink-0 pt-4 border-t flex items-center gap-3 flex-wrap">
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={() => window.open(tool.githubUrl, "_blank")}
          >
            <GitBranch className="h-4 w-4" />
            View on GitHub
            <ArrowUpRight className="h-3 w-3" />
          </Button>
          {tool.websiteUrl && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.open(tool.websiteUrl, "_blank")}
            >
              <Globe className="h-4 w-4" />
              Official Website
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Stats Banner
// ============================================================================

function StatsBanner({
  stats,
}: {
  stats: { totalTools: number; totalCategories: number; totalStars: string } | undefined;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        {
          label: "Open-Source Tools",
          value: stats?.totalTools ?? 10,
          icon: Package,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          label: "Categories Covered",
          value: stats?.totalCategories ?? 10,
          icon: Sparkles,
          color: "text-purple-500",
          bg: "bg-purple-500/10",
        },
        {
          label: "Combined GitHub Stars",
          value: stats?.totalStars ?? "100k+",
          icon: Star,
          color: "text-yellow-500",
          bg: "bg-yellow-500/10",
        },
        {
          label: "Paid Tools Replaced",
          value: "30+",
          icon: TrendingUp,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
      ].map((stat, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function OpenSourceToolsHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: tools, isLoading } = trpc.openSourceTools.list.useQuery(
    {
      category: activeCategory !== "all" ? activeCategory : undefined,
      query: searchQuery || undefined,
    },
    { placeholderData: (prev) => prev }
  );

  const { data: categories } = trpc.openSourceTools.categories.useQuery();
  const { data: stats } = trpc.openSourceTools.stats.useQuery();

  const handleSelectTool = (tool: Tool) => {
    setSelectedTool(tool);
    setDetailOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Package className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Open Source Tools Hub
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                10 battle-tested open-source tools replacing paid software in
                2026
              </p>
            </div>
          </div>

          {/* Trend banner */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200 max-w-4xl">
            <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <strong>2026 Trend:</strong> Open-source software is increasingly
              challenging paid services by offering transparent, self-hostable,
              and flexible alternatives across hosting, AI voice, prompt testing,
              RAG workflows, autonomous agents, database versioning, chatbot
              infrastructure, meeting transcription, agent-native interfaces, and
              web automation.
            </span>
          </div>
        </div>

        {/* ── Stats Banner ────────────────────────────────────────────── */}
        <StatsBanner stats={stats} />

        {/* ── Search & Filter ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tools, features, or use cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* ── Category Tabs ───────────────────────────────────────────── */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {(categories ?? []).map((cat: Category) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? "default" : "outline"}
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
                {cat.id !== "all" && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    {cat.count}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* ── Tool Grid ───────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted/50" />
            ))}
          </div>
        ) : !tools || tools.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No tools found</p>
            <p className="text-sm">
              Try adjusting your search or category filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tools.map((tool: Tool) => (
              <ToolCard key={tool.id} tool={tool} onSelect={handleSelectTool} />
            ))}
          </div>
        )}

        {/* ── Conclusion Banner ───────────────────────────────────────── */}
        <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-base">
                  The Open-Source Revolution in 2026
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                  These ten tools collectively illustrate a powerful trend: the
                  open-source ecosystem is now mature enough to challenge — and
                  in many cases surpass — paid services across virtually every
                  category of software. From self-hostable PaaS platforms to
                  state-of-the-art AI voice synthesis, from LLM security testing
                  to autonomous agent harnesses, developers and teams can now
                  build production-grade infrastructure without subscription
                  lock-in. The combination of transparent code, community
                  governance, and self-hostability makes these tools not just
                  cost-effective alternatives, but often the superior choice for
                  teams that value control, privacy, and flexibility.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    "Self-Hosting",
                    "Cost Reduction",
                    "Data Sovereignty",
                    "No Vendor Lock-in",
                    "Community Driven",
                    "Production Ready",
                  ].map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tool Detail Dialog ──────────────────────────────────────── */}
      <ToolDetailDialog
        tool={selectedTool}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </DashboardLayout>
  );
}
