import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useMemo } from 'react';

export default function ComplianceScoreCard() {
  // Fetch recent receipts for compliance calculation
  const { data: receipts, isLoading } = trpc.governance.getRecentReceipts.useQuery(
    { limit: 1000 },
    { refetchInterval: 30000 }
  );

  // Calculate compliance metrics
  const complianceMetrics = useMemo(() => {
    if (!receipts || receipts.length === 0) {
      return {
        score: 100,
        trend: 'stable' as const,
        violations7d: 0,
        violations30d: 0,
        totalActions: 0,
        complianceRate: 100,
      };
    }

    const now = Date.now();
    const day7Ago = now - 7 * 24 * 60 * 60 * 1000;
    const day30Ago = now - 30 * 24 * 60 * 60 * 1000;

    // Count violations by time period
    let violations7d = 0;
    let violations30d = 0;
    let totalActions = receipts.length;

    receipts.forEach((receipt: any) => {
      const timestamp = new Date(receipt.timestamp).getTime();
      const isViolation = 
        receipt.action?.toLowerCase().includes('violation') ||
        receipt.action?.toLowerCase().includes('blocked') ||
        receipt.metadata?.severity === 'critical' ||
        receipt.metadata?.severity === 'high';

      if (isViolation) {
        if (timestamp >= day7Ago) violations7d++;
        if (timestamp >= day30Ago) violations30d++;
      }
    });

    // Calculate compliance score (100 - violation percentage)
    const violationRate = (violations30d / totalActions) * 100;
    const score = Math.max(0, Math.round(100 - violationRate));

    // Determine trend by comparing 7-day vs 30-day rates
    const rate7d = violations7d / Math.min(7, totalActions);
    const rate30d = violations30d / Math.min(30, totalActions);
    const trend = rate7d < rate30d ? 'improving' : rate7d > rate30d ? 'declining' : 'stable';

    return {
      score,
      trend,
      violations7d,
      violations30d,
      totalActions,
      complianceRate: score,
    };
  }, [receipts]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  const getTrendIcon = () => {
    if (complianceMetrics.trend === 'improving') {
      return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />;
    }
    if (complianceMetrics.trend === 'declining') {
      return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />;
    }
    return <div className="h-4 w-4" />; // Placeholder for stable
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Compliance Score
          </CardTitle>
          <CardDescription>Loading compliance metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Compliance Score
        </CardTitle>
        <CardDescription>
          Real-time policy adherence monitoring
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className={`text-5xl font-bold ${getScoreColor(complianceMetrics.score)}`}>
                {complianceMetrics.score}%
              </span>
              {getTrendIcon()}
            </div>
            <p className="text-sm text-muted-foreground">
              Policy Adherence Rate
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={getScoreBadgeVariant(complianceMetrics.score)}>
              {complianceMetrics.score >= 90 ? 'Excellent' : 
               complianceMetrics.score >= 70 ? 'Good' : 'Needs Attention'}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {complianceMetrics.trend}
            </Badge>
          </div>
        </div>

        {/* Violations Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium">Last 7 Days</span>
            </div>
            <p className="text-2xl font-bold">
              {complianceMetrics.violations7d}
            </p>
            <p className="text-xs text-muted-foreground">
              Policy violations
            </p>
          </div>

          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium">Last 30 Days</span>
            </div>
            <p className="text-2xl font-bold">
              {complianceMetrics.violations30d}
            </p>
            <p className="text-xs text-muted-foreground">
              Policy violations
            </p>
          </div>
        </div>

        {/* Additional Context */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Actions Tracked:</span>
            <span className="font-medium">{complianceMetrics.totalActions}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
