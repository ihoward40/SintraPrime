import { useState } from "react";
import { Globe, Search, Scale, Building, Flag, AlertCircle, ExternalLink, ChevronDown, ChevronUp, Calendar, BookOpen } from "lucide-react";
import { trpc } from "../lib/trpc";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

const TYPE_COLORS: Record<string, string> = {
  federal: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  state: "bg-green-500/20 text-green-300 border-green-500/30",
  regulatory: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  international: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  county: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

const TYPE_ICONS: Record<string, any> = {
  federal: Building, state: Flag, regulatory: AlertCircle, international: Globe, county: Scale,
};

export default function JurisdictionDatabase() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const { data: jurisdictions } = trpc.jurisdiction.list.useQuery({
    search: search || undefined,
    type: typeFilter as any,
  });
  const { data: stats } = trpc.jurisdiction.getStats.useQuery();

  const types = ["federal", "state", "regulatory", "international"];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-teal-500/10 rounded-lg">
          <Globe className="h-6 w-6 text-teal-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Multi-Jurisdiction Legal Database</h1>
          <p className="text-gray-400 text-sm">Filing deadlines, local rules, and resources for all major jurisdictions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats?.total ?? 0 },
          { label: "Federal", value: stats?.federal ?? 0 },
          { label: "State", value: stats?.state ?? 0 },
          { label: "Regulatory", value: stats?.regulatory ?? 0 },
          { label: "International", value: stats?.international ?? 0 },
        ].map(s => (
          <Card key={s.label} className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-gray-400 text-xs">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search jurisdictions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-gray-700 border-gray-600 text-white"
          />
        </div>
        <div className="flex gap-2">
          {types.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? undefined : type)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                typeFilter === type ? TYPE_COLORS[type] : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Jurisdiction List */}
      <div className="space-y-3">
        {jurisdictions?.map(j => {
          const Icon = TYPE_ICONS[j.type] ?? Globe;
          const isExpanded = expandedCode === j.code;
          return (
            <Card key={j.code} className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors">
              <CardContent className="p-0">
                <button
                  className="w-full p-4 flex items-center gap-4 text-left"
                  onClick={() => setExpandedCode(isExpanded ? null : j.code)}
                >
                  <div className="p-2 bg-gray-700 rounded-lg flex-shrink-0">
                    <Icon className="h-4 w-4 text-gray-300" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm">{j.name}</p>
                      <Badge className="bg-gray-700 text-gray-400 border-gray-600 text-xs font-mono">{j.code}</Badge>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{j.courtSystem}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={TYPE_COLORS[j.type]}>{j.type}</Badge>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-700 pt-4 space-y-4">
                    <div>
                      <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Court System</p>
                      <p className="text-gray-300 text-sm">{j.courtSystem}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Filing Deadlines */}
                      <div>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Filing Deadlines
                        </p>
                        <div className="space-y-1">
                          {Object.entries(j.filingDeadlines as Record<string, string>).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2">
                              <span className="text-gray-500 text-xs capitalize min-w-[100px]">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                              <span className="text-gray-300 text-xs">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Local Rules */}
                      <div>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-1">
                          <BookOpen className="h-3 w-3" /> Local Rules
                        </p>
                        <div className="space-y-1">
                          {Object.entries(j.localRules as Record<string, string>).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2">
                              <span className="text-gray-500 text-xs capitalize min-w-[100px]">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                              <span className="text-gray-300 text-xs">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Resources */}
                    {Array.isArray(j.resources) && (j.resources as any[]).length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-2">Resources</p>
                        <div className="flex flex-wrap gap-2">
                          {(j.resources as any[]).map((r: any) => (
                            <a
                              key={r.url}
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs bg-blue-500/10 border border-blue-500/20 rounded px-2 py-1"
                            >
                              <ExternalLink className="h-3 w-3" /> {r.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
