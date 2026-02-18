import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

export default function ComplianceReports() {
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = trpc.governance.generateComplianceReport.useMutation({
    onSuccess: (data: any) => {
      // Open HTML report in new tab
      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setIsGenerating(false);
    },
    onError: (error: any) => {
      alert(`Failed to generate report: ${error.message}`);
      setIsGenerating(false);
    },
  });

  const handleQuickReport = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setIsGenerating(true);
    generateReport.mutate({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  };

  const handleCustomReport = () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setIsGenerating(true);
    generateReport.mutate({
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Reports</h1>
          <p className="text-muted-foreground mt-2">
            Generate comprehensive governance compliance reports
          </p>
        </div>
      </div>

      {/* Quick Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Quick Reports
          </CardTitle>
          <CardDescription>
            Generate reports for common time periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4"
              onClick={() => handleQuickReport(7)}
              disabled={isGenerating}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold">Last 7 Days</span>
              </div>
              <p className="text-sm text-muted-foreground">Weekly compliance summary</p>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4"
              onClick={() => handleQuickReport(30)}
              disabled={isGenerating}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold">Last 30 Days</span>
              </div>
              <p className="text-sm text-muted-foreground">Monthly compliance report</p>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4"
              onClick={() => handleQuickReport(90)}
              disabled={isGenerating}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold">Last 90 Days</span>
              </div>
              <p className="text-sm text-muted-foreground">Quarterly compliance analysis</p>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col items-start p-4"
              onClick={() => handleQuickReport(365)}
              disabled={isGenerating}
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5" />
                <span className="font-semibold">Last 365 Days</span>
              </div>
              <p className="text-sm text-muted-foreground">Annual compliance review</p>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Date Range */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Custom Date Range
          </CardTitle>
          <CardDescription>
            Generate a report for a specific time period
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleCustomReport}
            disabled={isGenerating || !startDate || !endDate}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Generate Custom Report'}
          </Button>
        </CardContent>
      </Card>

      {/* Report Contents */}
      <Card>
        <CardHeader>
          <CardTitle>Report Contents</CardTitle>
          <CardDescription>
            Each compliance report includes the following sections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold">Executive Summary</h4>
                <p className="text-sm text-muted-foreground">
                  Compliance score, total actions, violations, and cost metrics
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold">Violations Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Breakdown by type, severity, and frequency
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold">Compliance Trends</h4>
                <p className="text-sm text-muted-foreground">
                  Daily compliance scores showing improvement or decline
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <FileText className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold">Critical Violations</h4>
                <p className="text-sm text-muted-foreground">
                  Detailed list of high-severity incidents requiring attention
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Reports
          </CardTitle>
          <CardDescription>
            Automatically generate and email reports on a schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Scheduled reports coming soon</p>
            <p className="text-sm mt-2">
              Configure automatic weekly or monthly report generation
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Report History */}
      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
          <CardDescription>
            Previously generated compliance reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No reports generated yet</p>
            <p className="text-sm mt-2">
              Generated reports will appear here for easy access
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
