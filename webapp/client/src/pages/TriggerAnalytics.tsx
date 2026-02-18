import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Zap, CheckCircle2, XCircle, Mail, Mic, Globe, Clock } from 'lucide-react';

export default function TriggerAnalytics() {
  const [dateRange, setDateRange] = useState('7d');
  const [triggerType, setTriggerType] = useState('all');

  // Mock data - in production, this would come from tRPC
  const triggerFireRateData = [
    { date: 'Feb 10', email: 12, audio: 5, web: 8 },
    { date: 'Feb 11', email: 15, audio: 7, web: 6 },
    { date: 'Feb 12', email: 18, audio: 4, web: 9 },
    { date: 'Feb 13', email: 14, audio: 8, web: 7 },
    { date: 'Feb 14', email: 20, audio: 6, web: 11 },
    { date: 'Feb 15', email: 16, audio: 9, web: 8 },
    { date: 'Feb 16', email: 22, audio: 7, web: 10 },
  ];

  const keywordMatchData = [
    { keyword: 'FDCPA', matches: 45, workflows: 12 },
    { keyword: 'lawsuit', matches: 38, workflows: 10 },
    { keyword: 'motion', matches: 32, workflows: 8 },
    { keyword: 'deposition', matches: 28, workflows: 7 },
    { keyword: 'discovery', matches: 25, workflows: 6 },
    { keyword: 'FCRA', matches: 22, workflows: 5 },
    { keyword: 'TCPA', matches: 18, workflows: 4 },
    { keyword: 'hearing', matches: 15, workflows: 3 },
  ];

  const workflowSuccessData = [
    { name: 'Success', value: 142, color: '#10b981' },
    { name: 'Pending', value: 18, color: '#f59e0b' },
    { name: 'Failed', value: 5, color: '#ef4444' },
  ];

  const triggerTypeDistribution = [
    { type: 'Email', count: 98, color: '#3b82f6' },
    { type: 'Audio', count: 45, color: '#8b5cf6' },
    { type: 'Web', count: 67, color: '#10b981' },
    { type: 'Manual', count: 12, color: '#f59e0b' },
  ];

  const executionTimeData = [
    { date: 'Feb 10', avgTime: 2.3 },
    { date: 'Feb 11', avgTime: 2.1 },
    { date: 'Feb 12', avgTime: 2.5 },
    { date: 'Feb 13', avgTime: 2.2 },
    { date: 'Feb 14', avgTime: 2.4 },
    { date: 'Feb 15', avgTime: 2.0 },
    { date: 'Feb 16', avgTime: 2.3 },
  ];

  const caseCreationStats = {
    totalCases: 87,
    fromEmail: 52,
    fromAudio: 28,
    fromWeb: 7,
    conversionRate: 52.7, // percentage of triggers that created cases
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Trigger Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Performance metrics and insights for workflow automation triggers
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={triggerType} onValueChange={setTriggerType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="email">Email Only</SelectItem>
              <SelectItem value="audio">Audio Only</SelectItem>
              <SelectItem value="web">Web Only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Triggers Fired</p>
                <p className="text-2xl font-bold">165</p>
                <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% from last week
                </p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">86%</p>
                <p className="text-xs text-muted-foreground mt-1">142/165 successful</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cases Auto-Created</p>
                <p className="text-2xl font-bold">{caseCreationStats.totalCases}</p>
                <p className="text-xs text-muted-foreground mt-1">{caseCreationStats.conversionRate}% conversion</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Execution Time</p>
                <p className="text-2xl font-bold">2.3s</p>
                <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3" />
                  -0.2s improvement
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Trigger Fire Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Trigger Fire Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={triggerFireRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="email" fill="#3b82f6" name="Email" />
                <Bar dataKey="audio" fill="#8b5cf6" name="Audio" />
                <Bar dataKey="web" fill="#10b981" name="Web" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Workflow Success Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Execution Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={workflowSuccessData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {workflowSuccessData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Trigger Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Trigger Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={triggerTypeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, count }) => `${type}: ${count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {triggerTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Execution Time Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Average Execution Time Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={executionTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgTime" stroke="#8b5cf6" name="Avg Time (seconds)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Keyword Match Leaderboard */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Most Matched Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {keywordMatchData.map((item, index) => (
              <div key={item.keyword} className="flex items-center gap-4">
                <div className="w-8 text-center font-bold text-muted-foreground">#{index + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{item.keyword}</span>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{item.matches} matches</span>
                      <span>{item.workflows} workflows triggered</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(item.matches / keywordMatchData[0].matches) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Case Creation Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Automated Case Creation Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{caseCreationStats.totalCases}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Cases Created</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-blue-500" />
                <div className="text-3xl font-bold">{caseCreationStats.fromEmail}</div>
              </div>
              <div className="text-sm text-muted-foreground">From Email Triggers</div>
              <Badge variant="outline" className="mt-2">{((caseCreationStats.fromEmail / caseCreationStats.totalCases) * 100).toFixed(1)}%</Badge>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Mic className="w-5 h-5 text-purple-500" />
                <div className="text-3xl font-bold">{caseCreationStats.fromAudio}</div>
              </div>
              <div className="text-sm text-muted-foreground">From Audio Triggers</div>
              <Badge variant="outline" className="mt-2">{((caseCreationStats.fromAudio / caseCreationStats.totalCases) * 100).toFixed(1)}%</Badge>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-green-500" />
                <div className="text-3xl font-bold">{caseCreationStats.fromWeb}</div>
              </div>
              <div className="text-sm text-muted-foreground">From Web Triggers</div>
              <Badge variant="outline" className="mt-2">{((caseCreationStats.fromWeb / caseCreationStats.totalCases) * 100).toFixed(1)}%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
