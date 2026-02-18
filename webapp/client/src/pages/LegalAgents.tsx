import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  FileText, 
  Search, 
  PenTool, 
  Shield, 
  Sparkles, 
  Copy, 
  Download,
  AlertCircle,
  CheckCircle2,
  Brain
} from "lucide-react";
import { Streamdown } from "streamdown";

type AgentType = "contract" | "research" | "brief" | "deposition";

const agentInfo = {
  contract: {
    title: "Contract Review Assistant",
    description: "Analyze contracts for risks, obligations, and key clauses",
    icon: FileText,
    color: "text-blue-500",
    placeholder: "Paste your contract text here for analysis...",
    examples: [
      "Analyze this employment agreement for potential issues",
      "Review this NDA for standard vs. unusual clauses",
      "Check this lease agreement for tenant protections"
    ]
  },
  research: {
    title: "Legal Research Agent",
    description: "Find relevant case law, statutes, and legal precedents",
    icon: Search,
    color: "text-green-500",
    placeholder: "Describe your legal research question...",
    examples: [
      "Find cases about FDCPA violations for debt collectors",
      "Research statute of limitations for consumer fraud in California",
      "Find precedents for motion to compel discovery"
    ]
  },
  brief: {
    title: "Brief Writing Helper",
    description: "Generate legal briefs with proper formatting and citations",
    icon: PenTool,
    color: "text-purple-500",
    placeholder: "Describe the brief you need to write...",
    examples: [
      "Draft a motion to dismiss for lack of jurisdiction",
      "Write a response to motion for summary judgment",
      "Create an opening statement for small claims court"
    ]
  },
  deposition: {
    title: "Deposition Prep Assistant",
    description: "Prepare deposition questions and strategy",
    icon: Shield,
    color: "text-orange-500",
    placeholder: "Describe the deposition scenario...",
    examples: [
      "Prepare questions for defendant in debt collection case",
      "Strategy for deposing expert witness in medical malpractice",
      "Cross-examination questions for hostile witness"
    ]
  }
};

export default function LegalAgents() {
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("contract");
  const [input, setInput] = useState("");
  const [caseContext, setCaseContext] = useState<string>("none");
  const [response, setResponse] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const casesQuery = trpc.cases.list.useQuery();
  const analyzeContract = trpc.ai.analyzeContract.useMutation();
  const researchLaw = trpc.ai.researchLaw.useMutation();
  const generateBrief = trpc.ai.generateBrief.useMutation();
  const prepDeposition = trpc.ai.prepDeposition.useMutation();

  const handleAnalyze = async () => {
    if (!input.trim()) {
      alert("Please enter some text to analyze");
      return;
    }

    setIsAnalyzing(true);
    setResponse("");

    try {
      let result;
      switch (selectedAgent) {
        case "contract":
          result = await analyzeContract.mutateAsync({ 
            contractText: input, 
            caseId: caseContext ? parseInt(caseContext) : undefined 
          });
          break;
        case "research":
          result = await researchLaw.mutateAsync({ 
            query: input, 
            caseId: caseContext ? parseInt(caseContext) : undefined 
          });
          break;
        case "brief":
          result = await generateBrief.mutateAsync({ 
            briefType: input, 
            caseId: caseContext ? parseInt(caseContext) : undefined 
          });
          break;
        case "deposition":
          result = await prepDeposition.mutateAsync({ 
            scenario: input, 
            caseId: caseContext ? parseInt(caseContext) : undefined 
          });
          break;
      }
      setResponse((result as any).analysis || (result as any).result || "");
    } catch (error: any) {
      setResponse(`Error: ${error.message || "Failed to analyze"}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(response);
    alert("Copied to clipboard!");
  };

  const downloadAsText = () => {
    const blob = new Blob([response], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedAgent}-analysis-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const agent = agentInfo[selectedAgent];
  const Icon = agent.icon;

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="h-8 w-8" />
          Legal AI Agents
        </h1>
        <p className="text-muted-foreground mt-2">
          Specialized AI assistants for contract review, legal research, brief writing, and deposition prep
        </p>
      </div>

      {/* Agent Selector */}
      <Tabs value={selectedAgent} onValueChange={(v) => setSelectedAgent(v as AgentType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="contract" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contract
          </TabsTrigger>
          <TabsTrigger value="research" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Research
          </TabsTrigger>
          <TabsTrigger value="brief" className="flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            Brief
          </TabsTrigger>
          <TabsTrigger value="deposition" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Deposition
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedAgent} className="space-y-6">
          {/* Agent Info Card */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg bg-primary/10 ${agent.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{agent.title}</h2>
                <p className="text-muted-foreground mt-1">{agent.description}</p>
                <div className="mt-4">
                  <Label className="text-sm font-medium">Example Queries:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {agent.examples.map((example, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => setInput(example)}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Input Section */}
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Case Context (Optional)</Label>
              <Select value={caseContext} onValueChange={setCaseContext}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case for context" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No case context</SelectItem>
                  {casesQuery.data?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Your Input</Label>
              <Textarea
                placeholder={agent.placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !input.trim()}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze with {agent.title}
                </>
              )}
            </Button>
          </Card>

          {/* Response Section */}
          {response && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {response.startsWith("Error") ? (
                    <>
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      Analysis Error
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Analysis Complete
                    </>
                  )}
                </h3>
                {!response.startsWith("Error") && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadAsText}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                )}
              </div>

              <div className="prose prose-sm max-w-none dark:prose-invert">
                <Streamdown>{response}</Streamdown>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
