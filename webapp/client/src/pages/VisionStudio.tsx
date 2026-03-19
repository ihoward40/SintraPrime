import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Eye,
  Upload,
  FileText,
  Search,
  Shield,
  Sparkles,
  Copy,
  Download,
  Trash2,
  Image as ImageIcon,
  Loader2,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Camera,
  ScanText,
  Microscope,
  BookOpen,
} from "lucide-react";

type AnalysisType = "general" | "ocr" | "evidence" | "document";

interface AnalysisResult {
  imageUrl: string;
  imageName: string;
  analysisType: AnalysisType;
  analysis: string;
  structuredData: {
    entities?: string[];
    summary?: string;
    confidence?: number;
  } | null;
  timestamp: Date;
}

const ANALYSIS_MODES: {
  id: AnalysisType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  prompt: string;
}[] = [
  {
    id: "general",
    label: "General Vision",
    description: "Describe what you see in full detail",
    icon: Eye,
    color: "text-blue-400",
    prompt: "Analyze this image in detail. Describe everything you see, including objects, people, text, colors, and any notable features.",
  },
  {
    id: "ocr",
    label: "OCR / Text Extract",
    description: "Extract all text from the image",
    icon: ScanText,
    color: "text-green-400",
    prompt: "Extract ALL text from this image exactly as it appears. Preserve formatting, line breaks, and layout. Include every word, number, and symbol you can read.",
  },
  {
    id: "evidence",
    label: "Evidence Analysis",
    description: "Analyze as legal evidence",
    icon: Microscope,
    color: "text-orange-400",
    prompt: "Analyze this image as potential legal evidence. Identify: 1) Key objects and their significance, 2) Any people visible, 3) Timestamps or dates, 4) Location indicators, 5) Any anomalies or alterations, 6) Chain of custody considerations, 7) Overall evidentiary value.",
  },
  {
    id: "document",
    label: "Document Analysis",
    description: "Analyze scanned documents & contracts",
    icon: BookOpen,
    color: "text-purple-400",
    prompt: "Analyze this document image. Identify: 1) Document type, 2) All parties involved, 3) Key dates, 4) Main clauses or provisions, 5) Signatures or notarizations, 6) Any red flags or unusual terms, 7) A brief summary of the document's purpose.",
  },
];

