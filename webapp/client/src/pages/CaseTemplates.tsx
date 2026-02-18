import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, CheckCircle2, Circle, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function CaseTemplates() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [parties, setParties] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [documents, setDocuments] = useState('');

  const detectMutation = trpc.caseTemplates.detectCaseType.useMutation();
  const workflowMutation = trpc.caseTemplates.generateWorkflow.useMutation();
  const documentsMutation = trpc.caseTemplates.suggestDocuments.useMutation();

  const [detectionResult, setDetectionResult] = useState<any>(null);
  const [workflow, setWorkflow] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [documentSuggestions, setDocumentSuggestions] = useState<any>(null);

  const handleDetect = async () => {
    if (!title && !description) {
      toast.error('Please provide at least a title or description');
      return;
    }

    try {
      const result = await detectMutation.mutateAsync({
        title,
        description,
        parties: parties ? parties.split(',').map(p => p.trim()) : undefined,
        jurisdiction: jurisdiction || undefined,
        documents: documents ? documents.split(',').map(d => d.trim()) : undefined,
      });

      setDetectionResult(result);

      // Auto-generate workflow
      const workflowResult = await workflowMutation.mutateAsync({
        caseType: result.caseType,
      });
      setWorkflow(workflowResult.workflow);

      // Get document suggestions
      const docResult = await documentsMutation.mutateAsync({
        caseType: result.caseType,
        currentDocuments: documents ? documents.split(',').map(d => d.trim()) : [],
      });
      setDocumentSuggestions(docResult);

      toast.success(`Case Type Detected: ${result.caseType} (${Math.round(result.confidence * 100)}% confidence)`);
    } catch (error) {
      toast.error('Failed to detect case type. Please try again.');
    }
  };

  const toggleStep = (index: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedSteps(newCompleted);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Smart Case Templates</h1>
        <p className="text-muted-foreground">
          AI-powered case type detection with automated workflow generation
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Case Information</h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Case Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Smith v. Debt Collector Inc."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the case details, claims, and circumstances..."
                  rows={6}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Parties (comma-separated)</label>
                <Input
                  value={parties}
                  onChange={(e) => setParties(e.target.value)}
                  placeholder="e.g., John Smith, ABC Collections"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Jurisdiction</label>
                <Input
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  placeholder="e.g., California, Federal District Court"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Available Documents (comma-separated)
                </label>
                <Input
                  value={documents}
                  onChange={(e) => setDocuments(e.target.value)}
                  placeholder="e.g., Demand Letter, Phone Records, Credit Report"
                />
              </div>

              <Button
                onClick={handleDetect}
                disabled={detectMutation.isPending}
                className="w-full"
                size="lg"
              >
                {detectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Detect Case Type & Generate Workflow
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {detectionResult && (
            <>
              {/* Detection Result */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Detection Result</h2>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Case Type</span>
                      <Badge variant="outline">{detectionResult.caseType}</Badge>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Confidence</span>
                      <Badge variant="outline">
                        {Math.round(detectionResult.confidence * 100)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Complexity</span>
                      <Badge
                        variant="outline"
                        className={getComplexityColor(detectionResult.estimatedComplexity)}
                      >
                        {detectionResult.estimatedComplexity}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">Suggested Strategy</h3>
                    <p className="text-sm text-muted-foreground">
                      {detectionResult.suggestedStrategy}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">Relevant Laws</h3>
                    <div className="flex flex-wrap gap-2">
                      {detectionResult.relevantLaws.map((law: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          {law}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Workflow Progress */}
              {workflow.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Workflow Progress ({completedSteps.size}/{workflow.length})
                  </h2>

                  <div className="space-y-2">
                    {workflow.map((step, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                        onClick={() => toggleStep(index)}
                      >
                        {completedSteps.has(index) ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            completedSteps.has(index)
                              ? 'line-through text-muted-foreground'
                              : ''
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Document Checklist */}
              {documentSuggestions && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Document Checklist</h2>

                  <div className="space-y-4">
                    {documentSuggestions.required.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          Required Documents
                        </h3>
                        <div className="space-y-1">
                          {documentSuggestions.required.map((doc: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4 text-red-500" />
                              {doc}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {documentSuggestions.missing.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          Missing Documents
                        </h3>
                        <div className="space-y-1">
                          {documentSuggestions.missing.map((doc: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4 text-yellow-500" />
                              {doc}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {documentSuggestions.optional.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          Optional Documents
                        </h3>
                        <div className="space-y-1">
                          {documentSuggestions.optional.map((doc: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4 text-blue-500" />
                              {doc}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </>
          )}

          {!detectionResult && (
            <Card className="p-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Enter case information and click "Detect Case Type" to get started
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
