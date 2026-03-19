import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Eye,
  Upload,
  Image as ImageIcon,
  Sparkles,
  FileSearch,
  Table,
  ScanLine,
  Brain,
  Loader2,
  Download,
  Copy,
  Check,
  Trash2,
  ChevronRight,
  BarChart3,
  AlertCircle,
  FileText,
  Camera,
  Zap,
} from "lucide-react";

type AnalysisMode =
  | "describe"
  | "extract-text"
  | "extract-table"
  | "document-analysis"
  | "legal-review"
  | "custom";

interface AnalysisResult {
  mode: AnalysisMode;
  result: string;
  confidence: number;
  timestamp: Date;
  model: string;
}

const VLM_MODELS = [
  { id: "gpt-4o", name: "GPT-4o Vision", provider: "OpenAI", best: "General purpose" },
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", best: "Document analysis" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", best: "Tables & charts" },
  { id: "llava-1.6", name: "LLaVA 1.6 (Local)", provider: "LocalAI", best: "Privacy-first" },
];

const ANALYSIS_MODES: { id: AnalysisMode; label: string; icon: React.ElementType; description: string }[] = [
  { id: "describe", label: "Describe Image", icon: Eye, description: "Get a detailed description of the image" },
  { id: "extract-text", label: "Extract Text (OCR)", icon: ScanLine, description: "Extract all text from the image" },
  { id: "extract-table", label: "Extract Tables", icon: Table, description: "Convert visual tables to structured data" },
  { id: "document-analysis", label: "Document Analysis", icon: FileSearch, description: "Analyze legal or business documents" },
  { id: "legal-review", label: "Legal Document Review", icon: FileText, description: "Extract clauses, parties, and key terms" },
  { id: "custom", label: "Custom Prompt", icon: Brain, description: "Ask anything about the image" },
];

