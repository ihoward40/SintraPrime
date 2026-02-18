import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { useState, useMemo } from 'react';
import { TrendingUp, PieChart, BarChart3, Activity } from 'lucide-react';

export default function GovernanceCharts() {
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | '365'>('30');
  
  // Fetch receipts for charts
  const { data: receipts, isLoading } = trpc.governance.getRecentReceipts.useQuery(
    { limit: 1000 },
    { refetchInterval: 60000 } // Refresh every minute
  );

  // Calculate chart data
  const chartData = useMemo(() => {
    if (!receipts) return null;

    const now = Date.now();
    const daysAgo = parseInt(dateRange);
    const cutoffTime = now - daysAgo * 24 * 60 * 60 * 1000;

    // Filter receipts by date range
    const filteredReceipts = receipts.filter(r => 
      new Date(r.timestamp).getTime() >= cutoffTime
    );

    // 1. Spending Trend (daily aggregation)
    const spendingByDay: Record<string, number> = {};
    filteredReceipts.forEach(receipt => {
      const date = new Date(receipt.timestamp).toLocaleDateString();
      const cost = (receipt.details as any)?.cost || 0;
      spendingByDay[date] = (spendingByDay[date] || 0) + cost;
    });

    const spendingTrend = Object.entries(spendingByDay)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-30); // Last 30 days max

    // 2. Violations by Severity
    const violationsBySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    filteredReceipts.forEach(receipt => {
      const isViolation = 
        receipt.action?.toLowerCase().includes('violation') ||
        receipt.action?.toLowerCase().includes('blocked');
      
      if (isViolation) {
        const severity = (receipt.metadata as any)?.severity || 'low';
        violationsBySeverity[severity] = (violationsBySeverity[severity] || 0) + 1;
      }
    });

    // 3. Approval Request Status
    const approvalStatus = {
      pending: filteredReceipts.filter(r => r.action.includes('approval_request') && r.outcome === 'pending').length,
      approved: filteredReceipts.filter(r => r.action.includes('approval') && r.outcome === 'success').length,
      rejected: filteredReceipts.filter(r => r.action.includes('approval') && r.outcome === 'failure').length,
    };

    // 4. Compliance Score History (weekly)
    const weeklyCompliance: Array<{ week: string; score: number }> = [];
    const weeksToShow = Math.min(12, Math.floor(daysAgo / 7));
    
    for (let i = weeksToShow - 1; i >= 0; i--) {
      const weekEnd = now - i * 7 * 24 * 60 * 60 * 1000;
      const weekStart = weekEnd - 7 * 24 * 60 * 60 * 1000;
      
      const weekReceipts = receipts.filter(r => {
        const timestamp = new Date(r.timestamp).getTime();
        return timestamp >= weekStart && timestamp < weekEnd;
      });

      const violations = weekReceipts.filter(r => 
        r.action?.toLowerCase().includes('violation') ||
        r.action?.toLowerCase().includes('blocked')
      ).length;

      const score = weekReceipts.length > 0 
        ? Math.round((1 - violations / weekReceipts.length) * 100)
        : 100;

      weeklyCompliance.push({
        week: new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score,
      });
    }

    return {
      spendingTrend,
      violationsBySeverity,
      approvalStatus,
      weeklyCompliance,
    };
  }, [receipts, dateRange]);

  if (isLoading || !chartData) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader>
              <div className="animate-pulse space-y-2">
                <div className="h-5 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse h-64 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#6b7280',
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Governance Analytics</h3>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
            <SelectItem value="365">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Spending Trend
            </CardTitle>
            <CardDescription>Daily spending over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-1">
              {chartData.spendingTrend.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No spending data available
                </div>
              ) : (
                chartData.spendingTrend.map(([date, amount], index) => {
                  const maxAmount = Math.max(...chartData.spendingTrend.map(([, a]) => a));
                  const height = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                  
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center gap-1 group"
                    >
                      <div
                        className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors relative"
                        style={{ height: `${height}%` }}
                        title={`${date}: $${amount.toFixed(2)}`}
                      >
                        <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ${amount.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-4 text-xs text-muted-foreground text-center">
              Hover over bars to see details
            </div>
          </CardContent>
        </Card>

        {/* Violations by Severity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Violations by Severity
            </CardTitle>
            <CardDescription>Policy violation breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {Object.values(chartData.violationsBySeverity).every(v => v === 0) ? (
                <div className="text-center text-muted-foreground">
                  <p className="text-4xl mb-2">🎉</p>
                  <p>No violations detected</p>
                </div>
              ) : (
                <div className="w-full space-y-4">
                  {Object.entries(chartData.violationsBySeverity).map(([severity, count]) => {
                    const total = Object.values(chartData.violationsBySeverity).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    
                    return (
                      <div key={severity} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize font-medium">{severity}</span>
                          <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3">
                          <div
                            className="h-3 rounded-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: getSeverityColor(severity),
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Approval Request Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Approval Request Status
            </CardTitle>
            <CardDescription>Request distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-around gap-4">
              {[
                { label: 'Pending', count: chartData.approvalStatus.pending, color: '#eab308' },
                { label: 'Approved', count: chartData.approvalStatus.approved, color: '#22c55e' },
                { label: 'Rejected', count: chartData.approvalStatus.rejected, color: '#ef4444' },
              ].map(({ label, count, color }) => {
                const maxCount = Math.max(
                  chartData.approvalStatus.pending,
                  chartData.approvalStatus.approved,
                  chartData.approvalStatus.rejected,
                  1
                );
                const height = (count / maxCount) * 100;

                return (
                  <div key={label} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center" style={{ height: '200px' }}>
                      <div
                        className="w-full rounded-t hover:opacity-80 transition-opacity"
                        style={{
                          height: `${height}%`,
                          backgroundColor: color,
                        }}
                        title={`${label}: ${count}`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Score History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Compliance Score History
            </CardTitle>
            <CardDescription>Weekly compliance trend</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-1">
              {chartData.weeklyCompliance.map((week, index) => {
                const height = week.score;
                const color = week.score >= 90 ? '#22c55e' : week.score >= 70 ? '#eab308' : '#ef4444';

                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center gap-1 group"
                  >
                    <div
                      className="w-full rounded-t hover:opacity-80 transition-opacity relative"
                      style={{
                        height: `${height}%`,
                        backgroundColor: color,
                      }}
                      title={`${week.week}: ${week.score}%`}
                    >
                      <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {week.score}%
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground transform -rotate-45 origin-top-left mt-2">
                      {week.week}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
