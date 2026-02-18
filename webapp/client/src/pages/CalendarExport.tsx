import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar, Download, Loader2, Clock, AlertTriangle,
  CalendarDays, CheckCircle2, FileDown
} from "lucide-react";

export default function CalendarExport() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("all");
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const { data: cases } = trpc.cases.list.useQuery();
  const { data: caseEventsData, isLoading } = trpc.caseEvents.list.useQuery(
    { caseId: selectedCaseId !== "all" ? parseInt(selectedCaseId) : 0 },
    { enabled: selectedCaseId !== "all" }
  );

  const generateIcsMutation = trpc.calendar.generateIcs.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.icsContent], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SintraPrime-Deadlines-${new Date().toISOString().split("T")[0]}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Calendar file downloaded! Import it into Google Calendar, Outlook, or Apple Calendar.");
    },
    onError: () => toast.error("Failed to generate calendar file"),
  });

  const events = useMemo(() => {
    if (!caseEventsData) return [];
    return caseEventsData.map((e: any, i: number) => ({
      ...e,
      _index: i,
    }));
  }, [caseEventsData]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedEvents(new Set(events.map((_: any, i: number) => i)));
    } else {
      setSelectedEvents(new Set());
    }
  };

  const handleToggleEvent = (index: number) => {
    const next = new Set(selectedEvents);
    if (next.has(index)) {
      next.delete(index);
      setSelectAll(false);
    } else {
      next.add(index);
      if (next.size === events.length) setSelectAll(true);
    }
    setSelectedEvents(next);
  };

  const handleExport = () => {
    const selected = events.filter((_: any, i: number) => selectedEvents.has(i));
    if (selected.length === 0) {
      toast.error("Please select at least one event to export");
      return;
    }
    const calEvents = selected.map((e: any) => ({
      title: `[SintraPrime] ${e.title}`,
      description: e.description || `Case event: ${e.title}\nType: ${e.eventType || "general"}`,
      startDate: e.eventDate ? new Date(e.eventDate).toISOString() : new Date().toISOString(),
      endDate: e.eventDate ? new Date(new Date(e.eventDate).getTime() + 3600000).toISOString() : undefined,
    }));
    generateIcsMutation.mutate({ events: calEvents });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "deadline": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "hearing": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "filing": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "correspondence": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          Calendar Export
        </h1>
        <p className="text-muted-foreground mt-1">
          Export case deadlines and events to Google Calendar, Outlook, or Apple Calendar
        </p>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">1. Select Events</p>
                <p className="text-sm text-muted-foreground">Choose which case events and deadlines to export</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <FileDown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">2. Download .ICS File</p>
                <p className="text-sm text-muted-foreground">Get a standard calendar file with built-in reminders</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full p-2">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">3. Import to Calendar</p>
                <p className="text-sm text-muted-foreground">Open the .ICS file to add events to your calendar app</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Select */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Case Events</CardTitle>
              <CardDescription>
                Select events to include in the calendar export
              </CardDescription>
            </div>
            <Select value={selectedCaseId} onValueChange={(v) => { setSelectedCaseId(v); setSelectedEvents(new Set()); setSelectAll(false); }}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by case..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cases</SelectItem>
                {cases?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
              <p className="text-muted-foreground">
                Add timeline events to your cases first, then export them here.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                    id="select-all"
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select All ({events.length} events)
                  </label>
                </div>
                <Badge variant="secondary">
                  {selectedEvents.size} selected
                </Badge>
              </div>

              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {events.map((event: any, index: number) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedEvents.has(index) ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                      }`}
                      onClick={() => handleToggleEvent(index)}
                    >
                      <Checkbox
                        checked={selectedEvents.has(index)}
                        onCheckedChange={() => handleToggleEvent(index)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{event.title}</p>
                          <Badge className={getEventTypeColor(event.eventType || "")}>
                            {event.eventType || "event"}
                          </Badge>
                        </div>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {event.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono">
                          {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : "No date"}
                        </p>
                        {event.eventType === "deadline" && (
                          <div className="flex items-center gap-1 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            Deadline
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Each event will include 1-day and 3-day reminder alerts
                </p>
                <Button
                  onClick={handleExport}
                  disabled={selectedEvents.size === 0 || generateIcsMutation.isPending}
                >
                  {generateIcsMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating...</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" /> Export {selectedEvents.size} Events</>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium text-sm">Calendar Import Tips</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li><strong>Google Calendar:</strong> Go to Settings → Import & Export → Import, then select the .ICS file</li>
                <li><strong>Outlook:</strong> Double-click the .ICS file or drag it into your calendar</li>
                <li><strong>Apple Calendar:</strong> Double-click the .ICS file and choose which calendar to add events to</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
