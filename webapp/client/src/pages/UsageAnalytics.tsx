import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Target, DollarSign, Activity, Star } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

export default function UsageAnalytics() {
  // Mock data - in production, fetch from actual endpoints
  const tools = [];
  const reviews = [];

  // Mock data for demonstration
  const adoptionData = [
    { month: "Jan", adopted: 12, recommended: 20 },
    { month: "Feb", adopted: 18, recommended: 25 },
    { month: "Mar", adopted: 24, recommended: 30 },
    { month: "Apr", adopted: 32, recommended: 35 },
    { month: "May", adopted: 41, recommended: 42 },
    { month: "Jun", adopted: 48, recommended: 50 },
  ];

  const topToolsData = [
    { name: "ChatGPT", adoptions: 45, rating: 4.8 },
    { name: "Midjourney", adoptions: 38, rating: 4.9 },
    { name: "ElevenLabs", adoptions: 32, rating: 4.7 },
    { name: "Make", adoptions: 28, rating: 4.6 },
    { name: "Perplexity AI", adoptions: 25, rating: 4.8 },
  ];

  const conversionRate = 96; // 48/50 * 100
  const avgRating = 4.7;
  const totalRecommendations = 50;
  const totalAdoptions = 48;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Usage Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Track AI tool adoption and recommendation performance
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-purple-500/10 to-purple-600/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Target className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{conversionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalAdoptions} of {totalRecommendations} adopted
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Adoptions</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalAdoptions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Tools actively used
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Star className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{avgRating}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Out of 5.0 stars
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none shadow-xl bg-gradient-to-br from-green-500/10 to-green-600/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Est. ROI</CardTitle>
              <DollarSign className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">$12.5K</div>
              <p className="text-xs text-muted-foreground mt-1">
                Monthly cost savings
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Adoption Trend */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle>Adoption Trend</CardTitle>
              </div>
              <CardDescription>Recommendations vs actual adoptions over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={adoptionData}>
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
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="recommended" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Recommended"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="adopted" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Adopted"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Tools */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                <CardTitle>Top Adopted Tools</CardTitle>
              </div>
              <CardDescription>Most popular AI tools by adoption count</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topToolsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="adoptions" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tool Performance Table */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Tool Performance Details</CardTitle>
            <CardDescription>Detailed metrics for each recommended tool</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topToolsData.map((tool) => (
                <div key={tool.name} className="flex items-center justify-between p-4 border rounded-lg hover:border-primary transition-all">
                  <div className="flex-1">
                    <h4 className="font-semibold">{tool.name}</h4>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-muted-foreground">
                        {tool.adoptions} adoptions
                      </span>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium">{tool.rating}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="default">
                    {Math.round((tool.adoptions / 50) * 100)}% adoption
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ROI Calculator */}
        <Card className="shadow-lg bg-gradient-to-br from-green-500/5 to-green-600/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <CardTitle>ROI Calculator</CardTitle>
            </div>
            <CardDescription>Estimated cost savings from AI tool adoption</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Time Saved</h4>
                <p className="text-2xl font-bold">240 hrs/mo</p>
                <p className="text-xs text-muted-foreground mt-1">Across all tools</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Cost Savings</h4>
                <p className="text-2xl font-bold text-green-500">$12,500/mo</p>
                <p className="text-xs text-muted-foreground mt-1">At $52/hr rate</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Annual ROI</h4>
                <p className="text-2xl font-bold text-green-500">$150,000</p>
                <p className="text-xs text-muted-foreground mt-1">Projected savings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
