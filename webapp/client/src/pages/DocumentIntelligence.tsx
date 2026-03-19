import { useState, useRef } from "react";
import {
  Brain, FileText, Upload, Search, AlertTriangle, Users, Calendar,
  CheckCircle, Clock, Trash2, Eye, ChevronDown, ChevronUp, Zap, Shield
} from "lucide-react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  complete: "bg-green-500/20 text-green-400 border-green-500/30",
  processing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

const RISK_COLORS: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-green-400",
};

export default function DocumentIntelligence() {
  const { toast } = useToast();
  const [textContent, setTextContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [focusArea, setFocusArea] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [quickSummary, setQuickSummary] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: analyses, refetch } = trpc.documentIntelligence.list.useQuery({});
  const analyzeText = trpc.documentIntelligence.analyzeText.useMutation();
  const quickSummarize = trpc.documentIntelligence.quickSummarize.useMutation();
  const deleteAnalysis = trpc.documentIntelligence.delete.useMutation();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setTextContent(ev.target?.result as string ?? "");
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    if (!textContent.trim() || !fileName.trim()) {
      toast({ title: "Missing fields", description: "Please provide a file name and document text.", variant: "destructive" });
      return;
    }
    await analyzeText.mutateAsync({ fileName, textContent });
    toast({ title: "Analysis started!", description: "Your document is being analyzed by AI." });
    setTextContent("");
    setFileName("");
    refetch();
  };

  const handleQuickSummarize = async () => {
    if (!textContent.trim()) return;
    const result = await quickSummarize.mutateAsync({ textContent, focusArea: focusArea || undefined });
    setQuickSummary(result.summary);
  };

  const handleDelete = async (id: number) => {
    await deleteAnalysis.mutateAsync({ id });
    refetch();
    toast({ title: "Deleted", description: "Analysis record removed." });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <Brain className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Document Intelligence</h1>
          <p className="text-gray-400 text-sm">AI-powered clause extraction, entity recognition, and risk analysis</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">{analyses?.length ?? 0} Analyses</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Analyzed", value: analyses?.length ?? 0, icon: FileText, color: "text-blue-400" },
          { label: "Complete", value: analyses?.filter(a => a.processingStatus === "complete").length ?? 0, icon: CheckCircle, color: "text-green-400" },
          { label: "Processing", value: analyses?.filter(a => a.processingStatus === "processing").length ?? 0, icon: Clock, color: "text-yellow-400" },
          { label: "Failed", value: analyses?.filter(a => a.processingStatus === "failed").length ?? 0, icon: AlertTriangle, color: "text-red-400" },
        ].map(stat => (
          <Card key={stat.label} className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-gray-400 text-xs">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="analyze">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="analyze">Analyze Document</TabsTrigger>
          <TabsTrigger value="quick">Quick Summary</TabsTrigger>
          <TabsTrigger value="history">Analysis History</TabsTrigger>
        </TabsList>

        {/* Analyze Tab */}
        <TabsContent value="analyze" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" /> Full AI Document Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Document name (e.g., Contract_2024.txt)"
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="border-gray-600 text-gray-300 hover:text-white"
                >
                  <Upload className="h-4 w-4 mr-2" /> Upload File
                </Button>
                <input ref={fileRef} type="file" accept=".txt,.md,.csv" className="hidden" onChange={handleFileUpload} />
              </div>
              <Textarea
                placeholder="Paste document text here, or upload a .txt file above..."
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white min-h-[200px] font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-xs">{textContent.length.toLocaleString()} characters</p>
                <Button
                  onClick={handleAnalyze}
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={!textContent.trim() || !fileName.trim() || analyzeText.isPending}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  {analyzeText.isPending ? "Analyzing..." : "Run Full Analysis"}
                </Button>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Users, title: "Entity Recognition", desc: "Identifies all parties, organizations, courts, and agencies mentioned in the document." },
              { icon: Shield, title: "Clause Extraction", desc: "Extracts and categorizes key clauses: payment, liability, termination, confidentiality, and more." },
              { icon: AlertTriangle, title: "Risk Analysis", desc: "Flags high-risk provisions, contradictions, and unfavorable terms with severity ratings." },
            ].map(item => (
              <Card key={item.title} className="bg-gray-800/30 border-gray-700/50">
                <CardContent className="p-4 flex gap-3">
                  <item.icon className="h-8 w-8 text-purple-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-white font-medium text-sm">{item.title}</p>
                    <p className="text-gray-400 text-xs mt-1">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Quick Summary Tab */}
        <TabsContent value="quick" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" /> Quick Summary (No Storage)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Focus area (optional, e.g., 'payment terms', 'liability clauses')"
                value={focusArea}
                onChange={e => setFocusArea(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <Textarea
                placeholder="Paste document text here..."
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white min-h-[150px]"
              />
              <Button
                onClick={handleQuickSummarize}
                className="bg-yellow-600 hover:bg-yellow-700"
                disabled={!textContent.trim() || quickSummarize.isPending}
              >
                <Zap className="h-4 w-4 mr-2" />
                {quickSummarize.isPending ? "Summarizing..." : "Quick Summarize"}
              </Button>
              {quickSummary && (
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{quickSummary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-3">
          {(!analyses || analyses.length === 0) && (
            <div className="text-center py-16 text-gray-500">
              <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No analyses yet. Upload a document to get started.</p>
            </div>
          )}
          {analyses?.map(analysis => (
            <Card key={analysis.id} className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-white font-medium text-sm">{analysis.fileName}</p>
                      <p className="text-gray-500 text-xs">{new Date(analysis.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[analysis.processingStatus]}>
                      {analysis.processingStatus}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setExpandedId(expandedId === analysis.id ? null : analysis.id)}
                      className="text-gray-400 hover:text-white"
                    >
                      {expandedId === analysis.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(analysis.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {expandedId === analysis.id && analysis.processingStatus === "complete" && (
                  <div className="mt-4 space-y-4 border-t border-gray-700 pt-4">
                    {analysis.summary && (
                      <div>
                        <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">Summary</p>
                        <p className="text-gray-300 text-sm">{analysis.summary}</p>
                      </div>
                    )}
                    {Array.isArray(analysis.risks) && (analysis.risks as any[]).length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">Risks Identified</p>
                        <div className="space-y-1">
                          {(analysis.risks as any[]).map((risk: any, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <AlertTriangle className={`h-3 w-3 mt-0.5 flex-shrink-0 ${RISK_COLORS[risk.severity] ?? "text-gray-400"}`} />
                              <p className="text-gray-300 text-xs">{risk.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {Array.isArray(analysis.keyParties) && (analysis.keyParties as any[]).length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">Key Parties</p>
                        <div className="flex flex-wrap gap-2">
                          {(analysis.keyParties as any[]).map((party: any, i: number) => (
                            <Badge key={i} className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                              {party.name} ({party.role})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {Array.isArray(analysis.keyDates) && (analysis.keyDates as any[]).length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wide">Key Dates</p>
                        <div className="space-y-1">
                          {(analysis.keyDates as any[]).map((d: any, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-gray-300 text-xs"><strong>{d.label}:</strong> {d.date}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
