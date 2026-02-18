import DashboardLayout from "@/components/DashboardLayout";
import OnboardingWizard from "@/components/OnboardingWizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Plus, 
  FileText, 
  Shield, 
  Brain, 
  Folder, 
  Zap, 
  ArrowRight, 
  TrendingUp, 
  Activity,
  Target,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTierGate } from "@/hooks/useTierGate";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseDescription, setNewCaseDescription] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { data: cases, isLoading, refetch } = trpc.cases.list.useQuery();
  const { data: onboardingStatus } = trpc.onboarding.status.useQuery();
  const { tier, limits, usage, canCreateCase, aiMessagesRemaining, casesRemaining } = useTierGate();

  // Show onboarding if not complete
  const shouldShowOnboarding = onboardingStatus && !onboardingStatus.complete && !showOnboarding;

  const createCase = trpc.cases.create.useMutation({
    onSuccess: () => {
      toast.success("Case created successfully");
      setCreateDialogOpen(false);
      setNewCaseTitle("");
      setNewCaseDescription("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateCase = () => {
    if (!newCaseTitle.trim()) {
      toast.error("Please enter a case title");
      return;
    }
    if (!canCreateCase) {
      toast.error(`Your ${tier} plan allows up to ${limits.maxCases} cases. Upgrade to create more.`);
      return;
    }
    createCase.mutate({
      title: newCaseTitle,
      description: newCaseDescription,
    });
  };

  // Calculate dashboard metrics
  const metrics = useMemo(() => {
    if (!cases) return {
      total: 0,
      active: 0,
      pending: 0,
      completed: 0,
      successRate: 0,
      byStatus: [],
      byType: [],
      timeline: []
    };

    const active = cases.filter(c => c.status === "active").length;
    const pending = cases.filter(c => c.status === "pending").length;
    const won = cases.filter(c => c.status === "won").length;
    const lost = cases.filter(c => c.status === "lost").length;
    const settled = cases.filter(c => c.status === "settled").length;
    const completed = won + lost + settled;
    const successRate = completed > 0 ? Math.round((won / completed) * 100) : 0;

    // Status distribution for pie chart
    const byStatus = [
      { name: "Active", value: active, color: "hsl(var(--success))" },
      { name: "Pending", value: pending, color: "hsl(var(--warning))" },
      { name: "Won", value: won, color: "hsl(var(--primary))" },
      { name: "Lost", value: lost, color: "hsl(var(--destructive))" },
      { name: "Settled", value: settled, color: "hsl(var(--muted-foreground))" },
    ].filter(item => item.value > 0);

    // Case types distribution
    const typeMap = new Map<string, number>();
    cases.forEach(c => {
      const type = c.caseType || "Other";
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });
    const byType = Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));

    // Timeline data (last 6 months)
    const timeline = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const monthCases = cases.filter(c => {
        const caseDate = new Date(c.createdAt);
        return caseDate.getMonth() === date.getMonth() && 
               caseDate.getFullYear() === date.getFullYear();
      }).length;
      return { month: monthName, cases: monthCases };
    });

    return {
      total: cases.length,
      active,
      pending,
      completed,
      successRate,
      byStatus,
      byType,
      timeline
    };
  }, [cases]);

  // Recent cases (last 5)
  const recentCases = useMemo(() => {
    if (!cases) return [];
    return [...cases]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [cases]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <Activity className="h-4 w-4 text-success" />;
      case "pending": return <Clock className="h-4 w-4 text-warning" />;
      case "won": return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "lost": return <XCircle className="h-4 w-4 text-destructive" />;
      case "settled": return <Target className="h-4 w-4 text-muted-foreground" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-12 px-8">
          {/* Skeleton loading */}
          <div className="space-y-4">
            <div className="skeleton h-12 w-64"></div>
            <div className="skeleton h-4 w-96"></div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton h-32"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Onboarding Wizard */}
      {shouldShowOnboarding && (
        <OnboardingWizard
          onComplete={() => setShowOnboarding(true)}
          onSkip={() => setShowOnboarding(true)}
        />
      )}

      <div className="space-y-12 px-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Intelligence Dashboard</h1>
            <p className="text-muted-foreground text-base">
              Real-time legal warfare command center
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm py-2 px-4 font-medium">
              <Zap className="h-4 w-4 mr-2" />
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
            </Badge>
            <Button onClick={() => setCreateDialogOpen(true)} disabled={!canCreateCase} size="lg" className="shadow-lg">
              <Plus className="mr-2 h-5 w-5" />
              New Case
            </Button>
          </div>
        </div>

        {/* Tier Usage Banner (for free tier) */}
        {tier === "free" && (
          <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <CardContent className="py-8">
              <div className="flex items-center justify-between">
                <div className="space-y-4 flex-1 mr-8">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Cases: {usage.cases} / {limits.maxCases}</span>
                    <span className="text-muted-foreground">{casesRemaining} remaining</span>
                  </div>
                  <Progress value={(usage.cases / limits.maxCases) * 100} className="h-3" />
                  <div className="flex items-center justify-between text-sm font-medium mt-6">
                    <span>AI Messages Today: {usage.aiMessagesToday} / {limits.maxAiMessagesPerDay}</span>
                    <span className="text-muted-foreground">{aiMessagesRemaining} remaining</span>
                  </div>
                  <Progress value={(usage.aiMessagesToday / limits.maxAiMessagesPerDay) * 100} className="h-3" />
                </div>
                <Link href="/pricing">
                  <Button size="lg" variant="default" className="shadow-lg">
                    Upgrade Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics - Spacious Cards */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <Card className="panel hover:glow">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Total Cases
              </CardTitle>
              <div className="p-3 rounded-xl bg-primary/10">
                <Folder className="h-6 w-6 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-4xl font-bold font-mono">{metrics.total}</div>
              <p className="text-sm text-muted-foreground">
                {tier === "free" ? `${casesRemaining} of ${limits.maxCases} remaining` : "Unlimited"}
              </p>
            </CardContent>
          </Card>

          <Card className="panel hover:glow">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Active Cases
              </CardTitle>
              <div className="p-3 rounded-xl bg-success/10">
                <Activity className="h-6 w-6 text-success" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-4xl font-bold font-mono">{metrics.active}</div>
              <p className="text-sm text-muted-foreground">
                In progress
              </p>
            </CardContent>
          </Card>

          <Card className="panel hover:glow">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Success Rate
              </CardTitle>
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-4xl font-bold font-mono">{metrics.successRate}%</div>
              <p className="text-sm text-muted-foreground">
                {metrics.completed} completed cases
              </p>
            </CardContent>
          </Card>

          <Card className="panel hover:glow">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                AI Assistant
              </CardTitle>
              <div className="p-3 rounded-xl bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-4xl font-bold font-mono">24/7</div>
              <p className="text-sm text-muted-foreground">
                Unlimited access
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Data Visualization Grid */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Case Timeline Chart */}
          <Card className="panel">
            <CardHeader className="panel-header">
              <CardTitle className="panel-title">
                <TrendingUp className="h-5 w-5 text-primary" />
                Case Activity Timeline
              </CardTitle>
              <CardDescription className="panel-description">
                Cases created over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cases" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Case Status Distribution */}
          <Card className="panel">
            <CardHeader className="panel-header">
              <CardTitle className="panel-title">
                <Target className="h-5 w-5 text-primary" />
                Status Distribution
              </CardTitle>
              <CardDescription className="panel-description">
                Current case status breakdown
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.byStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {metrics.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Case Types Bar Chart */}
          {metrics.byType.length > 0 && (
            <Card className="panel lg:col-span-2">
              <CardHeader className="panel-header">
                <CardTitle className="panel-title">
                  <FileText className="h-5 w-5 text-primary" />
                  Case Types Distribution
                </CardTitle>
                <CardDescription className="panel-description">
                  Breakdown by case category
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.byType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontFamily: 'JetBrains Mono'
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Cases */}
        <Card className="panel">
          <CardHeader className="panel-header">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="panel-title">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Cases
                </CardTitle>
                <CardDescription className="panel-description">
                  Your most recently created cases
                </CardDescription>
              </div>
              <Link href="/cases">
                <Button variant="outline">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentCases.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Shield className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
                <div>
                  <p className="text-lg font-medium">No cases yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create your first case to get started
                  </p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)} size="lg" className="mt-4">
                  <Plus className="mr-2 h-5 w-5" />
                  Create First Case
                </Button>
              </div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Case Title</th>
                      <th>Status</th>
                      <th>Type</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCases.map((case_) => (
                      <tr key={case_.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            {getStatusIcon(case_.status)}
                            <span className="font-medium">{case_.title}</span>
                          </div>
                        </td>
                        <td>
                          <Badge variant="outline" className="status-indicator status-info">
                            {case_.status}
                          </Badge>
                        </td>
                        <td className="text-muted-foreground">
                          {case_.caseType || "General"}
                        </td>
                        <td className="font-mono text-sm text-muted-foreground">
                          {new Date(case_.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setLocation(`/cases/${case_.id}`)}
                          >
                            View
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="panel hover:glow cursor-pointer" onClick={() => setLocation("/ai-companion")}>
            <CardHeader>
              <div className="p-4 rounded-xl bg-primary/10 w-fit">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="mt-4">AI Companion</CardTitle>
              <CardDescription>
                Chat with your sentient legal assistant
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="panel hover:glow cursor-pointer" onClick={() => setLocation("/agent-zero")}>
            <CardHeader>
              <div className="p-4 rounded-xl bg-primary/10 w-fit">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="mt-4">Agent Zero</CardTitle>
              <CardDescription>
                Autonomous task execution and automation
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="panel hover:glow cursor-pointer" onClick={() => setLocation("/documents")}>
            <CardHeader>
              <div className="p-4 rounded-xl bg-primary/10 w-fit">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="mt-4">Documents</CardTitle>
              <CardDescription>
                Legal templates and document management
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Create Case Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Case</DialogTitle>
            <DialogDescription>
              Add a new legal case to your dashboard
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Case Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Smith v. Jones"
                value={newCaseTitle}
                onChange={(e) => setNewCaseTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the case..."
                value={newCaseDescription}
                onChange={(e) => setNewCaseDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCase} disabled={createCase.isPending}>
              {createCase.isPending ? "Creating..." : "Create Case"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