export default function VisionStudio() {
  const [selectedMode, setSelectedMode] = useState<AnalysisType>("general");
  const [customPrompt, setCustomPrompt] = useState("");
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Track the current object URL so we can revoke it to prevent memory leaks
  const previewObjectUrlRef = useRef<string | null>(null);

  const uploadMutation = trpc.upload.file.useMutation();
  const analyzeMutation = trpc.vlm.analyzeImage.useMutation();

  const isLoading = uploadMutation.isPending || analyzeMutation.isPending;

  // Revoke the object URL on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file (JPG, PNG, GIF, WebP, etc.)");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Image must be under 20MB");
        return;
      }

      // Revoke previous object URL before creating a new one
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
      const objectUrl = URL.createObjectURL(file);
      previewObjectUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
      setPreviewName(file.name);

      // Upload the image
      toast.info("Uploading image...");
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = (e.target?.result as string).split(",")[1];
          // upload.file requires a context of "evidence" or "document".
          // Evidence analysis maps directly; all other modes (general, ocr, document)
          // use "document" since they process documentary/informational images.
          const uploadContext: "document" | "evidence" =
            selectedMode === "evidence" ? "evidence" : "document";
          const uploadResult = await uploadMutation.mutateAsync({
            fileName: file.name,
            mimeType: file.type,
            base64Data: base64,
            context: uploadContext,
          });

          const imageUrl = uploadResult.url;
          const mode = ANALYSIS_MODES.find((m) => m.id === selectedMode)!;
          const prompt = useCustomPrompt && customPrompt.trim()
            ? customPrompt.trim()
            : mode.prompt;

          // Analyze with VLM
          toast.info("Analyzing with Vision AI...");
          const result = await analyzeMutation.mutateAsync({
            imageUrl,
            prompt,
            analysisType: selectedMode,
          });

          const newResult: AnalysisResult = {
            imageUrl,
            imageName: file.name,
            analysisType: selectedMode,
            analysis: result.analysis,
            structuredData: result.structuredData,
            timestamp: new Date(),
          };

          setResults((prev) => [newResult, ...prev]);
          setSelectedResult(newResult);
          toast.success("Vision analysis complete!");
        } catch (error) {
          toast.error(`Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
          setPreviewUrl(null);
          setPreviewName("");
          if (previewObjectUrlRef.current) {
            URL.revokeObjectURL(previewObjectUrlRef.current);
            previewObjectUrlRef.current = null;
          }
        }
      };
      reader.readAsDataURL(file);
    },
    [selectedMode, customPrompt, useCustomPrompt, uploadMutation, analyzeMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const clearAll = () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewName("");
    setSelectedResult(null);
  };

  const activeMode = ANALYSIS_MODES.find((m) => m.id === selectedMode)!;

  return (
    <DashboardLayout>
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-900/40">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Vision Studio</h1>
            <p className="text-sm text-gray-400">AI-powered image analysis, OCR, and visual evidence intelligence</p>
          </div>
          <span className="ml-auto px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
            VLM Powered
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Panel — Upload + Mode Selection */}
        <div className="xl:col-span-1 space-y-5">
          {/* Analysis Mode Selector */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Analysis Mode
            </h2>
            <div className="space-y-2">
              {ANALYSIS_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = selectedMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isSelected
                        ? "bg-violet-600/20 border border-violet-500/40"
                        : "bg-gray-800/50 border border-transparent hover:border-gray-700"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-violet-900/50" : ""}`}>
                      <Icon className={`w-4 h-4 ${isSelected ? "text-violet-400" : mode.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${isSelected ? "text-white" : "text-gray-300"}`}>{mode.label}</p>
                      <p className="text-xs text-gray-500 truncate">{mode.description}</p>
                    </div>
                    {isSelected && <ChevronRight className="w-4 h-4 text-violet-400 ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Prompt */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                Custom Prompt
              </h2>
              <button
                onClick={() => setUseCustomPrompt(!useCustomPrompt)}
                className={`relative w-10 h-5 rounded-full transition-colors ${useCustomPrompt ? "bg-violet-600" : "bg-gray-700"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${useCustomPrompt ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            {useCustomPrompt ? (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ask the AI a specific question about the image..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-violet-500 h-24"
              />
            ) : (
              <p className="text-xs text-gray-500 italic">Using default prompt for <span className="text-violet-400">{activeMode.label}</span> mode. Toggle to customize.</p>
            )}
          </div>

          {/* History */}
          {results.length > 0 && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Analysis History
                <span className="ml-auto text-xs text-gray-500">{results.length}</span>
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.map((r, i) => {
                  const mode = ANALYSIS_MODES.find((m) => m.id === r.analysisType)!;
                  const Icon = mode.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedResult(r)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                        selectedResult === r
                          ? "bg-violet-600/20 border border-violet-500/30"
                          : "bg-gray-800/50 hover:bg-gray-800 border border-transparent"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
                        <img src={r.imageUrl} alt={r.imageName} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-300 truncate">{r.imageName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Icon className={`w-3 h-3 ${mode.color}`} />
                          <span className="text-xs text-gray-500">{mode.label}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel — Upload + Results */}
        <div className="xl:col-span-2 space-y-5">
          {/* Upload Zone */}
          <div
            role="button"
            tabIndex={isLoading ? -1 : 0}
            aria-label="Upload image — click or drag and drop"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isLoading && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (!isLoading && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
              isDragging
                ? "border-violet-500 bg-violet-500/10"
                : isLoading
                ? "border-gray-700 bg-gray-900 cursor-not-allowed"
                : "border-gray-700 bg-gray-900 hover:border-violet-500/60 hover:bg-violet-500/5"
            }`}
            style={{ minHeight: previewUrl ? "220px" : "180px" }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
              disabled={isLoading}
            />

            {previewUrl ? (
              <div className="flex items-center gap-6 p-6">
                <div className="relative flex-shrink-0">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-40 h-40 object-cover rounded-xl border border-gray-700 shadow-xl"
                  />
                  {isLoading && (
                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">{previewName}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Mode: <span className="text-violet-400">{activeMode.label}</span>
                  </p>
                  {isLoading ? (
                    <div className="mt-3 flex items-center gap-2 text-violet-300">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">
                        {uploadMutation.isPending ? "Uploading image..." : "Analyzing with Vision AI..."}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400">Analysis complete</span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); clearAll(); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-sm text-violet-300 border border-violet-500/30 transition-colors disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      New Image
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
                  <Upload className="w-7 h-7 text-violet-400" />
                </div>
                <p className="text-white font-semibold mb-1">Drop an image here</p>
                <p className="text-sm text-gray-400">or click to browse — JPG, PNG, GIF, WebP up to 20MB</p>
                <div className="flex items-center gap-2 mt-4">
                  {ANALYSIS_MODES.map((m) => {
                    const Icon = m.icon;
                    return (
                      <div key={m.id} className={`flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-800 text-xs ${m.color}`}>
                        <Icon className="w-3 h-3" />
                        {m.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Analysis Result */}
          {selectedResult && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              {/* Result Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  {(() => {
                    const mode = ANALYSIS_MODES.find((m) => m.id === selectedResult.analysisType)!;
                    const Icon = mode.icon;
                    return (
                      <>
                        <div className={`w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center`}>
                          <Icon className={`w-4 h-4 ${mode.color}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{mode.label} Result</p>
                          <p className="text-xs text-gray-500">{selectedResult.imageName} · {selectedResult.timestamp.toLocaleTimeString()}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(selectedResult.analysis)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([selectedResult.analysis], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `vision-analysis-${Date.now()}.txt`;
                      a.click();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </button>
                </div>
              </div>

              {/* Structured Data (if available) */}
              {selectedResult.structuredData && (
                <div className="px-5 py-4 bg-violet-950/30 border-b border-violet-900/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-semibold text-violet-300">Extracted Intelligence</span>
                    {selectedResult.structuredData.confidence !== undefined && (
                      <span className="ml-auto text-xs text-gray-400">
                        Confidence: <span className="text-green-400">{Math.round(selectedResult.structuredData.confidence * 100)}%</span>
                      </span>
                    )}
                  </div>
                  {selectedResult.structuredData.summary && (
                    <p className="text-sm text-gray-300 mb-3 bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                      {selectedResult.structuredData.summary}
                    </p>
                  )}
                  {selectedResult.structuredData.entities && selectedResult.structuredData.entities.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedResult.structuredData.entities.map((entity, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full bg-violet-900/40 border border-violet-700/40 text-xs text-violet-300">
                          {entity}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Full Analysis Text */}
              <div className="p-5">
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">
                    {selectedResult.analysis}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!selectedResult && !isLoading && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-900/40 to-purple-900/40 border border-violet-700/30 flex items-center justify-center mb-5">
                <Eye className="w-9 h-9 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">SintraPrime Can Now See</h3>
              <p className="text-sm text-gray-400 max-w-sm">
                Upload any image — a court filing, evidence photo, contract scan, or screenshot — and the Vision AI will analyze it instantly.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-6 w-full max-w-sm">
                {[
                  { icon: ScanText, label: "Extract text from scanned docs", color: "text-green-400" },
                  { icon: Microscope, label: "Analyze photos as evidence", color: "text-orange-400" },
                  { icon: BookOpen, label: "Parse contracts & filings", color: "text-purple-400" },
                  { icon: ImageIcon, label: "Describe any image in detail", color: "text-blue-400" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-gray-800/50 border border-gray-700/50">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${item.color}`} />
                      <span className="text-xs text-gray-400">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
