import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Scale,
  Trophy,
  AlertTriangle,
  Handshake,
  FileText,
  Clock,
  Activity,
} from "lucide-react";

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-600 dark:text-gray-300", label: "Draft" },
  active: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", label: "Active" },
  pending: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", label: "Pending" },
  won: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", label: "Won" },
  lost: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", label: "Lost" },
  settled: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", label: "Settled" },
  archived: { bg: "bg-muted", text: "text-muted-foreground", label: "Archived" },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

function StatCard({ title, value, subtitle, icon: Icon, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="p-3 rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BarChartSimple({ data, labelKey, valueKey, colorFn }: {
  data: any[];
  labelKey: string;
  valueKey: string;
  colorFn?: (item: any) => string;
}) {
  if (!data.length) return <p className="text-sm text-muted-foreground text-center py-4">No data available</p>;
  const maxValue = Math.max(...data.map(d => d[valueKey]));

  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const pct = maxValue > 0 ? (item[valueKey] / maxValue) * 100 : 0;
        const color = colorFn ? colorFn(item) : "bg-primary";
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium capitalize">{item[labelKey]}</span>
              <span className="text-muted-foreground">{item[valueKey]}</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data, labelKey, valueKey, colorFn }: {
  data: any[];
  labelKey: string;
  valueKey: string;
  colorFn?: (item: any) => string;
}) {
  const total = data.reduce((sum, d) => sum + d[valueKey], 0);
  if (total === 0) return <p className="text-sm text-muted-foreground text-center py-8">No data available</p>;

  const colors = [
    "stroke-blue-500", "stroke-green-500", "stroke-purple-500",
    "stroke-orange-500", "stroke-red-500", "stroke-yellow-500", "stroke-gray-400",
  ];

  let cumulativePercent = 0;
  const segments = data.map((item, i) => {
    const percent = (item[valueKey] / total) * 100;
    const startAngle = (cumulativePercent / 100) * 360;
    const endAngle = ((cumulativePercent + percent) / 100) * 360;
    cumulativePercent += percent;
    return { ...item, percent, startAngle, endAngle, color: colors[i % colors.length] };
  });

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-32 h-32 shrink-0 -rotate-90">
        {segments.map((seg, i) => {
          const radius = 40;
          const circumference = 2 * Math.PI * radius;
          const strokeDasharray = `${(seg.percent / 100) * circumference} ${circumference}`;
          const offset = (segments.slice(0, i).reduce((s, x) => s + x.percent, 0) / 100) * circumference;
          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="12"
              className={seg.color}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={-offset}
            />
          );
        })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-lg font-bold rotate-90" style={{ transformOrigin: "50px 50px" }}>
          {total}
        </text>
      </svg>
      <div className="space-y-2 flex-1 min-w-0">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className={`h-3 w-3 rounded-full ${seg.color.replace("stroke-", "bg-")}`} />
            <span className="capitalize truncate">{seg[labelKey]}</span>
            <span className="text-muted-foreground ml-auto">{seg[valueKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { data: analytics, isLoading } = trpc.analytics.caseOverview.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Case Analytics</h1>
          <p className="text-muted-foreground mt-1">Loading analytics data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-8 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalCases = analytics?.totalCases || 0;
  const activeCases = analytics?.activeCases || 0;
  const wonCases = analytics?.wonCases || 0;
  const lostCases = analytics?.lostCases || 0;
  const settledCases = analytics?.settledCases || 0;
  const resolvedCases = wonCases + lostCases + settledCases;
  const winRate = resolvedCases > 0 ? Math.round((wonCases / resolvedCases) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Case Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track your legal warfare progress and case outcomes
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cases"
          value={totalCases}
          subtitle={`${activeCases} currently active`}
          icon={Scale}
        />
        <StatCard
          title="Win Rate"
          value={resolvedCases > 0 ? `${winRate}%` : "N/A"}
          subtitle={resolvedCases > 0 ? `${resolvedCases} resolved cases` : "No resolved cases yet"}
          icon={Trophy}
        />
        <StatCard
          title="Cases Won"
          value={wonCases}
          subtitle={settledCases > 0 ? `+ ${settledCases} settled` : undefined}
          icon={TrendingUp}
        />
        <StatCard
          title="Active Cases"
          value={activeCases}
          subtitle="Currently in progress"
          icon={Activity}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Case Status Distribution
            </CardTitle>
            <CardDescription>Breakdown of cases by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={analytics?.statusCounts || []}
              labelKey="status"
              valueKey="count"
            />
          </CardContent>
        </Card>

        {/* Case Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Case Type Breakdown
            </CardTitle>
            <CardDescription>Distribution of cases by legal category</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartSimple
              data={analytics?.typeCounts || []}
              labelKey="type"
              valueKey="count"
            />
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Priority Distribution
            </CardTitle>
            <CardDescription>Cases organized by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartSimple
              data={analytics?.priorityCounts || []}
              labelKey="priority"
              valueKey="count"
              colorFn={(item) => PRIORITY_COLORS[item.priority] || "bg-primary"}
            />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest case events and actions</CardDescription>
          </CardHeader>
          <CardContent>
            {(analytics?.recentActivity || []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(analytics?.recentActivity || []).slice(0, 10).map((event: any) => (
                  <div key={event.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{event.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(event.eventDate).toLocaleDateString()}
                      </p>
                    </div>
                    {event.eventType && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {event.eventType}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outcome Summary */}
      {resolvedCases > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Handshake className="h-5 w-5 text-primary" />
              Case Outcomes Summary
            </CardTitle>
            <CardDescription>Results of resolved cases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/10">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{wonCases}</p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">Won</p>
              </div>
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{settledCases}</p>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">Settled</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{lostCases}</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">Lost</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
