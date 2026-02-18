import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Search,
  Filter,
  Eye,
  Download,
  RefreshCw,
  AlertCircle,
  FileText,
  Calendar,
  MapPin,
  Bell,
  Plus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function CourtMonitoring() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourt, setSelectedCourt] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Mock data for demonstration - will be replaced with real tRPC queries
  const trackedCases = [
    {
      id: 1,
      caseNumber: "2:23-cv-12345",
      courtName: "Central District of California",
      title: "Smith v. Corporation Inc.",
      status: "Active",
      lastUpdate: new Date("2024-02-10"),
      nextHearing: new Date("2024-03-15"),
      docketEntries: 45,
      hasNewEntries: true,
    },
    {
      id: 2,
      caseNumber: "1:24-cv-00123",
      courtName: "Southern District of New York",
      title: "Johnson v. Tech Company LLC",
      status: "Active",
      lastUpdate: new Date("2024-02-14"),
      nextHearing: new Date("2024-04-01"),
      docketEntries: 23,
      hasNewEntries: false,
    },
    {
      id: 3,
      caseNumber: "3:23-cv-98765",
      courtName: "Northern District of Texas",
      title: "Williams v. Financial Services Corp",
      status: "Closed",
      lastUpdate: new Date("2024-01-20"),
      nextHearing: null,
      docketEntries: 67,
      hasNewEntries: false,
    },
  ];

  const handleRefresh = () => {
    toast.info("Refreshing Dockets", {
      description: "Checking PACER for updates...",
    });
    // TODO: Implement actual refresh logic
  };

  const handleViewDocket = (caseId: number) => {
    toast.info("Opening Docket", {
      description: "Loading case details...",
    });
    // TODO: Navigate to docket detail view
  };

  const handleDownloadDocket = (caseId: number) => {
    toast.info("Downloading Docket", {
      description: "Preparing PDF download...",
    });
    // TODO: Implement docket download
  };

  const filteredCases = trackedCases.filter((c) => {
    const matchesSearch =
      searchQuery === "" ||
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourt = selectedCourt === "all" || c.courtName === selectedCourt;
    const matchesStatus = selectedStatus === "all" || c.status === selectedStatus;
    return matchesSearch && matchesCourt && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#0a0e14]">
      {/* Header */}
      <div className="border-b border-[#1a1f2e] bg-[#0f1419] px-12 py-8">
        <div className="mx-auto max-w-[1800px]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Court Monitoring</h1>
              <p className="mt-2 text-base text-slate-400">
                Real-time tracking of federal court cases via PACER integration
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="border-[#2a3441] bg-[#1a1f2e] text-white hover:bg-[#2a3441]"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh All
              </Button>
              <Button className="bg-[#3b82f6] text-white hover:bg-[#2563eb]">
                <Plus className="mr-2 h-4 w-4" />
                Track New Case
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-[1800px] px-12 py-12">
        {/* Filters */}
        <Card className="mb-8 border-[#1a1f2e] bg-[#0f1419] p-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search by case number or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-[#2a3441] bg-[#1a1f2e] pl-10 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Court Filter */}
            <div>
              <Select value={selectedCourt} onValueChange={setSelectedCourt}>
                <SelectTrigger className="border-[#2a3441] bg-[#1a1f2e] text-white">
                  <SelectValue placeholder="All Courts" />
                </SelectTrigger>
                <SelectContent className="border-[#2a3441] bg-[#1a1f2e] text-white">
                  <SelectItem value="all">All Courts</SelectItem>
                  <SelectItem value="Central District of California">
                    Central District of California
                  </SelectItem>
                  <SelectItem value="Southern District of New York">
                    Southern District of New York
                  </SelectItem>
                  <SelectItem value="Northern District of Texas">
                    Northern District of Texas
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="border-[#2a3441] bg-[#1a1f2e] text-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="border-[#2a3441] bg-[#1a1f2e] text-white">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Statistics Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card className="border-[#1a1f2e] bg-[#0f1419] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Cases</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {trackedCases.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-[#3b82f6]" />
            </div>
          </Card>

          <Card className="border-[#1a1f2e] bg-[#0f1419] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Active Cases</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {trackedCases.filter((c) => c.status === "Active").length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-[#10b981]" />
            </div>
          </Card>

          <Card className="border-[#1a1f2e] bg-[#0f1419] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">New Updates</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {trackedCases.filter((c) => c.hasNewEntries).length}
                </p>
              </div>
              <Bell className="h-8 w-8 text-[#f59e0b]" />
            </div>
          </Card>

          <Card className="border-[#1a1f2e] bg-[#0f1419] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Upcoming Hearings</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {trackedCases.filter((c) => c.nextHearing).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-[#8b5cf6]" />
            </div>
          </Card>
        </div>

        {/* Cases Table */}
        <Card className="border-[#1a1f2e] bg-[#0f1419]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#1a1f2e] hover:bg-[#1a1f2e]">
                  <TableHead className="text-slate-300">Case Number</TableHead>
                  <TableHead className="text-slate-300">Title</TableHead>
                  <TableHead className="text-slate-300">Court</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Last Update</TableHead>
                  <TableHead className="text-slate-300">Next Hearing</TableHead>
                  <TableHead className="text-slate-300">Entries</TableHead>
                  <TableHead className="text-right text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((caseItem) => (
                  <TableRow
                    key={caseItem.id}
                    className="border-[#1a1f2e] hover:bg-[#1a1f2e]"
                  >
                    <TableCell className="font-mono text-sm text-white">
                      <div className="flex items-center gap-2">
                        {caseItem.hasNewEntries && (
                          <div className="h-2 w-2 rounded-full bg-[#3b82f6]" />
                        )}
                        {caseItem.caseNumber}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md text-white">
                      {caseItem.title}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {caseItem.courtName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          caseItem.status === "Active" ? "default" : "secondary"
                        }
                        className={
                          caseItem.status === "Active"
                            ? "bg-[#10b981] text-white"
                            : "bg-[#64748b] text-white"
                        }
                      >
                        {caseItem.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {format(caseItem.lastUpdate, "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {caseItem.nextHearing
                        ? format(caseItem.nextHearing, "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {caseItem.docketEntries}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDocket(caseItem.id)}
                          className="text-slate-300 hover:bg-[#1a1f2e] hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDownloadDocket(caseItem.id)}
                          className="text-slate-300 hover:bg-[#1a1f2e] hover:text-white"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredCases.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="mb-4 h-12 w-12 text-slate-400" />
              <p className="text-lg font-medium text-white">No cases found</p>
              <p className="mt-2 text-sm text-slate-400">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
