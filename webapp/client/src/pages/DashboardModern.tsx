import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Plus, 
  TrendingUp, 
  Activity,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Folder,
  Brain,
  Zap
} from "lucide-react";
import { Link } from "wouter";
import { useMemo } from "react";
import { OnboardingTour } from "@/components/OnboardingTour";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

export default function DashboardModern() {
  const { data: cases } = trpc.cases.list.useQuery();

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!cases) return {
      totalCases: 0,
      activeCases: 0,
      successRate: 0,
      recentCases: [],
    };

    const activeCases = cases.filter(c => c.status === "active").length;
    const completedCases = cases.filter(c => c.status === "won" || c.status === "lost" || c.status === "settled").length;
    const successRate = completedCases > 0 ? Math.round((completedCases / cases.length) * 100) : 0;

    return {
      totalCases: cases.length,
      activeCases,
      successRate,
      recentCases: cases.slice(0, 5),
    };
  }, [cases]);

  // Chart data
  const timelineData = [
    { month: "Jan", cases: 45 },
    { month: "Feb", cases: 52 },
    { month: "Mar", cases: 61 },
    { month: "Apr", cases: 70 },
    { month: "May", cases: 85 },
    { month: "Jun", cases: 95 },
  ];

  const statusData = [
    { name: "Active", value: metrics.activeCases, color: "#00d4ff" },
    { name: "Closed", value: metrics.totalCases - metrics.activeCases, color: "#00ff88" },
  ];

  return (
    <DashboardLayout>
      <OnboardingTour page="dashboard" />
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Intelligence Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time legal warfare command center
            </p>
          </div>
          <Link href="/cases/new">
            <Button size="lg" className="shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-5 w-5" />
              New Case
            </Button>
          </Link>
        </div>

        {/* Key Metrics - Modern Cards with Gradients */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
              <Folder className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalCases}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Unlimited capacity
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-green-500/10 to-green-600/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
              <Activity className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.activeCases}</div>
              <p className="text-xs text-muted-foreground mt-1">
                In progress
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.successRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.totalCases - metrics.activeCases} completed
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
              <Brain className="h-5 w-5 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">24/7</div>
              <p className="text-xs text-muted-foreground mt-1">
                Unlimited access
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Case Activity Timeline */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Case Activity Timeline</CardTitle>
              </div>
              <CardDescription>Cases created over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cases" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <CardTitle>Status Distribution</CardTitle>
              </div>
              <CardDescription>Current case status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <CardTitle>Quick Actions</CardTitle>
            </div>
            <CardDescription>Accelerate your workflow with AI-powered tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/ai-companion">
                <Button variant="outline" className="w-full h-auto py-6 flex-col gap-2 hover:border-primary transition-all">
                  <Brain className="h-8 w-8 text-primary" />
                  <span className="font-semibold">AI Companion</span>
                  <span className="text-xs text-muted-foreground">Legal research assistant</span>
                </Button>
              </Link>

              <Link href="/agent-zero">
                <Button variant="outline" className="w-full h-auto py-6 flex-col gap-2 hover:border-primary transition-all">
                  <Sparkles className="h-8 w-8 text-purple-500" />
                  <span className="font-semibold">Agent Zero</span>
                  <span className="text-xs text-muted-foreground">Autonomous task execution</span>
                </Button>
              </Link>

              <Link href="/documents">
                <Button variant="outline" className="w-full h-auto py-6 flex-col gap-2 hover:border-primary transition-all">
                  <Folder className="h-8 w-8 text-blue-500" />
                  <span className="font-semibold">Documents</span>
                  <span className="text-xs text-muted-foreground">Manage case files</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Cases */}
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Cases</CardTitle>
                <CardDescription>Your latest case activity</CardDescription>
              </div>
              <Link href="/cases">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.recentCases.map((case_: any) => (
                <Link key={case_.id} href={`/cases/${case_.id}`}>
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:border-primary transition-all cursor-pointer">
                    <div className="flex-1">
                      <h4 className="font-semibold">{case_.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {case_.description || "No description"}
                      </p>
                    </div>
                    <Badge variant={case_.status === "active" ? "default" : "secondary"}>
                      {case_.status}
                    </Badge>
                  </div>
                </Link>
              ))}

              {metrics.recentCases.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No cases yet</p>
                  <p className="text-sm">Create your first case to get started</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
