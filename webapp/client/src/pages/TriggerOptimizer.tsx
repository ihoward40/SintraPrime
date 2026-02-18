import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, TrendingUp, TrendingDown, CheckCircle2, XCircle, Lightbulb, ArrowRight } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type Suggestion = {
  id: string;
  type: 'keyword_refinement' | 'threshold_adjustment' | 'workflow_optimization';
  title: string;
  description: string;
  confidence: number;
  changes: {
    before: string;
    after: string;
  };
  impact: 'high' | 'medium' | 'low';
};

export default function TriggerOptimizer() {
  const [selectedTriggerId, setSelectedTriggerId] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  const { data: triggers } = trpc.workflowTriggers.list.useQuery({});

  const handleAnalyze = async () => {
    if (!selectedTriggerId) {
      toast.error('Please select a trigger to analyze');
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate AI analysis (replace with real tRPC call)
    setTimeout(() => {
      // Mock metrics
      setMetrics({
        successRate: 76.5,
        avgExecutionTime: 15.3,
        fireFrequency: 24,
        totalExecutions: 150,
        failedExecutions: 35,
        keywordHitRates: {
          'FDCPA': 85,
          'violation': 72,
          'debt': 45,
          'collector': 38,
        },
      });

      // Mock suggestions
      setSuggestions([
        {
          id: 'sug_1',
          type: 'keyword_refinement',
          title: 'Remove low-performing keyword "debt"',
          description: 'The keyword "debt" has a 45% hit rate but only 12% of those executions succeed. Removing it will improve overall success rate by ~8%.',
          confidence: 92,
          changes: {
            before: 'Keywords: FDCPA, violation, debt, collector',
            after: 'Keywords: FDCPA, violation, collector',
          },
          impact: 'high',
        },
        {
          id: 'sug_2',
          type: 'keyword_refinement',
          title: 'Add related keyword "harassment"',
          description: 'Analysis of failed matches shows 18 emails containing "harassment" that should have triggered. Adding this keyword will increase coverage.',
          confidence: 88,
          changes: {
            before: 'Keywords: FDCPA, violation, collector',
            after: 'Keywords: FDCPA, violation, collector, harassment',
          },
          impact: 'medium',
        },
        {
          id: 'sug_3',
          type: 'threshold_adjustment',
          title: 'Reduce execution time threshold to 12s',
          description: 'Current 15.3s average execution time exceeds optimal range. Workflow contains redundant validation step that can be removed.',
          confidence: 85,
          changes: {
            before: 'Avg execution time: 15.3s',
            after: 'Avg execution time: ~12s (21% improvement)',
          },
          impact: 'medium',
        },
        {
          id: 'sug_4',
          type: 'workflow_optimization',
          title: 'Parallelize evidence extraction steps',
          description: 'Steps 3-5 in the workflow are sequential but independent. Running them in parallel will reduce execution time by ~30%.',
          confidence: 78,
          changes: {
            before: 'Sequential: Extract text → Parse dates → Identify parties',
            after: 'Parallel: All three steps run simultaneously',
          },
          impact: 'high',
        },
      ]);

      setIsAnalyzing(false);
      toast.success('Analysis complete');
    }, 3000);
  };

  const handleApplySuggestion = (suggestionId: string) => {
    // TODO: Implement apply suggestion via tRPC
    toast.success('Suggestion applied successfully');
    setSuggestions(suggestions.filter(s => s.id !== suggestionId));
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high':
        return <Badge className="bg-green-500">High Impact</Badge>;
      case 'medium':
        return <Badge className="bg-blue-500">Medium Impact</Badge>;
      default:
        return <Badge variant="outline">Low Impact</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'keyword_refinement':
        return <Sparkles className="w-4 h-4" />;
      case 'threshold_adjustment':
        return <TrendingUp className="w-4 h-4" />;
      case 'workflow_optimization':
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8" />
          AI Trigger Performance Optimizer
        </h1>
        <p className="text-muted-foreground mt-2">
          Get AI-powered suggestions to improve trigger performance and workflow efficiency
        </p>
      </div>

      {/* Trigger Selection */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Select Trigger to Analyze</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedTriggerId} onValueChange={setSelectedTriggerId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choose a trigger..." />
              </SelectTrigger>
              <SelectContent>
                {triggers?.map((trigger) => (
                  <SelectItem key={trigger.id} value={trigger.id.toString()}>
                    {trigger.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAnalyze} disabled={isAnalyzing || !selectedTriggerId}>
              {isAnalyzing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Trigger
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{metrics.successRate}%</p>
                </div>
                {metrics.successRate >= 80 ? (
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                ) : (
                  <XCircle className="w-8 h-8 text-orange-500" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Execution Time</p>
                  <p className="text-2xl font-bold">{metrics.avgExecutionTime}s</p>
                </div>
                <TrendingDown className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fire Frequency</p>
                  <p className="text-2xl font-bold">{metrics.fireFrequency}/day</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Executions</p>
                  <p className="text-2xl font-bold">{metrics.totalExecutions}</p>
                </div>
                <Sparkles className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Keyword Hit Rates */}
      {metrics && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Keyword Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.keywordHitRates).map(([keyword, rate]: [string, any]) => (
                <div key={keyword} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{keyword}</span>
                    <span className="text-muted-foreground">{rate}% hit rate</span>
                  </div>
                  <Progress value={rate} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="w-6 h-6" />
            AI Suggestions ({suggestions.length})
          </h2>

          {suggestions.map((suggestion) => (
            <Card key={suggestion.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getTypeIcon(suggestion.type)}
                    <div>
                      <CardTitle className="text-lg">{suggestion.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {suggestion.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getImpactBadge(suggestion.impact)}
                    <Badge variant="outline">{suggestion.confidence}% confidence</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Before/After Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">BEFORE</p>
                    <p className="text-sm">{suggestion.changes.before}</p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">AFTER</p>
                    <p className="text-sm">{suggestion.changes.after}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={() => handleApplySuggestion(suggestion.id)}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Apply Suggestion
                  </Button>
                  <Button variant="outline" onClick={() => setSuggestions(suggestions.filter(s => s.id !== suggestion.id))}>
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!metrics && !isAnalyzing && (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
            <p className="text-muted-foreground mb-4">
              Select a trigger and click "Analyze Trigger" to get AI-powered optimization suggestions
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
