import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { TrendingUp, DollarSign, Shield, Download, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function GovernanceAnalytics() {
  const [dateRange, setDateRange] = useState('30');
  const [selectedMetric, setSelectedMetric] = useState('receipts');
  
  // Fetch recent receipts for analytics
  const { data: receipts } = trpc.governance.getRecentReceipts.useQuery({ limit: 100 });
  const { data: spendingSummary } = trpc.governance.getSpendingSummary.useQuery();
  const { data: healthData } = trpc.governance.getSystemHealth.useQuery();
  
  // Process data for charts
  const receiptVolumeData = processReceiptVolume(receipts || [], parseInt(dateRange));
  const spendingByUserData = processSpendingByUser(receipts || []);
  const complianceScoreData = processComplianceScore(healthData);
  const actionTypeData = processActionTypes(receipts || []);
  
  const handleExportData = () => {
    const data = {
      receipts,
      spendingSummary,
      healthData,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `governance-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Governance Analytics</h1>
          <p className="text-muted-foreground">
            Insights and trends from your governance system
          </p>
        </div>
        
        <div className="flex gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleExportData} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Receipts</span>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-3xl font-bold">{receipts?.length || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Last {dateRange} days
          </p>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Daily Spending</span>
            <DollarSign className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-3xl font-bold">
            ${((spendingSummary?.current.daily || 0) / 100).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            of ${((spendingSummary?.limits.daily || 0) / 100).toFixed(2)} limit
          </p>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Compliance Score</span>
            <Shield className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-3xl font-bold">{healthData?.compliance.score || 0}%</div>
          <p className="text-xs text-muted-foreground mt-1">
            {healthData?.compliance.issues.length || 0} issues detected
          </p>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Blocked Actions</span>
            <Shield className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-3xl font-bold">
            {receipts?.filter((r: any) => r.action.startsWith('blocked:')).length || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Policy violations
          </p>
        </Card>
      </div>
      
      {/* Receipt Volume Trend */}
      <Card className="p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Receipt Volume Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={receiptVolumeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="receipts" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="blocked" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      
      {/* Action Types Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Action Types Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={actionTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {actionTypeData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Spending by User</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={spendingByUserData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="user" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="amount" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      
      {/* Compliance Score History */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Compliance Score History</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={complianceScoreData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// Helper functions to process data
function processReceiptVolume(receipts: any[], days: number) {
  const now = new Date();
  const data = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayReceipts = receipts.filter((r: any) => {
      const receiptDate = new Date(r.timestamp).toISOString().split('T')[0];
      return receiptDate === dateStr;
    });
    
    data.push({
      date: dateStr.slice(5), // MM-DD
      receipts: dayReceipts.length,
      blocked: dayReceipts.filter((r: any) => r.action.startsWith('blocked:')).length,
    });
  }
  
  return data;
}

function processSpendingByUser(receipts: any[]) {
  const userSpending: Record<string, number> = {};
  
  receipts.forEach((r: any) => {
    if (r.details?.cost) {
      const user = r.actor;
      userSpending[user] = (userSpending[user] || 0) + r.details.cost;
    }
  });
  
  return Object.entries(userSpending).map(([user, amount]) => ({
    user: user.split(':')[1] || user,
    amount: amount / 100, // Convert cents to dollars
  }));
}

function processComplianceScore(healthData: any) {
  // Mock historical data - in production, this would come from a time-series database
  const now = new Date();
  const data = [];
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Use current score with some random variation for historical data
    const baseScore = healthData?.compliance.score || 95;
    const variation = Math.random() * 10 - 5;
    
    data.push({
      date: dateStr.slice(5), // MM-DD
      score: Math.max(0, Math.min(100, baseScore + variation)),
    });
  }
  
  return data;
}

function processActionTypes(receipts: any[]) {
  const actionCounts: Record<string, number> = {};
  
  receipts.forEach((r: any) => {
    const actionType = r.action.split('_')[0] || 'other';
    actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;
  });
  
  return Object.entries(actionCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // Top 6 action types
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
