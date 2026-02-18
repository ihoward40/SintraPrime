import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  Circle,
  AlertCircle,
  Sparkles,
  Upload,
  Download,
  Clock,
  Target,
  ListChecks,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useParams } from "wouter";

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDate?: string;
  documents?: string[];
}

interface DocumentItem {
  id: string;
  name: string;
  required: boolean;
  uploaded: boolean;
  url?: string;
}

export default function CaseTemplate() {
  const params = useParams();
  const caseId = params.id ? parseInt(params.id) : null;
  
  const [detectedCaseType, setDetectedCaseType] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  // Mock case data for demonstration
  const [caseData, setCaseData] = useState<any>(null);
  
  useEffect(() => {
    if (caseId) {
      // In production, fetch from API
      setCaseData({
        id: caseId,
        title: "Sample FDCPA Case",
        description: "Debt collector violated FDCPA by making harassing calls",
      });
    }
  }, [caseId]);

  // Mutations
  const detectCaseTypeMutation = trpc.caseTemplates.detectCaseType.useMutation({
    onSuccess: (data) => {
      setDetectedCaseType(data.caseType);
      toast.success(`Case type detected: ${data.caseType}`);
      setIsDetecting(false);
      // Automatically generate workflow after detection
      generateWorkflowMutation.mutate({
        caseType: data.caseType,
      });
    },
    onError: (error: any) => {
      toast.error(`Detection failed: ${error.message}`);
      setIsDetecting(false);
    },
  });

  const generateWorkflowMutation = trpc.caseTemplates.generateWorkflow.useMutation({
    onSuccess: (data) => {
      setWorkflowSteps(data.workflow.map((step: any, idx: number) => ({
        id: `step-${idx}`,
        title: step.title,
        description: step.description,
        completed: false,
        dueDate: step.dueDate,
        documents: step.documents,
      })));
      toast.success("Case workflow generated successfully");
      // Also suggest documents
      if (detectedCaseType) {
        suggestDocumentsMutation.mutate({
          caseType: detectedCaseType,
          currentDocuments: [],
        });
      }
    },
    onError: (error: any) => {
      toast.error(`Workflow generation failed: ${error.message}`);
    },
  });

  const suggestDocumentsMutation = trpc.caseTemplates.suggestDocuments.useMutation({
    onSuccess: (data) => {
      const allDocs = [
        ...data.required.map((name: string, idx: number) => ({
          id: `req-${idx}`,
          name,
          required: true,
          uploaded: false,
        })),
        ...data.optional.map((name: string, idx: number) => ({
          id: `opt-${idx}`,
          name,
          required: false,
          uploaded: false,
        })),
      ];
      setDocuments(allDocs);
      toast.success("Document checklist generated");
    },
    onError: (error: any) => {
      toast.error(`Document suggestion failed: ${error.message}`);
    },
  });

  // Auto-detect case type on load
  useEffect(() => {
    if (caseData && !detectedCaseType && !isDetecting) {
      setIsDetecting(true);
      detectCaseTypeMutation.mutate({
        title: caseData.title,
        description: caseData.description || "",
      });
    }
  }, [caseData]);

  const handleToggleStep = (stepId: string) => {
    setWorkflowSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, completed: !step.completed } : step
      )
    );
    // In production, save to database
    toast.success("Step updated");
  };

  const handleFileUpload = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In production, upload to S3 here
    const url = URL.createObjectURL(file);
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, uploaded: true, url } : doc
      )
    );
    toast.success(`${file.name} uploaded successfully`);
  };

  const completedSteps = workflowSteps.filter((s) => s.completed).length;
  const totalSteps = workflowSteps.length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const uploadedDocs = documents.filter((d) => d.uploaded).length;
  const totalDocs = documents.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Case Template</h1>
          <p className="text-muted-foreground">
            AI-powered workflow and document management
          </p>
        </div>

        {/* Case Type Detection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Case Type Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isDetecting ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Analyzing case details...
                </span>
              </div>
            ) : detectedCaseType ? (
              <div className="flex items-center gap-3">
                <Badge variant="default" className="text-sm">
                  {detectedCaseType}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Template generated based on case type
                </span>
              </div>
            ) : (
              <Button
                onClick={() => {
                if (caseData) {
                  setIsDetecting(true);
                  detectCaseTypeMutation.mutate({
                    title: caseData.title,
                    description: caseData.description || "",
                  });
                }
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Detect Case Type
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Workflow Progress */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Workflow Progress
                </CardTitle>
                <Badge variant="outline">
                  {completedSteps}/{totalSteps} Steps
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>

              <Separator className="my-4" />

              <ScrollArea className="flex-1">
                <div className="space-y-3">
                  {workflowSteps.length === 0 ? (
                    <div className="text-center py-8">
                      <ListChecks className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No workflow steps yet. Detect case type to generate template.
                      </p>
                    </div>
                  ) : (
                    workflowSteps.map((step) => (
                      <Card
                        key={step.id}
                        className={`cursor-pointer transition-colors ${
                          step.completed ? "bg-green-50/50 dark:bg-green-950/10" : ""
                        }`}
                        onClick={() => handleToggleStep(step.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {step.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{step.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {step.description}
                              </p>
                              {step.dueDate && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    Due: {new Date(step.dueDate).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              {step.documents && step.documents.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {step.documents.map((doc, idx) => (
                                    <Badge key={idx} variant="secondary" className="text-xs">
                                      {doc}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Document Checklist */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Document Checklist
                </CardTitle>
                <Badge variant="outline">
                  {uploadedDocs}/{totalDocs} Uploaded
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-3">
                  {documents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No documents required yet. Generate template to see checklist.
                      </p>
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <Card key={doc.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              {doc.uploaded ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{doc.name}</p>
                                  {doc.required && (
                                    <Badge variant="destructive" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                                {doc.uploaded && doc.url && (
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                  >
                                    View document
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {doc.uploaded ? (
                                <Button size="sm" variant="outline">
                                  <Download className="h-4 w-4" />
                                </Button>
                              ) : (
                                <label>
                                  <Button size="sm" variant="outline" asChild>
                                    <span>
                                      <Upload className="h-4 w-4" />
                                    </span>
                                  </Button>
                                  <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => handleFileUpload(doc.id, e)}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
