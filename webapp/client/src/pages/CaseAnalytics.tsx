import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Award, Clock, FileText, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CaseAnalytics() {
  const { data: cases, isLoading } = trpc.cases.list.useQuery();

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!cases || cases.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Case Analytics</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No cases available for analytics</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate analytics
  const totalCases = cases.length;
  const activeCases = cases.filter(c => c.status === "active").length;
  const wonCases = cases.filter(c => c.status === "won").length;
  const lostCases = cases.filter(c => c.status === "lost").length;
  const settledCases = cases.filter(c => c.status === "settled").length;
  const resolvedCases = wonCases + lostCases + settledCases;
  const winRate = resolvedCases > 0 ? ((wonCases / resolvedCases) * 100).toFixed(1) : "0";

  // Status distribution
  const statusData = [
    { name: "Active", value: activeCases, color: "#10b981" },
    { name: "Won", value: wonCases, color: "#3b82f6" },
    { name: "Lost", value: lostCases, color: "#ef4444" },
    { name: "Settled", value: settledCases, color: "#f59e0b" },
    { name: "Pending", value: cases.filter(c => c.status === "pending").length, color: "#8b5cf6" },
    { name: "Archived", value: cases.filter(c => c.status === "archived").length, color: "#6b7280" },
  ].filter(d => d.value > 0);

  // Case type distribution
  const typeMap = new Map<string, number>();
  cases.forEach(c => {
    const type = c.caseType || "General";
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  });
  const typeData = Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));

  // Priority distribution
  const priorityData = [
    { name: "Critical", value: cases.filter(c => c.priority === "critical").length, color: "#dc2626" },
    { name: "High", value: cases.filter(c => c.priority === "high").length, color: "#ea580c" },
    { name: "Medium", value: cases.filter(c => c.priority === "medium").length, color: "#ca8a04" },
    { name: "Low", value: cases.filter(c => c.priority === "low").length, color: "#65a30d" },
  ].filter(d => d.value > 0);

  // Monthly trend (last 6 months)
  const monthlyData: { month: string; created: number; resolved: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString("en-US", { month: "short" });
    const created = cases.filter(c => {
      const createdDate = new Date(c.createdAt);
      return createdDate.getMonth() === date.getMonth() && createdDate.getFullYear() === date.getFullYear();
    }).length;
    const resolved = cases.filter(c => {
      if (!c.updatedAt) return false;
      const updatedDate = new Date(c.updatedAt);
      return (
        (c.status === "won" || c.status === "lost" || c.status === "settled") &&
        updatedDate.getMonth() === date.getMonth() &&
        updatedDate.getFullYear() === date.getFullYear()
      );
    }).length;
    monthlyData.push({ month: monthName, created, resolved });
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Case Analytics</h1>
        <p className="text-muted-foreground">Comprehensive insights into your legal cases</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCases}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeCases} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{winRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {wonCases} won / {resolvedCases} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resolved Cases</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{resolvedCases}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {settledCases} settled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Case Types</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{typeData.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Unique categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trend */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Case Trend (Last 6 Months)</CardTitle>
            <CardDescription>Created vs Resolved cases over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke="#3b82f6" strokeWidth={2} name="Created" />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Cases by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <CardDescription>Cases by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Cases">
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Case Type Distribution */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Case Type Distribution</CardTitle>
            <CardDescription>Number of cases by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" name="Cases" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
