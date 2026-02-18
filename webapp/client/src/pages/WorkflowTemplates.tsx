import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2,
  FileText,
  Search,
  Gavel,
  FileSearch,
  Mail,
  ChevronRight,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const categoryIcons = {
  contract: FileText,
  research: FileSearch,
  filing: Gavel,
  discovery: Search,
  client: Mail,
};

export default function WorkflowTemplates() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [workflowInputs, setWorkflowInputs] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const categoriesQuery = trpc.agent.getWorkflowCategories.useQuery();
  const templatesQuery = trpc.agent.getWorkflowTemplates.useQuery();
  const executeWorkflowMutation = trpc.agent.executeWorkflow.useMutation();

  const handleExecuteWorkflow = async () => {
    if (!selectedWorkflow) return;

    setIsExecuting(true);
    setResult(null);

    try {
      const response = await executeWorkflowMutation.mutateAsync({
        workflowId: selectedWorkflow.id,
        inputs: workflowInputs,
      });
      setResult(response);
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const filteredTemplates = selectedCategory
    ? templatesQuery.data?.filter((t: any) => t.category === selectedCategory)
    : templatesQuery.data;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Workflow Templates</h1>
        <p className="text-muted-foreground">
          Pre-built multi-step workflows for common legal tasks. Each workflow combines multiple AI agents and tools to
          complete complex tasks automatically.
        </p>
      </div>

      {/* Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Browse workflows by category</CardDescription>
        </CardHeader>
        <CardContent>
          {categoriesQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : categoriesQuery.data ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                className="h-auto py-4 flex-col gap-2"
                onClick={() => setSelectedCategory(null)}
              >
                <FileText className="h-6 w-6" />
                <div className="text-sm font-medium">All</div>
                <div className="text-xs text-muted-foreground">{templatesQuery.data?.length || 0} workflows</div>
              </Button>

              {categoriesQuery.data.map((cat: any) => {
                const Icon = categoryIcons[cat.id as keyof typeof categoryIcons];
                return (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    className="h-auto py-4 flex-col gap-2"
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <Icon className="h-6 w-6" />
                    <div className="text-sm font-medium">{cat.name}</div>
                    <div className="text-xs text-muted-foreground">{cat.count} workflows</div>
                  </Button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Failed to load categories</div>
          )}
        </CardContent>
      </Card>

      {/* Workflow List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {selectedCategory
              ? categoriesQuery.data?.find((c: any) => c.id === selectedCategory)?.name
              : "All Workflows"}
          </h2>

          {templatesQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates && filteredTemplates.length > 0 ? (
            <div className="space-y-3">
              {filteredTemplates.map((workflow: any) => (
                <Card
                  key={workflow.id}
                  className={`cursor-pointer transition-colors hover:border-primary ${
                    selectedWorkflow?.id === workflow.id ? "border-primary" : ""
                  }`}
                  onClick={() => {
                    setSelectedWorkflow(workflow);
                    setWorkflowInputs({});
                    setResult(null);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{workflow.name}</CardTitle>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {workflow.estimatedTime}
                      </Badge>
                    </div>
                    <CardDescription>{workflow.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{workflow.steps.length} steps</span>
                      <span>•</span>
                      <span>{workflow.requiredInputs.filter((i: any) => i.required).length} required inputs</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No workflows found in this category</div>
          )}
        </div>

        {/* Workflow Details & Execution */}
        <div className="space-y-4">
          {selectedWorkflow ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{selectedWorkflow.name}</CardTitle>
                  <CardDescription>{selectedWorkflow.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Workflow Steps */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Workflow Steps:</h4>
                    <div className="space-y-2">
                      {selectedWorkflow.steps.map((step: any, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                              {idx + 1}
                            </div>
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="font-medium text-sm">{step.name}</div>
                            <div className="text-xs text-muted-foreground">{step.description}</div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {step.agentPattern}
                              </Badge>
                              {step.tools.map((tool: string) => (
                                <Badge key={tool} variant="secondary" className="text-xs">
                                  {tool}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Input Form */}
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-semibold text-sm">Required Inputs:</h4>

                    {selectedWorkflow.requiredInputs.map((input: any) => (
                      <div key={input.name} className="space-y-2">
                        <Label htmlFor={input.name}>
                          {input.name.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          {input.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>

                        {input.type === "text" && input.name.includes("text") ? (
                          <Textarea
                            id={input.name}
                            placeholder={input.description}
                            value={workflowInputs[input.name] || ""}
                            onChange={(e) =>
                              setWorkflowInputs({ ...workflowInputs, [input.name]: e.target.value })
                            }
                            rows={4}
                          />
                        ) : input.type === "select" && input.options ? (
                          <Select
                            value={workflowInputs[input.name] || ""}
                            onValueChange={(value) =>
                              setWorkflowInputs({ ...workflowInputs, [input.name]: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={input.description} />
                            </SelectTrigger>
                            <SelectContent>
                              {input.options.map((option: string) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id={input.name}
                            type={input.type}
                            placeholder={input.description}
                            value={workflowInputs[input.name] || ""}
                            onChange={(e) =>
                              setWorkflowInputs({ ...workflowInputs, [input.name]: e.target.value })
                            }
                          />
                        )}

                        <p className="text-xs text-muted-foreground">{input.description}</p>
                      </div>
                    ))}

                    <Button
                      onClick={handleExecuteWorkflow}
                      disabled={
                        isExecuting ||
                        selectedWorkflow.requiredInputs
                          .filter((i: any) => i.required)
                          .some((i: any) => !workflowInputs[i.name])
                      }
                      size="lg"
                      className="w-full"
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Executing Workflow...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Execute Workflow
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Execution Result */}
              {result && (
                <Card className={result.success ? "border-green-500" : "border-red-500"}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {result.success ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          Workflow Completed
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          Workflow Failed
                        </>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {result.success ? (
                      <>
                        {result.result && (
                          <div className="prose prose-sm max-w-none">
                            <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">{result.result}</div>
                          </div>
                        )}

                        {result.executionHistory && result.executionHistory.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Execution History:</h4>
                            <div className="space-y-2">
                              {result.executionHistory.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                                  <div className="flex-shrink-0 mt-1">
                                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                                      {idx + 1}
                                    </div>
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <div className="font-medium text-sm">{item.step.description}</div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {item.step.tool}
                                      </Badge>
                                      {item.result.success ? (
                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <XCircle className="h-3 w-3 text-red-500" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-red-500">
                        <p className="font-semibold">Error:</p>
                        <p className="text-sm">{result.error}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <ChevronRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a workflow from the list to get started</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
