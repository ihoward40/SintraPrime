import { useState } from "react";
import { Cpu, Zap, DollarSign, Lock, RotateCcw, Play, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useToast } from "../hooks/use-toast";

const COST_COLORS: Record<string, string> = {
  low: "bg-green-500/20 text-green-400 border-green-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  premium: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function LLMRouter() {
  const { toast } = useToast();
  const [testPrompt, setTestPrompt] = useState("Summarize the key elements of a valid contract in 3 bullet points.");
  const [testModel, setTestModel] = useState("gpt-4o");
  const [testResult, setTestResult] = useState<{ success: boolean; response?: string; error?: string; latencyMs?: number } | null>(null);

  const { data: config, refetch } = trpc.llmRouterConfig.getConfig.useQuery();
  const { data: models } = trpc.llmRouterConfig.getAvailableModels.useQuery();
  const { data: taskTypes } = trpc.llmRouterConfig.getTaskTypes.useQuery();
  const updateConfig = trpc.llmRouterConfig.updateConfig.useMutation();
  const testModelMutation = trpc.llmRouterConfig.testModel.useMutation();

  const handleUpdate = async (updates: Record<string, any>) => {
    await updateConfig.mutateAsync(updates);
    refetch();
    toast({ title: "Configuration saved!" });
  };

  const handleTest = async () => {
    setTestResult(null);
    const result = await testModelMutation.mutateAsync({ modelId: testModel, prompt: testPrompt });
    setTestResult(result);
  };

  const modelOptions = models?.map(m => ({ value: m.id, label: m.name })) ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-500/10 rounded-lg">
          <Cpu className="h-6 w-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">LLM Router</h1>
          <p className="text-gray-400 text-sm">Configure which AI model handles each type of task</p>
        </div>
      </div>

      {/* Global Settings */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base">Global Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" /> Auto-Route
              </p>
              <p className="text-gray-400 text-xs mt-0.5">Automatically select the best model for each task type</p>
            </div>
            <Switch
              checked={config?.autoRoute ?? true}
              onCheckedChange={v => handleUpdate({ autoRoute: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-400" /> Cost Optimization
              </p>
              <p className="text-gray-400 text-xs mt-0.5">Prefer cheaper models when quality difference is minimal</p>
            </div>
            <Switch
              checked={config?.costOptimize ?? false}
              onCheckedChange={v => handleUpdate({ costOptimize: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-red-400" /> Privacy Mode
              </p>
              <p className="text-gray-400 text-xs mt-0.5">Route sensitive data to local or privacy-first models only</p>
            </div>
            <Switch
              checked={config?.privacyMode ?? false}
              onCheckedChange={v => handleUpdate({ privacyMode: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Task-Model Mapping */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base">Task-to-Model Mapping</CardTitle>
          <CardDescription className="text-gray-400">Assign specific models to each task type</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {taskTypes?.map(task => {
            const configKey = task.id === "reasoning" ? "reasoningModel"
              : task.id === "longDoc" ? "longDocModel"
              : task.id === "fast" ? "fastModel"
              : "defaultModel";
            const currentModel = (config as any)?.[configKey] ?? "gpt-4o";

            return (
              <div key={task.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{task.label}</p>
                  <p className="text-gray-400 text-xs">{task.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-600" />
                <Select
                  value={currentModel}
                  onValueChange={v => handleUpdate({ [configKey]: v })}
                >
                  <SelectTrigger className="w-52 bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {modelOptions.map(m => (
                      <SelectItem key={m.value} value={m.value} className="text-white">{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Available Models */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base">Available Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {models?.map(model => (
              <div key={model.id} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white text-sm font-medium">{model.name}</p>
                  <Badge className={COST_COLORS[model.costTier]}>{model.costTier}</Badge>
                </div>
                <p className="text-gray-500 text-xs mb-2">{model.provider}</p>
                <div className="flex flex-wrap gap-1">
                  {model.strengths.map(s => (
                    <Badge key={s} className="bg-gray-700 text-gray-300 border-gray-600 text-xs">{s}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Model Tester */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Play className="h-4 w-4 text-green-400" /> Model Tester
          </CardTitle>
          <CardDescription className="text-gray-400">Test any model with a custom prompt to compare quality and speed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Select value={testModel} onValueChange={setTestModel}>
              <SelectTrigger className="w-52 bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {modelOptions.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-white">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleTest} className="bg-green-600 hover:bg-green-700" disabled={testModelMutation.isPending}>
              <Play className="h-4 w-4 mr-2" />
              {testModelMutation.isPending ? "Testing..." : "Run Test"}
            </Button>
          </div>
          <Textarea
            value={testPrompt}
            onChange={e => setTestPrompt(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white min-h-[80px]"
            placeholder="Enter test prompt..."
          />
          {testResult && (
            <div className={`rounded-lg p-4 border ${testResult.success ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
              <div className="flex items-center gap-2 mb-2">
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm text-gray-300">{testModel}</span>
                {testResult.latencyMs && (
                  <Badge className="ml-auto bg-gray-700 text-gray-300 border-gray-600 text-xs">{testResult.latencyMs}ms</Badge>
                )}
              </div>
              {testResult.success ? (
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{testResult.response}</p>
              ) : (
                <p className="text-red-300 text-sm">{testResult.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
