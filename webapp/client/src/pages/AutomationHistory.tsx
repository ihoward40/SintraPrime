import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Download, Eye, Trash2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AutomationHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch automation results
  const { data: results, isLoading, refetch } = trpc.automationResults.list.useQuery({
    demoType: filterType === "all" ? undefined : filterType,
    limit: 50,
    offset: 0
  });

  const deleteResult = trpc.automationResults.deleteResult.useMutation({
    onSuccess: () => {
      toast.success("Result deleted successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete: ${error.message}`);
    }
  });

  // Filter results based on search and status
  const filteredResults = results?.filter(result => {
    const matchesSearch = searchQuery === "" || 
      result.sessionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.demoType.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || result.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      failed: "destructive",
      running: "secondary"
    };
    return (
      <Badge variant={variants[status] || "outline"} className="gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  const getDemoTypeLabel = (demoType: string) => {
    const labels: Record<string, string> = {
      "web-scraping": "Web Scraping",
      "document-generation": "Document Generation",
      "video-creation": "Video Creation",
      "full-workflow": "Full Workflow"
    };
    return labels[demoType] || demoType;
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this automation result?")) {
      await deleteResult.mutateAsync({ id });
    }
  };

  const handleViewDetails = (result: any) => {
    toast.info("Result details viewer coming soon!");
    console.log("Result data:", result);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Automation History</h1>
          <p className="text-muted-foreground mt-2">
            View and manage past automation executions
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by session ID or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Demo Type Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Demo Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Demo Types</SelectItem>
                  <SelectItem value="web-scraping">Web Scraping</SelectItem>
                  <SelectItem value="document-generation">Document Generation</SelectItem>
                  <SelectItem value="video-creation">Video Creation</SelectItem>
                  <SelectItem value="full-workflow">Full Workflow</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Automation Results</CardTitle>
            <CardDescription>
              {filteredResults.length} result{filteredResults.length !== 1 ? "s" : ""} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading results...
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No automation results found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session ID</TableHead>
                      <TableHead>Demo Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-mono text-sm">
                          {result.sessionId.substring(0, 20)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getDemoTypeLabel(result.demoType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(result.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {result.startedAt ? format(new Date(result.startedAt), "MMM d, yyyy h:mm a") : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {result.duration ? `${result.duration}s` : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewDetails(result)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {result.recordingUrl && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => result.recordingUrl && window.open(result.recordingUrl, "_blank")}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(result.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