const SAMPLE_IMAGES = [
  { label: "Contract Document", url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600", type: "document" },
  { label: "Court Filing", url: "https://images.unsplash.com/photo-1568992688065-536aad8a12f6?w=600", type: "legal" },
  { label: "Data Chart", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600", type: "chart" },
];

export default function VisionStudio() {
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [selectedMode, setSelectedMode] = useState<AnalysisMode>("describe");
  const [customPrompt, setCustomPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP, etc.)");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target?.result as string);
      setImageUrl("");
    };
    reader.readAsDataURL(file);
    toast.success(`Loaded: ${file.name}`);
  };

  const handleUrlLoad = () => {
    if (!imageUrl.trim()) {
      toast.error("Please enter an image URL");
      return;
    }
    setUploadedImage(imageUrl);
    toast.success("Image URL loaded!");
  };

  const handleSampleImage = (url: string) => {
    setUploadedImage(url);
    setImageUrl(url);
    toast.success("Sample image loaded!");
  };

  const handleAnalyze = async () => {
    if (!uploadedImage) {
      toast.error("Please upload or link an image first");
      return;
    }
    if (selectedMode === "custom" && !customPrompt.trim()) {
      toast.error("Please enter a custom prompt");
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);

    // Simulate progressive analysis
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 12, 90));
    }, 200);

    await new Promise((r) => setTimeout(r, 2000));
    clearInterval(interval);
    setProgress(100);

    // Generate mock result based on mode
    const mockResults: Record<AnalysisMode, string> = {
      describe: `**Image Analysis Complete**\n\nThe image shows a professional document with structured formatting. Key visual elements include:\n\n\u2022 Header section with logo and title\n\u2022 Structured body text in two columns\n\u2022 Signature block at the bottom\n\u2022 Official seal/watermark\n\nThe document appears to be a formal legal instrument with standard formatting conventions. Text density is high, suggesting detailed contractual language.`,
      "extract-text": `**Extracted Text (OCR)**\n\nCONFIDENTIAL LEGAL DOCUMENT\n\nThis Agreement (\"Agreement\") is entered into as of [DATE] by and between:\n\nPARTY A: [Name], a corporation organized under the laws of [State]\n\nPARTY B: [Name], an individual residing at [Address]\n\nWHEREAS, the parties desire to enter into this agreement on the terms set forth herein...\n\n[Additional text extracted with 97.3% confidence]`,
      "extract-table": `**Table Extraction Results**\n\n| Column 1 | Column 2 | Column 3 | Column 4 |\n|----------|----------|----------|----------|\n| Row 1 A | Row 1 B | Row 1 C | Row 1 D |\n| Row 2 A | Row 2 B | Row 2 C | Row 2 D |\n| Row 3 A | Row 3 B | Row 3 C | Row 3 D |\n| **Total** | | | **$124,500** |\n\n*Table extracted with 99.1% accuracy. CSV download available.*`,
      "document-analysis": `**Document Analysis Report**\n\n\uD83D\uDCCB **Document Type**: Legal Contract / Agreement\n\uD83D\uDCC5 **Estimated Date**: 2024\n\uD83D\uDD8F **Signatures Required**: 2\n\u2696\uFE0F **Jurisdiction**: Federal / State Law applicable\n\n**Key Sections Identified:**\n1. Recitals and Definitions (pg 1-2)\n2. Term and Termination (pg 3)\n3. Payment Terms (pg 4-5)\n4. Confidentiality (pg 6)\n5. Limitation of Liability (pg 7)\n\n**Risk Assessment**: Medium - Review clauses 4.2, 7.1, and 9.3 for potential issues.`,
      "legal-review": `**Legal Document Review**\n\n\u26A0\uFE0F **Key Findings:**\n\n**Parties Identified:**\n- Primary: ABC Corporation (Delaware)\n- Secondary: John Smith, Individual\n\n**Critical Clauses:**\n\u2022 Non-compete: 24 months, nationwide scope (potentially unenforceable in CA)\n\u2022 Arbitration: Mandatory, AAA rules, NYC venue\n\u2022 IP Assignment: Broad work-for-hire language\n\u2022 Indemnification: One-sided, favors Party A\n\n**Red Flags:** \uD83D\uDEA8\n1. Missing governing law clause\n2. Ambiguous \"affiliate\" definition\n3. No limitation on consequential damages for Party B\n\n**Recommendation**: Review with senior counsel before execution.`,
      custom: `**Custom Analysis Result**\n\nPrompt: \"${customPrompt}\"\n\nBased on the visual analysis of the provided image:\n\nThe image contains relevant information matching your query. The VLM model has identified key elements that directly relate to your prompt. Detailed findings are structured below based on visual inference:\n\n1. Primary observation: Relevant content identified in upper-left quadrant\n2. Secondary observation: Supporting evidence visible in main content area\n3. Contextual analysis: Based on visual context and your specific prompt\n\n*Analysis performed using ${selectedModel} with high confidence.*`,
    };

    const newResult: AnalysisResult = {
      mode: selectedMode,
      result: mockResults[selectedMode],
      confidence: Math.floor(Math.random() * 10) + 90,
      timestamp: new Date(),
      model: selectedModel,
    };

    setResults((prev) => [newResult, ...prev]);
    setIsAnalyzing(false);
    toast.success("Analysis complete!", { description: `${newResult.confidence}% confidence` });
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleDownload = (result: AnalysisResult, idx: number) => {
    const blob = new Blob([result.result], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vlm-analysis-${result.mode}-${Date.now()}.txt`;
    a.click();
    toast.success("Analysis downloaded!");
  };

  const currentMode = ANALYSIS_MODES.find((m) => m.id === selectedMode);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg">
            <Eye className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              VLM Vision Studio
              <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs">
                <Sparkles className="h-2.5 w-2.5 mr-1" />
                New
              </Badge>
            </h1>
            <p className="text-muted-foreground text-sm">
              Vision Language Models for document analysis, OCR, and visual AI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {VLM_MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.provider} · {model.best}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* Left: Input Panel */}
        <div className="col-span-2 space-y-4">
          {/* Image Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Image Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Upload area */}
              <div
                className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadedImage ? (
                  <img
                    src={uploadedImage}
                    alt="Uploaded"
                    className="max-h-48 mx-auto rounded-md object-contain"
                    onError={() => setUploadedImage(null)}
                  />
                ) : (
                  <div className="space-y-2 py-4">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, WebP up to 20MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* URL input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Or paste image URL..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="text-xs"
                />
                <Button size="sm" variant="outline" onClick={handleUrlLoad}>
                  Load
                </Button>
              </div>

              {/* Sample images */}
              <div>
                <Label className="text-xs text-muted-foreground">Sample images:</Label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {SAMPLE_IMAGES.map((img) => (
                    <Button
                      key={img.label}
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => handleSampleImage(img.url)}
                    >
                      {img.label}
                    </Button>
                  ))}
                </div>
              </div>

              {uploadedImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-red-500 w-full"
                  onClick={() => { setUploadedImage(null); setImageUrl(""); }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remove Image
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Analysis Mode */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Analysis Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ANALYSIS_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-md text-left text-sm transition-colors ${
                      selectedMode === mode.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{mode.label}</p>
                      <p className={`text-xs truncate ${selectedMode === mode.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {mode.description}
                      </p>
                    </div>
                    {selectedMode === mode.id && <Check className="h-3 w-3 shrink-0" />}
                  </button>
                );
              })}

              {selectedMode === "custom" && (
                <Textarea
                  placeholder="What do you want to know about this image? Ask anything..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="mt-2 text-xs min-h-[80px]"
                />
              )}

              {/* Analyze button */}
              <Button
                className="w-full mt-2"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !uploadedImage}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Analyze with {VLM_MODELS.find((m) => m.id === selectedModel)?.name}
                  </>
                )}
              </Button>

              {isAnalyzing && (
                <div className="space-y-1">
                  <Progress value={progress} className="h-1.5" />
                  <p className="text-xs text-center text-muted-foreground">{progress}% complete</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Results Panel */}
        <div className="col-span-3 space-y-4">
          {results.length === 0 ? (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-16 space-y-3">
                <Eye className="h-16 w-16 mx-auto text-muted-foreground/30" />
                <h3 className="text-lg font-medium text-muted-foreground">Ready to Analyze</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Upload an image and select an analysis mode to get started with VLM Vision Studio.
                </p>
                <div className="grid grid-cols-3 gap-3 mt-6 text-left">
                  {[
                    { icon: ScanLine, label: "OCR & Text Extraction", desc: "Extract text from any image" },
                    { icon: FileSearch, label: "Document Analysis", desc: "Analyze legal documents" },
                    { icon: Table, label: "Table Extraction", desc: "Convert visual tables to data" },
                  ].map((feat) => (
                    <div key={feat.label} className="bg-secondary/50 rounded-lg p-3 space-y-1">
                      <feat.icon className="h-5 w-5 text-primary" />
                      <p className="text-xs font-medium">{feat.label}</p>
                      <p className="text-xs text-muted-foreground">{feat.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {results.map((result, idx) => {
                const mode = ANALYSIS_MODES.find((m) => m.id === result.mode);
                const ModeIcon = mode?.icon || Eye;
                return (
                  <Card key={idx} className="border-l-4 border-l-primary">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ModeIcon className="h-4 w-4 text-primary" />
                          <CardTitle className="text-sm">{mode?.label || result.mode}</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            <BarChart3 className="h-2.5 w-2.5 mr-1" />
                            {result.confidence}% confidence
                          </Badge>
                          <Badge variant="outline" className="text-xs">{result.model}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleCopy(result.result, idx)}
                          >
                            {copiedIdx === idx ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleDownload(result, idx)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setResults((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-xs">
                        {result.timestamp.toLocaleTimeString()} · {result.timestamp.toLocaleDateString()}
                      </CardDescription>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-3">
                      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                        {result.result}
                      </pre>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
