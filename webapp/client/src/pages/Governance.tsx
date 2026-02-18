import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { Shield, AlertTriangle, CheckCircle, XCircle, TrendingUp, Clock, Search, Filter, Download } from 'lucide-react';
import GovernanceCharts from '@/components/GovernanceCharts';

function ExportReportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const exportReport = trpc.governanceReports.generateReceiptLedgerAudit.useMutation();
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      
      const result = await exportReport.mutateAsync({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        includeVerification: true,
      });
      
      // Download the PDF
      const blob = new Blob([Uint8Array.from(atob(result.pdf), c => c.charCodeAt(0))], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Button onClick={handleExport} disabled={isExporting}>
      <Download className="h-4 w-4 mr-2" />
      {isExporting ? 'Exporting...' : 'Export Report'}
    </Button>
  );
}

export default function Governance() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  
  // Fetch governance data
  const { data: healthData } = trpc.governance.getSystemHealth.useQuery();
  const { data: receipts } = trpc.governance.getRecentReceipts.useQuery({ limit: 50 });
  const { data: blockedActions } = trpc.governance.getBlockedActions.useQuery({ limit: 20 });
  const { data: spendingSummary } = trpc.governance.getSpendingSummary.useQuery();
  
  // Filter receipts
  const filteredReceipts = receipts?.filter((r: any) => {
    const matchesSearch = searchTerm === '' || 
      r.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.actor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || r.action === actionFilter;
    const matchesSeverity = severityFilter === 'all' || r.severity === severityFilter;
    return matchesSearch && matchesAction && matchesSeverity;
  }) || [];
  
  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getSeverityBadge = (severity?: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2">Governance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor system compliance, audit trail, and policy enforcement
          </p>
        </div>
        <ExportReportButton />
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/governance/alert-settings'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Alert Settings
            </CardTitle>
            <CardDescription>
              Configure compliance thresholds and notification channels
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/governance/alert-history'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alert History
            </CardTitle>
            <CardDescription>
              View and manage triggered governance alerts
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/governance/policy-templates'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Policy Templates
            </CardTitle>
            <CardDescription>
              Activate SOC2, GDPR, HIPAA compliance templates
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/governance/compliance-reports'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Compliance Reports
            </CardTitle>
            <CardDescription>
              Generate and download compliance audit reports
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/governance/report-schedules'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Report Schedules
            </CardTitle>
            <CardDescription>
              Manage automated report generation schedules
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = '/governance/audit-log'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Audit Log
            </CardTitle>
            <CardDescription>
              Search and filter complete governance audit trail
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
      
      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getComplianceColor(healthData?.compliance.score || 0)}`}>
              {healthData?.compliance.score || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthData?.compliance.issues.length || 0} issues detected
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{healthData?.receipts.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthData?.receipts.last24h || 0} in last 24h
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Requires Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {healthData?.receipts.requiresReview || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              High-severity actions
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spending</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${((spendingSummary?.current.monthly || 0) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {spendingSummary?.percentages.monthly.toFixed(1)}% of limit
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="receipts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="receipts">Receipt Ledger</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="blocked">Blocked Actions</TabsTrigger>
          <TabsTrigger value="spending">Spending Monitor</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Issues</TabsTrigger>
        </TabsList>
        
        {/* Receipt Ledger Tab */}
        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receipt Ledger</CardTitle>
              <CardDescription>
                Cryptographically verified audit trail of all system operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by action or actor..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Receipt List */}
              <div className="space-y-3">
                {filteredReceipts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No receipts found
                  </div>
                ) : (
                  filteredReceipts.map((receipt: any) => (
                    <div
                      key={receipt.receipt_id}
                      className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {receipt.action}
                          </code>
                          <Badge className={getSeverityBadge(receipt.severity)}>
                            {receipt.severity || 'low'}
                          </Badge>
                          {receipt.outcome === 'success' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(receipt.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Actor: <span className="font-mono">{receipt.actor}</span>
                      </div>
                      {receipt.requiresReview && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            Requires Review
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <GovernanceCharts />
        </TabsContent>
        
        {/* Blocked Actions Tab */}
        <TabsContent value="blocked" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blocked Actions</CardTitle>
              <CardDescription>
                Actions blocked by policy gates and security controls
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {blockedActions && blockedActions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No blocked actions
                  </div>
                ) : (
                  blockedActions?.map((action: any) => (
                    <div
                      key={action.receipt_id}
                      className="border border-red-200 rounded-lg p-4 bg-red-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <XCircle className="h-5 w-5 text-red-600" />
                          <code className="text-sm font-mono font-semibold">
                            {action.action.replace('blocked:', '')}
                          </code>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(action.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Actor: <span className="font-mono">{action.actor}</span>
                      </div>
                      <div className="text-sm bg-white rounded p-2 border">
                        {JSON.stringify(action.details, null, 2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Spending Monitor Tab */}
        <TabsContent value="spending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Spending Monitor</CardTitle>
              <CardDescription>
                Track spending against daily, weekly, and monthly limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Daily Spending */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Daily Spending</span>
                    <span className="text-sm text-muted-foreground">
                      ${((spendingSummary?.current.daily || 0) / 100).toFixed(2)} / 
                      ${((spendingSummary?.limits.daily || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all"
                      style={{ width: `${Math.min(spendingSummary?.percentages.daily || 0, 100)}%` }}
                    />
                  </div>
                </div>
                
                {/* Weekly Spending */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Weekly Spending</span>
                    <span className="text-sm text-muted-foreground">
                      ${((spendingSummary?.current.weekly || 0) / 100).toFixed(2)} / 
                      ${((spendingSummary?.limits.weekly || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 transition-all"
                      style={{ width: `${Math.min(spendingSummary?.percentages.weekly || 0, 100)}%` }}
                    />
                  </div>
                </div>
                
                {/* Monthly Spending */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Monthly Spending</span>
                    <span className="text-sm text-muted-foreground">
                      ${((spendingSummary?.current.monthly || 0) / 100).toFixed(2)} / 
                      ${((spendingSummary?.limits.monthly || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 transition-all"
                      style={{ width: `${Math.min(spendingSummary?.percentages.monthly || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Compliance Issues Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Issues</CardTitle>
              <CardDescription>
                Active compliance issues requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthData?.compliance.issues.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-lg font-semibold">All Clear!</p>
                  <p className="text-muted-foreground">No compliance issues detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {healthData?.compliance.issues.map((issue: string, index: number) => (
                    <div
                      key={index}
                      className="border border-orange-200 rounded-lg p-4 bg-orange-50"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="font-medium">{issue}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
