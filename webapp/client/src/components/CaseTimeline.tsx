import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Shield, Calendar, Flag, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Filter } from "lucide-react";

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
  type: "event" | "document" | "evidence" | "milestone";
  category: string;
}

const TYPE_CONFIG = {
  event: { icon: Calendar, color: "bg-blue-500", label: "Event", badgeVariant: "default" as const },
  document: { icon: FileText, color: "bg-emerald-500", label: "Document", badgeVariant: "secondary" as const },
  evidence: { icon: Shield, color: "bg-amber-500", label: "Evidence", badgeVariant: "outline" as const },
  milestone: { icon: Flag, color: "bg-purple-500", label: "Milestone", badgeVariant: "default" as const },
};

export default function CaseTimeline({ caseId }: { caseId: number }) {
  const { data, isLoading } = trpc.timeline.get.useQuery({ caseId });
  const [filterType, setFilterType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = normal, 0.5 = zoomed out, 2 = zoomed in
  const itemsPerPage = Math.round(10 * zoomLevel);

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (filterType === "all") return data.items;
    return data.items.filter((item: TimelineItem) => item.type === filterType);
  }, [data?.items, filterType]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = filteredItems.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading timeline...
        </CardContent>
      </Card>
    );
  }

  if (!data?.items?.length) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No timeline events yet</p>
          <p className="text-sm mt-1">Add events, documents, or evidence to see them on the timeline.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Case Timeline
            <Badge variant="secondary" className="ml-2">{filteredItems.length} items</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(0); }}>
              <SelectTrigger className="w-[160px] h-8">
                <Filter className="w-3.5 h-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="event">Events</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="evidence">Evidence</SelectItem>
                <SelectItem value="milestone">Milestones</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 border rounded-md px-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.5))}
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs w-8 text-center">{zoomLevel}x</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.5))}
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Horizontal mini-timeline bar */}
        <div className="mb-6 relative">
          <div className="h-2 bg-muted rounded-full overflow-hidden flex">
            {data.items.map((item: TimelineItem, i: number) => {
              const config = TYPE_CONFIG[item.type];
              const width = 100 / data.items.length;
              return (
                <div
                  key={item.id}
                  className={`${config.color} opacity-70 hover:opacity-100 transition-opacity cursor-pointer`}
                  style={{ width: `${width}%`, minWidth: "2px" }}
                  title={`${item.title} (${new Date(item.date).toLocaleDateString()})`}
                />
              );
            })}
          </div>
          {data.items.length > 1 && (
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">
                {new Date(data.items[0].date).toLocaleDateString()}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(data.items[data.items.length - 1].date).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Vertical timeline */}
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-4">
            {paginatedItems.map((item: TimelineItem) => {
              const config = TYPE_CONFIG[item.type];
              const Icon = config.icon;
              const itemDate = new Date(item.date);
              const isToday = new Date().toDateString() === itemDate.toDateString();
              const isFuture = itemDate > new Date();

              return (
                <div key={item.id} className="relative flex gap-4 items-start group">
                  <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${config.color} flex items-center justify-center shadow-sm ring-2 ring-background ${isFuture ? "opacity-60 ring-dashed" : ""}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className={`flex-1 bg-card border rounded-lg p-3 shadow-sm group-hover:shadow-md transition-shadow ${isToday ? "ring-2 ring-primary/30" : ""} ${isFuture ? "opacity-70 border-dashed" : ""}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.title}</span>
                        <Badge variant={config.badgeVariant} className="text-[10px] h-5">
                          {config.label}
                        </Badge>
                        {isToday && (
                          <Badge variant="default" className="text-[10px] h-5 bg-primary">
                            Today
                          </Badge>
                        )}
                        {isFuture && (
                          <Badge variant="outline" className="text-[10px] h-5">
                            Upcoming
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {itemDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.category && item.category !== item.type && (
                      <span className="text-[10px] text-muted-foreground mt-1 inline-block">
                        {item.category}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t">
          {Object.entries(TYPE_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
              <span className="text-[11px] text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
