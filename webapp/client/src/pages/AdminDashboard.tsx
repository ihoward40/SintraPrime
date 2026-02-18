import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { Link } from 'wouter';
import ComplianceScoreCard from '@/components/ComplianceScoreCard';
import ComplianceScoreTrends from '@/components/ComplianceScoreTrends';
import AlertHistoryWidget from '@/components/AlertHistoryWidget';
import ReportSchedulesWidget from '@/components/ReportSchedulesWidget';

export default function AdminDashboard() {
  // Fetch governance data
  const { data: healthData } = trpc.governance.getSystemHealth.useQuery();
  const { data: pendingApprovals } = trpc.approvals.list.useQuery({ status: 'pending' });
  const { data: blockedActions } = trpc.governance.getBlockedActions.useQuery({ limit: 5 });
  const { data: spendingSummary } = trpc.governance.getSpendingSummary.useQuery();
  const { data: recentReceipts } = trpc.governance.getRecentReceipts.useQuery({ limit: 10 });
  
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
  
  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Centralized governance overview and system health monitoring
        </p>
      </div>
      
      {/* Key Metrics */}
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
            <Link href="/governance">
              <Button variant="link" className="p-0 h-auto mt-2 text-xs">
                View Details <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {pendingApprovals?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting review
            </p>
            <Link href="/governance/approvals">
              <Button variant="link" className="p-0 h-auto mt-2 text-xs">
                Review Now <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Policy Violations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {blockedActions?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 24 hours
            </p>
            <Link href="/governance">
              <Button variant="link" className="p-0 h-auto mt-2 text-xs">
                View Log <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Spending Status</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round((spendingSummary?.percentages.daily || 0))}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Daily limit used
            </p>
            <Link href="/governance">
              <Button variant="link" className="p-0 h-auto mt-2 text-xs">
                View Trends <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      {/* Compliance Score Trends */}
      <div className="mb-8">
        <ComplianceScoreTrends />
      </div>

      {/* Alert History & Report Schedules Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <AlertHistoryWidget />
        <ReportSchedulesWidget />
      </div>

      {/* Pending Approvals */}     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Pending Approval Requests</CardTitle>
            <CardDescription>
              High-risk operations requiring review
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!pendingApprovals || pendingApprovals.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold">All Clear!</p>
                <p className="text-muted-foreground">No pending approvals</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.slice(0, 5).map((approval: any) => (
                  <div
                    key={approval.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium">{approval.action}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {approval.justification}
                        </p>
                      </div>
                      <Badge className={getPriorityBadge(approval.priority)}>
                        {approval.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(approval.createdAt).toLocaleDateString()}</span>
                      {approval.estimatedCost && (
                        <span>${approval.estimatedCost.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                ))}
                {pendingApprovals.length > 5 && (
                  <Link href="/governance/approvals">
                    <Button variant="outline" className="w-full">
                      View All {pendingApprovals.length} Requests
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Recent Policy Violations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Policy Violations</CardTitle>
            <CardDescription>
              Blocked actions requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!blockedActions || blockedActions.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-semibold">All Clear!</p>
                <p className="text-muted-foreground">No violations detected</p>
              </div>
            ) : (
              <div className="space-y-3">
                {blockedActions.map((action: any) => (
                  <div
                    key={action.receipt_id}
                    className="border border-red-200 rounded-lg p-4 bg-red-50"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{action.action}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Actor: {action.actor}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(action.timestamp).toLocaleString()}
                          </span>
                          {action.severity && (
                            <Badge className={getSeverityBadge(action.severity)}>
                              {action.severity}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Spending Trends */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Spending Overview</CardTitle>
          <CardDescription>
            Current spending against policy limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Daily Limit</span>
                <span className="text-sm text-muted-foreground">
                  ${spendingSummary?.current.daily.toFixed(2) || '0.00'} / ${spendingSummary?.limits.daily.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    (spendingSummary?.percentages.daily || 0) > 90
                      ? 'bg-red-600'
                      : (spendingSummary?.percentages.daily || 0) > 75
                      ? 'bg-orange-600'
                      : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(spendingSummary?.percentages.daily || 0, 100)}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Weekly Limit</span>
                <span className="text-sm text-muted-foreground">
                  ${spendingSummary?.current.weekly.toFixed(2) || '0.00'} / ${spendingSummary?.limits.weekly.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    (spendingSummary?.percentages.weekly || 0) > 90
                      ? 'bg-red-600'
                      : (spendingSummary?.percentages.weekly || 0) > 75
                      ? 'bg-orange-600'
                      : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(spendingSummary?.percentages.weekly || 0, 100)}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Monthly Limit</span>
                <span className="text-sm text-muted-foreground">
                  ${spendingSummary?.current.monthly.toFixed(2) || '0.00'} / ${spendingSummary?.limits.monthly.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    (spendingSummary?.percentages.monthly || 0) > 90
                      ? 'bg-red-600'
                      : (spendingSummary?.percentages.monthly || 0) > 75
                      ? 'bg-orange-600'
                      : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(spendingSummary?.percentages.monthly || 0, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Trail</CardTitle>
          <CardDescription>
            Latest system actions and receipts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!recentReceipts || recentReceipts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold">No Activity</p>
              <p className="text-muted-foreground">No recent receipts found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentReceipts.map((receipt: any) => (
                <div
                  key={receipt.receipt_id}
                  className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{receipt.action}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {receipt.actor} • {new Date(receipt.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {receipt.severity && (
                        <Badge className={getSeverityBadge(receipt.severity)}>
                          {receipt.severity}
                        </Badge>
                      )}
                      <Badge variant={receipt.outcome === 'success' ? 'default' : 'destructive'}>
                        {receipt.outcome}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              <Link href="/governance">
                <Button variant="outline" className="w-full mt-4">
                  View Full Audit Trail
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
