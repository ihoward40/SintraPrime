import { useState } from "react";
import { Puzzle, Search, Download, Star, CheckCircle, Shield, Zap, BarChart2, Scale, Settings, Globe, X } from "lucide-react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";

const CATEGORY_ICONS: Record<string, any> = {
  ai: Zap, legal: Scale, productivity: Settings, integration: Globe,
  analytics: BarChart2, security: Shield, other: Puzzle,
};

const CATEGORY_COLORS: Record<string, string> = {
  ai: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  legal: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  productivity: "bg-green-500/20 text-green-300 border-green-500/30",
  integration: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  analytics: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  security: "bg-red-500/20 text-red-300 border-red-500/30",
  other: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

export default function PluginMarketplace() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);

  const { data: plugins, refetch: refetchPlugins } = trpc.pluginMarketplace.listPlugins.useQuery({
    search: search || undefined,
    category: activeCategory as any,
  });
  const { data: installed, refetch: refetchInstalled } = trpc.pluginMarketplace.getInstalled.useQuery();
  const { data: stats } = trpc.pluginMarketplace.getStats.useQuery();
  const install = trpc.pluginMarketplace.install.useMutation();
  const uninstall = trpc.pluginMarketplace.uninstall.useMutation();
  const toggle = trpc.pluginMarketplace.toggle.useMutation();

  const installedSlugs = new Set(installed?.map(i => {
    const idx = (i.pluginId as number) - 1;
    return i.pluginDetails?.slug ?? "";
  }) ?? []);

  const handleInstall = async (slug: string, name: string) => {
    await install.mutateAsync({ slug });
    refetchInstalled();
    toast({ title: "Plugin installed!", description: `${name} has been added to your workspace.` });
  };

  const handleUninstall = async (slug: string, name: string) => {
    await uninstall.mutateAsync({ slug });
    refetchInstalled();
    toast({ title: "Plugin removed", description: `${name} has been uninstalled.` });
  };

  const categories = ["ai", "legal", "productivity", "integration", "analytics", "security"];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-500/10 rounded-lg">
          <Puzzle className="h-6 w-6 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Plugin Marketplace</h1>
          <p className="text-gray-400 text-sm">Extend SintraPrime with powerful integrations and tools</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Plugins", value: stats?.totalPlugins ?? 0 },
          { label: "Verified", value: stats?.verifiedPlugins ?? 0 },
          { label: "Categories", value: stats?.categories ?? 0 },
          { label: "Total Downloads", value: (stats?.totalDownloads ?? 0).toLocaleString() },
        ].map(s => (
          <Card key={s.label} className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-gray-400 text-xs mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="browse">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="browse">Browse All</TabsTrigger>
          <TabsTrigger value="installed">Installed ({installed?.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-4">
          {/* Search & Filter */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search plugins..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            {activeCategory && (
              <Button variant="outline" onClick={() => setActiveCategory(undefined)} className="border-gray-600 text-gray-300">
                <X className="h-4 w-4 mr-2" /> Clear Filter
              </Button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => {
              const Icon = CATEGORY_ICONS[cat] ?? Puzzle;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? undefined : cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    activeCategory === cat ? CATEGORY_COLORS[cat] : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Plugin Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plugins?.map(plugin => {
              const Icon = CATEGORY_ICONS[plugin.category] ?? Puzzle;
              const isInstalled = installedSlugs.has(plugin.slug);
              return (
                <Card key={plugin.slug} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gray-700 rounded-lg">
                          <Icon className="h-4 w-4 text-gray-300" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{plugin.name}</p>
                          <p className="text-gray-500 text-xs">{plugin.author} • v{plugin.version}</p>
                        </div>
                      </div>
                      {plugin.verified && (
                        <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" title="Verified" />
                      )}
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{plugin.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={CATEGORY_COLORS[plugin.category]}>{plugin.category}</Badge>
                      <div className="ml-auto flex items-center gap-3 text-gray-500 text-xs">
                        <span className="flex items-center gap-1"><Star className="h-3 w-3" />{plugin.stars}</span>
                        <span className="flex items-center gap-1"><Download className="h-3 w-3" />{plugin.downloads.toLocaleString()}</span>
                      </div>
                    </div>
                    {isInstalled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                        onClick={() => handleUninstall(plugin.slug, plugin.name)}
                        disabled={uninstall.isPending}
                      >
                        <X className="h-3 w-3 mr-2" /> Uninstall
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => handleInstall(plugin.slug, plugin.name)}
                        disabled={install.isPending}
                      >
                        <Download className="h-3 w-3 mr-2" /> Install
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Installed Tab */}
        <TabsContent value="installed" className="space-y-3">
          {(!installed || installed.length === 0) && (
            <div className="text-center py-16 text-gray-500">
              <Puzzle className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No plugins installed yet. Browse the marketplace to get started.</p>
            </div>
          )}
          {installed?.map(up => {
            const plugin = up.pluginDetails;
            if (!plugin) return null;
            const Icon = CATEGORY_ICONS[plugin.category] ?? Puzzle;
            return (
              <Card key={up.id} className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-gray-700 rounded-lg">
                    <Icon className="h-5 w-5 text-gray-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">{plugin.name}</p>
                    <p className="text-gray-400 text-xs">{plugin.description.slice(0, 80)}...</p>
                  </div>
                  <Badge className={up.enabled ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
                    {up.enabled ? "Active" : "Disabled"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleUninstall(plugin.slug, plugin.name)}
                  >
                    Remove
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
