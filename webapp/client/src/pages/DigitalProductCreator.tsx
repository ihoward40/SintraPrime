import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  FileText,
  Sparkles,
  Download,
  Plus,
  Trash2,
  Loader2,
  Image,
  Palette,
  BarChart3,
  Video,
} from "lucide-react";
import { toast } from "sonner";

export default function DigitalProductCreator() {
  const [activeTab, setActiveTab] = useState("demand-letter");

  // Video Generation State
  const [selectedVideoTemplate, setSelectedVideoTemplate] = useState<string>("");
  const [videoScript, setVideoScript] = useState("");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");

  // Demand Letter State
  const [creditorName, setCreditorName] = useState("");
  const [debtorName, setDebtorName] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [violations, setViolations] = useState<string[]>([""]);
  const [demands, setDemands] = useState<string[]>([""]);

  // Contract State
  const [contractType, setContractType] = useState<"service_agreement" | "nda" | "employment" | "settlement">("nda");
  const [parties, setParties] = useState<string[]>(["", ""]);
  const [terms, setTerms] = useState<string[]>([""]);
  const [jurisdiction, setJurisdiction] = useState("");

  // Infographic State
  const [infographicTopic, setInfographicTopic] = useState("");
  const [dataPoints, setDataPoints] = useState<Array<{ label: string; value: string }>>([
    { label: "", value: "" },
  ]);
  const [infographicStyle, setInfographicStyle] = useState<"professional" | "modern" | "creative">("professional");

  // Generated Content
  const [generatedContent, setGeneratedContent] = useState<any>(null);

  const demandLetterMutation = trpc.digitalProducts.generateDemandLetter.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data);
      toast.success("Demand letter generated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to generate demand letter: ${error.message}`);
    },
  });

  const contractMutation = trpc.digitalProducts.generateContract.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data);
      toast.success("Contract generated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to generate contract: ${error.message}`);
    },
  });

  const infographicMutation = trpc.digitalProducts.generateInfographic.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data);
      toast.success("Infographic structure generated!");
    },
    onError: (error) => {
      toast.error(`Failed to generate infographic: ${error.message}`);
    },
  });

  const handleGenerateDemandLetter = () => {
    if (!creditorName || !debtorName || !debtAmount) {
      toast.error("Please fill in all required fields");
      return;
    }

    const validViolations = violations.filter((v) => v.trim().length > 0);
    const validDemands = demands.filter((d) => d.trim().length > 0);

    if (validViolations.length === 0 || validDemands.length === 0) {
      toast.error("Please add at least one violation and one demand");
      return;
    }

    demandLetterMutation.mutate({
      creditorName,
      debtorName,
      debtAmount: parseFloat(debtAmount),
      violations: validViolations,
      demands: validDemands,
    });
  };

  const handleGenerateContract = () => {
    const validParties = parties.filter((p) => p.trim().length > 0);
    const validTerms = terms.filter((t) => t.trim().length > 0);

    if (validParties.length < 2) {
      toast.error("Please enter at least two parties");
      return;
    }

    if (validTerms.length === 0) {
      toast.error("Please add at least one term");
      return;
    }

    if (!jurisdiction) {
      toast.error("Please specify jurisdiction");
      return;
    }

    contractMutation.mutate({
      contractType,
      parties: validParties,
      terms: validTerms,
      jurisdiction,
    });
  };

  const handleGenerateInfographic = () => {
    if (!infographicTopic) {
      toast.error("Please enter a topic");
      return;
    }

    const validDataPoints = dataPoints.filter((dp) => dp.label.trim() && dp.value.trim());

    if (validDataPoints.length === 0) {
      toast.error("Please add at least one data point");
      return;
    }

    infographicMutation.mutate({
      topic: infographicTopic,
      dataPoints: validDataPoints,
      style: infographicStyle,
    });
  };

  const downloadDocument = () => {
    if (!generatedContent) return;

    const content = generatedContent.html || generatedContent.product.content;
    const filename = `${generatedContent.product.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.${
      generatedContent.html ? "html" : generatedContent.product.format
    }`;

    const blob = new Blob([content], {
      type: generatedContent.html ? "text/html" : "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Document downloaded");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            Digital Product Creator
          </h1>
          <p className="text-muted-foreground">
            Generate professional documents, infographics, and brand assets with AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Forms */}
          <Card>
            <CardHeader>
              <CardTitle>Product Generator</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="demand-letter">
                    <FileText className="h-4 w-4 mr-2" />
                    Demand Letter
                  </TabsTrigger>
                  <TabsTrigger value="contract">
                    <FileText className="h-4 w-4 mr-2" />
                    Contract
                  </TabsTrigger>
                  <TabsTrigger value="infographic">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Infographic
                  </TabsTrigger>
                  <TabsTrigger value="video">
                    <Video className="h-4 w-4 mr-2" />
                    Video
                  </TabsTrigger>
                </TabsList>

                {/* Demand Letter Tab */}
                <TabsContent value="demand-letter" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="creditor">Creditor Name *</Label>
                    <Input
                      id="creditor"
                      value={creditorName}
                      onChange={(e) => setCreditorName(e.target.value)}
                      placeholder="e.g., ABC Collections Inc."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="debtor">Your Name *</Label>
                    <Input
                      id="debtor"
                      value={debtorName}
                      onChange={(e) => setDebtorName(e.target.value)}
                      placeholder="e.g., John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Debt Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={debtAmount}
                      onChange={(e) => setDebtAmount(e.target.value)}
                      placeholder="1500.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>FDCPA Violations *</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViolations([...violations, ""])}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    {violations.map((v, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={v}
                          onChange={(e) => {
                            const updated = [...violations];
                            updated[idx] = e.target.value;
                            setViolations(updated);
                          }}
                          placeholder="e.g., Failed to provide validation"
                        />
                        {violations.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setViolations(violations.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Demands *</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDemands([...demands, ""])}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    {demands.map((d, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={d}
                          onChange={(e) => {
                            const updated = [...demands];
                            updated[idx] = e.target.value;
                            setDemands(updated);
                          }}
                          placeholder="e.g., Cease all collection activity"
                        />
                        {demands.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDemands(demands.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleGenerateDemandLetter}
                    disabled={demandLetterMutation.isPending}
                    className="w-full"
                  >
                    {demandLetterMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Demand Letter
                      </>
                    )}
                  </Button>
                </TabsContent>

                {/* Contract Tab */}
                <TabsContent value="contract" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Contract Type</Label>
                    <Select value={contractType} onValueChange={(v: any) => setContractType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="service_agreement">Service Agreement</SelectItem>
                        <SelectItem value="nda">Non-Disclosure Agreement</SelectItem>
                        <SelectItem value="employment">Employment Contract</SelectItem>
                        <SelectItem value="settlement">Settlement Agreement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Parties *</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setParties([...parties, ""])}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    {parties.map((p, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input
                          value={p}
                          onChange={(e) => {
                            const updated = [...parties];
                            updated[idx] = e.target.value;
                            setParties(updated);
                          }}
                          placeholder={`Party ${idx + 1} name`}
                        />
                        {parties.length > 2 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setParties(parties.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Key Terms *</Label>
                      <Button size="sm" variant="outline" onClick={() => setTerms([...terms, ""])}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    {terms.map((t, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Textarea
                          value={t}
                          onChange={(e) => {
                            const updated = [...terms];
                            updated[idx] = e.target.value;
                            setTerms(updated);
                          }}
                          placeholder="Describe a key term or condition"
                          rows={2}
                        />
                        {terms.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setTerms(terms.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jurisdiction">Jurisdiction *</Label>
                    <Input
                      id="jurisdiction"
                      value={jurisdiction}
                      onChange={(e) => setJurisdiction(e.target.value)}
                      placeholder="e.g., State of California"
                    />
                  </div>

                  <Button
                    onClick={handleGenerateContract}
                    disabled={contractMutation.isPending}
                    className="w-full"
                  >
                    {contractMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Contract
                      </>
                    )}
                  </Button>
                </TabsContent>

                {/* Infographic Tab */}
                <TabsContent value="infographic" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="topic">Topic *</Label>
                    <Input
                      id="topic"
                      value={infographicTopic}
                      onChange={(e) => setInfographicTopic(e.target.value)}
                      placeholder="e.g., FDCPA Violation Statistics"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Style</Label>
                    <Select
                      value={infographicStyle}
                      onValueChange={(v: any) => setInfographicStyle(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="modern">Modern</SelectItem>
                        <SelectItem value="creative">Creative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Data Points *</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDataPoints([...dataPoints, { label: "", value: "" }])
                        }
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    {dataPoints.map((dp, idx) => (
                      <div key={idx} className="space-y-2 p-3 border rounded">
                        <div className="flex gap-2">
                          <Input
                            value={dp.label}
                            onChange={(e) => {
                              const updated = [...dataPoints];
                              updated[idx].label = e.target.value;
                              setDataPoints(updated);
                            }}
                            placeholder="Label (e.g., Total Cases)"
                          />
                          <Input
                            value={dp.value}
                            onChange={(e) => {
                              const updated = [...dataPoints];
                              updated[idx].value = e.target.value;
                              setDataPoints(updated);
                            }}
                            placeholder="Value (e.g., 1,234)"
                          />
                          {dataPoints.length > 1 && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setDataPoints(dataPoints.filter((_, i) => i !== idx))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleGenerateInfographic}
                    disabled={infographicMutation.isPending}
                    className="w-full"
                  >
                    {infographicMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Infographic
                      </>
                    )}
                  </Button>
                </TabsContent>

                {/* Video Generation Tab */}
                <TabsContent value="video" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Video Template</Label>
                    <Select value={selectedVideoTemplate} onValueChange={setSelectedVideoTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fdcpaViolation">FDCPA Violation Explainer</SelectItem>
                        <SelectItem value="creditReportDispute">Credit Report Dispute Process</SelectItem>
                        <SelectItem value="consumerProtection">Consumer Protection Overview</SelectItem>
                        <SelectItem value="caseSuccess">Case Success Story</SelectItem>
                        <SelectItem value="serviceOverview">Law Firm Services Overview</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Choose a pre-built template or write a custom script below
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="videoScript">Video Script</Label>
                    <Textarea
                      id="videoScript"
                      value={videoScript}
                      onChange={(e) => setVideoScript(e.target.value)}
                      placeholder="Write your video script here...\n\nFormat:\n[Scene 1]\nYour text here\n\n[Scene 2]\nMore text..."
                      rows={10}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
                    <Select value={videoAspectRatio} onValueChange={(v) => setVideoAspectRatio(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9 (Landscape - YouTube)</SelectItem>
                        <SelectItem value="9:16">9:16 (Portrait - TikTok/Instagram)</SelectItem>
                        <SelectItem value="1:1">1:1 (Square - Social Media)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg border p-4 bg-muted/50">
                    <h4 className="text-sm font-medium mb-2">Video Features</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• AI-powered video generation</li>
                      <li>• Professional voice-over</li>
                      <li>• Background music</li>
                      <li>• Automated scene transitions</li>
                      <li>• Estimated generation time: 2-5 minutes</li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => {
                      toast.info("Video generation feature coming soon! This will use InVideo MCP to create professional marketing videos.");
                    }}
                    disabled={!selectedVideoTemplate && !videoScript}
                    className="w-full"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Generate Video
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview</CardTitle>
                {generatedContent && (
                  <Button size="sm" variant="outline" onClick={downloadDocument}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!generatedContent && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <FileText className="h-16 w-16 mb-4 opacity-20" />
                  <p>Your generated document will appear here</p>
                </div>
              )}

              {generatedContent && (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge>{generatedContent.product.type.replace("_", " ")}</Badge>
                      <Badge variant="outline">{generatedContent.product.format}</Badge>
                    </div>

                    <div className="prose prose-sm max-w-none">
                      <div
                        dangerouslySetInnerHTML={{
                          __html:
                            generatedContent.html ||
                            `<pre>${generatedContent.product.content}</pre>`,
                        }}
                      />
                    </div>
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
