import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import ReceiptVerificationModal from '@/components/ReceiptVerificationModal';

export default function GovernanceAuditLog() {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [verifyingReceipt, setVerifyingReceipt] = useState<any>(null);
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [hasSignatureFilter, setHasSignatureFilter] = useState<boolean | null>(null);
  const [chainVerifiedFilter, setChainVerifiedFilter] = useState<boolean | null>(null);
  const [minCost, setMinCost] = useState<string>('');
  const [maxCost, setMaxCost] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Export mutations
  const exportCSVMutation = trpc.governance.exportAuditLogCSV.useMutation();
  const exportPDFMutation = trpc.governance.exportAuditLogPDF.useMutation();

  // Handle export
  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      if (format === 'csv') {
        const result = await exportCSVMutation.mutateAsync({
          action: eventTypeFilter !== 'all' ? eventTypeFilter : undefined,
          actor: actorFilter !== 'all' ? actorFilter : undefined,
        });
        
        // Download CSV
        const blob = new Blob([result.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        a.click();
        window.URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        const result = await exportPDFMutation.mutateAsync({
          action: eventTypeFilter !== 'all' ? eventTypeFilter : undefined,
          actor: actorFilter !== 'all' ? actorFilter : undefined,
        });
        
        // Download PDF HTML (user can print to PDF)
        const blob = new Blob([result.html], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch receipt chain (audit log)
  const { data: receipts, isLoading, refetch } = trpc.governance.getRecentReceipts.useQuery(
    {
      action: eventTypeFilter !== 'all' ? eventTypeFilter : undefined,
      limit: 100,
    },
    {
      refetchInterval: 30000, // Poll every 30 seconds for new events
    }
  );

  // Extract unique actors and action types for filter dropdowns
  const uniqueActors = useMemo(() => {
    if (!receipts) return [];
    const actors = new Set(receipts.map((r: any) => r.actor));
    return Array.from(actors).sort();
  }, [receipts]);

  const uniqueActionTypes = useMemo(() => {
    if (!receipts) return [];
    const actions = new Set(receipts.map((r: any) => r.action));
    return Array.from(actions).sort();
  }, [receipts]);

  // Clear all filters
  const clearAllFilters = () => {
    setEventTypeFilter('all');
    setSeverityFilter('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setActorFilter('all');
    setActionTypeFilter('all');
    setHasSignatureFilter(null);
    setChainVerifiedFilter(null);
    setMinCost('');
    setMaxCost('');
    setCurrentPage(1);
  };

  // Client-side filtering by date range, severity, and search query
  const filteredReceipts = useMemo(() => {
    if (!receipts) return [];
    
    return receipts.filter((receipt: any) => {
      // Filter by date range
      if (startDate) {
        const receiptDate = new Date(receipt.timestamp);
        const start = new Date(startDate);
        if (receiptDate < start) return false;
      }
      if (endDate) {
        const receiptDate = new Date(receipt.timestamp);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include entire end date
        if (receiptDate > end) return false;
      }
      
      // Filter by severity
      if (severityFilter !== 'all') {
        const receiptSeverity = receipt.metadata?.severity;
        if (receiptSeverity !== severityFilter) return false;
      }
      
      // Filter by search query (full-text search)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const action = (receipt.action || '').toLowerCase();
        const actor = (receipt.actor || '').toLowerCase();
        const evidence = JSON.stringify(receipt.evidence || {}).toLowerCase();
        
        if (!action.includes(query) && !actor.includes(query) && !evidence.includes(query)) {
          return false;
        }
      }
      
      // Filter by actor
      if (actorFilter !== 'all' && receipt.actor !== actorFilter) {
        return false;
      }
      
      // Filter by action type
      if (actionTypeFilter !== 'all' && receipt.action !== actionTypeFilter) {
        return false;
      }
      
      // Filter by signature presence
      if (hasSignatureFilter !== null) {
        const hasSignature = !!receipt.signature;
        if (hasSignature !== hasSignatureFilter) {
          return false;
        }
      }
      
      // Filter by chain verification (simplified - just checks if previous_hash exists)
      if (chainVerifiedFilter !== null) {
        const hasChain = !!(receipt as any).previous_hash;
        if (hasChain !== chainVerifiedFilter) {
          return false;
        }
      }
      
      // Filter by cost range
      if (minCost || maxCost) {
        const cost = (receipt.details as any)?.cost || 0;
        if (minCost && cost < parseFloat(minCost)) {
          return false;
        }
        if (maxCost && cost > parseFloat(maxCost)) {
          return false;
        }
      }
      
      return true;
    });
  }, [receipts, startDate, endDate, severityFilter, searchQuery, actorFilter, actionTypeFilter, hasSignatureFilter, chainVerifiedFilter, minCost, maxCost]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredReceipts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedReceipts = filteredReceipts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [eventTypeFilter, severityFilter, startDate, endDate, searchQuery, pageSize]);

  const generateReport = trpc.governanceReports.generateReceiptLedgerAudit.useMutation({
    onSuccess: (data: any) => {
      // Create a download link for the generated report
      const blob = new Blob([data.content], { type: data.mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert(`Report exported successfully: ${data.filename}`);
    },
    onError: (error: any) => {
      alert(`Error generating report: ${error.message}`);
    },
  });

  // Export handler moved above

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getEventIcon = (action: string) => {
    if (action.includes('violation') || action.includes('blocked')) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    } else if (action.includes('approved')) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    } else if (action.includes('pending')) {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    } else {
      return <Shield className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Governance Audit Log</h1>
          <p className="text-muted-foreground mt-2">
            Filterable timeline of all governance events with cryptographic verification
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')} disabled={isExporting} className="gap-2">
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')} disabled={isExporting} className="gap-2">
            <FileText className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => refetch()} 
            className="gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Separator />

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Audit Log
          </CardTitle>
          <CardDescription>
            Search across actions, actors, and evidence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search audit log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter audit log by event type, severity, and date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="eventType">Event Type</Label>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger id="eventType">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="policy_violation">Policy Violations</SelectItem>
                  <SelectItem value="approval_request">Approval Requests</SelectItem>
                  <SelectItem value="limit_change">Limit Changes</SelectItem>
                  <SelectItem value="blocked_action">Blocked Actions</SelectItem>
                  <SelectItem value="compliance_check">Compliance Checks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity Level</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger id="severity">
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-4">Advanced Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="actor">Actor</Label>
                <Select value={actorFilter} onValueChange={setActorFilter}>
                  <SelectTrigger id="actor">
                    <SelectValue placeholder="All actors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actors</SelectItem>
                    {uniqueActors.map((actor) => (
                      <SelectItem key={actor} value={actor}>{actor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actionType">Action Type</Label>
                <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
                  <SelectTrigger id="actionType">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActionTypes.map((action) => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">Signature Status</Label>
                <Select 
                  value={hasSignatureFilter === null ? 'all' : hasSignatureFilter ? 'signed' : 'unsigned'} 
                  onValueChange={(v) => setHasSignatureFilter(v === 'all' ? null : v === 'signed')}
                >
                  <SelectTrigger id="signature">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="signed">Has Signature</SelectItem>
                    <SelectItem value="unsigned">No Signature</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chain">Chain Status</Label>
                <Select 
                  value={chainVerifiedFilter === null ? 'all' : chainVerifiedFilter ? 'linked' : 'unlinked'} 
                  onValueChange={(v) => setChainVerifiedFilter(v === 'all' ? null : v === 'linked')}
                >
                  <SelectTrigger id="chain">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="linked">Chain Linked</SelectItem>
                    <SelectItem value="unlinked">Not Linked</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minCost">Min Cost ($)</Label>
                <Input
                  id="minCost"
                  type="number"
                  placeholder="0"
                  value={minCost}
                  onChange={(e) => setMinCost(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxCost">Max Cost ($)</Label>
                <Input
                  id="maxCost"
                  type="number"
                  placeholder="Unlimited"
                  value={maxCost}
                  onChange={(e) => setMaxCost(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={clearAllFilters} variant="outline" className="w-full">
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Audit Timeline
          </CardTitle>
          <CardDescription>
            Chronological list of governance events with cryptographic verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading audit log...
            </div>
          ) : !filteredReceipts || filteredReceipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit events found for the selected filters
            </div>
          ) : (
            <>
              {/* Pagination Controls - Top */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="pageSize" className="text-sm">Show:</Label>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(value) => setPageSize(Number(value))}
                    >
                      <SelectTrigger id="pageSize" className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredReceipts.length)} of {filteredReceipts.length} events
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm font-medium px-2">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {paginatedReceipts.map((receipt: any) => (
                <div
                  key={receipt.receipt_id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex items-start gap-3 flex-1 cursor-pointer"
                      onClick={() => setSelectedEvent(receipt)}
                    >
                      {getEventIcon(receipt.action)}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{receipt.action}</h4>
                          {receipt.metadata && receipt.metadata.severity && (
                            <Badge className={getSeverityColor(receipt.metadata.severity)}>
                              {receipt.metadata.severity}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Actor: {receipt.actor} | {new Date(receipt.timestamp).toLocaleString()}
                        </p>
                        {receipt.metadata && receipt.metadata.description && (
                          <p className="text-sm">{receipt.metadata.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVerifyingReceipt(receipt);
                        }}
                        className="gap-1"
                      >
                        <Shield className="h-3 w-3" />
                        Verify
                      </Button>
                      {receipt.signature && (
                        <Badge variant="outline" className="gap-1">
                          <Shield className="h-3 w-3" />
                          Signed
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              </div>

              {/* Pagination Controls - Bottom */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredReceipts.length)} of {filteredReceipts.length} events
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm font-medium px-2">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Event Details Modal/Sidebar */}
      {selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>
              Detailed information and cryptographic verification for selected event
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Receipt ID</Label>
                <p className="font-mono text-sm">{selectedEvent.receipt_id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Timestamp</Label>
                <p className="text-sm">{new Date(selectedEvent.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Action</Label>
                <p className="text-sm">{selectedEvent.action}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Actor</Label>
                <p className="text-sm">{selectedEvent.actor}</p>
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-muted-foreground">Evidence Hash (SHA-256)</Label>
              <p className="font-mono text-xs break-all bg-muted p-2 rounded mt-1">
                {selectedEvent.evidence_hash || 'N/A'}
              </p>
            </div>

            {selectedEvent.signature && (
              <div>
                <Label className="text-muted-foreground">Digital Signature</Label>
                <p className="font-mono text-xs break-all bg-muted p-2 rounded mt-1">
                  {selectedEvent.signature}
                </p>
              </div>
            )}

            {selectedEvent.metadata && (
              <div>
                <Label className="text-muted-foreground">Metadata</Label>
                <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                  {JSON.stringify(selectedEvent.metadata, null, 2)}
                </pre>
              </div>
            )}

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setSelectedEvent(null)}
            >
              Close Details
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Receipt Verification Modal */}
      <ReceiptVerificationModal
        receipt={verifyingReceipt}
        isOpen={!!verifyingReceipt}
        onClose={() => setVerifyingReceipt(null)}
      />
    </div>
  );
}
