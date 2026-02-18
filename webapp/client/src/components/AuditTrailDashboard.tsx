import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Search, Filter, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function AuditTrailDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");

  const { data: auditEntries, isLoading } = trpc.auditTrail.getAuditTrail.useQuery({
    eventType: eventTypeFilter === "all" ? undefined : eventTypeFilter,
    startDate: dateRangeStart || undefined,
    endDate: dateRangeEnd || undefined,
  });

  const getEventTypeColor = (eventType: string) => {
    const colors: Record<string, string> = {
      document_upload: "bg-blue-100 text-blue-800",
      document_processing: "bg-purple-100 text-purple-800",
      document_verification: "bg-green-100 text-green-800",
      journal_entry_create: "bg-amber-100 text-amber-800",
      journal_entry_update: "bg-yellow-100 text-yellow-800",
      journal_entry_delete: "bg-red-100 text-red-800",
      trust_account_create: "bg-teal-100 text-teal-800",
      trust_account_update: "bg-cyan-100 text-cyan-800",
      dni_calculation: "bg-indigo-100 text-indigo-800",
      k1_generation: "bg-pink-100 text-pink-800",
      form1041_generation: "bg-violet-100 text-violet-800",
      efile_submission: "bg-emerald-100 text-emerald-800",
    };
    return colors[eventType] || "bg-gray-100 text-gray-800";
  };

  const getEventTypeLabel = (eventType: string) => {
    return eventType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleExportCSV = () => {
    if (!auditEntries || auditEntries.length === 0) {
      toast.error("No audit entries to export");
      return;
    }

    const headers = ["Timestamp", "User ID", "Event Type", "Entity Type", "Entity ID", "Action"];
    const rows = auditEntries.map((entry) => [
      new Date(entry.createdAt).toLocaleString(),
      entry.userId.toString(),
      getEventTypeLabel(entry.eventType),
      entry.entityType,
      entry.entityId.toString(),
      entry.action,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-trail-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success("Audit trail exported to CSV");
  };

  const filteredEntries = auditEntries?.filter((entry) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      entry.eventType.toLowerCase().includes(searchLower) ||
      entry.entityType.toLowerCase().includes(searchLower) ||
      entry.action.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Audit Trail Dashboard
          </CardTitle>
          <CardDescription>
            Comprehensive audit log of all document changes, journal entries, and system operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Event Type</label>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="document_upload">Document Upload</SelectItem>
                  <SelectItem value="document_processing">Document Processing</SelectItem>
                  <SelectItem value="document_verification">Document Verification</SelectItem>
                  <SelectItem value="journal_entry_create">Journal Entry Create</SelectItem>
                  <SelectItem value="journal_entry_update">Journal Entry Update</SelectItem>
                  <SelectItem value="trust_account_create">Trust Account Create</SelectItem>
                  <SelectItem value="dni_calculation">DNI Calculation</SelectItem>
                  <SelectItem value="k1_generation">K-1 Generation</SelectItem>
                  <SelectItem value="form1041_generation">Form 1041 Generation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
              />
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <Button onClick={handleExportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export to CSV
            </Button>
          </div>

          {/* Audit Entries */}
          <div className="space-y-3">
            {isLoading && (
              <div className="text-center py-12 text-muted-foreground">Loading audit trail...</div>
            )}

            {!isLoading && filteredEntries && filteredEntries.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No audit entries found matching your filters
              </div>
            )}

            {!isLoading &&
              filteredEntries &&
              filteredEntries.map((entry) => (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getEventTypeColor(entry.eventType)}>
                            {getEventTypeLabel(entry.eventType)}
                          </Badge>
                          <Badge variant="outline">{entry.action}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Entity Type:</span>
                            <span className="ml-2 font-medium">{entry.entityType}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Entity ID:</span>
                            <span className="ml-2 font-mono">{entry.entityId}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">User ID:</span>
                            <span className="ml-2 font-mono">{entry.userId}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Timestamp:</span>
                            <span className="ml-2">
                              {new Date(entry.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {(entry.changes && typeof entry.changes === 'object') ? (
                          <>
                            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Changes:
                              </p>
                              <pre className="text-xs overflow-x-auto">
                                {String(JSON.stringify(entry.changes as Record<string, unknown>, null, 2))}
                              </pre>
                            </div>
                          </>
                        ) : null}

                        {(entry.metadata && typeof entry.metadata === 'object') ? (
                          <>
                            <div className="mt-2 text-xs text-muted-foreground">
                              <span>Metadata: </span>
                              <span className="font-mono">
                                {String(JSON.stringify(entry.metadata as Record<string, unknown>))}
                              </span>
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
