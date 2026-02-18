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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Presentation,
  Sparkles,
  Download,
  Eye,
  Plus,
  Trash2,
  Loader2,
  FileText,
  Briefcase,
  Users,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function SlideGenerator() {
  const [topic, setTopic] = useState("");
  const [purpose, setPurpose] = useState<"case_summary" | "legal_brief" | "client_presentation" | "training" | "general">("general");
  const [audience, setAudience] = useState<"legal_professionals" | "clients" | "judges" | "general_public">("general_public");
  const [slideCount, setSlideCount] = useState(10);
  const [tone, setTone] = useState<"formal" | "conversational" | "persuasive" | "educational">("formal");
  const [keyPoints, setKeyPoints] = useState<string[]>([""]);
  const [generatedOutline, setGeneratedOutline] = useState<any>(null);

  const generateMutation = trpc.slides.generateOutline.useMutation({
    onSuccess: (data) => {
      setGeneratedOutline(data.outline);
      toast.success(`Generated ${data.outline.totalSlides} slides successfully!`);
    },
    onError: (error) => {
      toast.error(`Failed to generate slides: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    const validKeyPoints = keyPoints.filter((p) => p.trim().length > 0);

    generateMutation.mutate({
      topic,
      purpose,
      targetAudience: audience,
      slideCount,
      tone,
      keyPoints: validKeyPoints.length > 0 ? validKeyPoints : undefined,
    });
  };

  const addKeyPoint = () => {
    setKeyPoints([...keyPoints, ""]);
  };

  const removeKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index));
  };

  const updateKeyPoint = (index: number, value: string) => {
    const updated = [...keyPoints];
    updated[index] = value;
    setKeyPoints(updated);
  };

  const exportPowerPointMutation = trpc.slides.exportToPowerPoint.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.success("PowerPoint exported successfully!");
      }
    },
    onError: (error) => {
      toast.error(`Failed to export PowerPoint: ${error.message}`);
    },
  });

  const downloadMarkdown = () => {
    if (!generatedOutline) return;

    const markdown = generateMarkdown(generatedOutline);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedOutline.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Slides downloaded as Markdown");
  };

  const exportToPowerPoint = () => {
    if (!generatedOutline) return;

    // Convert outline to slides format expected by the API
    const slides = generatedOutline.slides.map((slide: any) => ({
      title: slide.title,
      content: slide.content.join("\n"),
      notes: slide.notes || "",
    }));

    exportPowerPointMutation.mutate({
      title: generatedOutline.title,
      author: "SintraPrime",
      slides,
      theme: "professional",
    });
  };

  const generateMarkdown = (outline: any): string => {
    let md = `# ${outline.title}\n\n`;
    if (outline.subtitle) md += `## ${outline.subtitle}\n\n`;
    md += `---\n\n`;

    outline.slides.forEach((slide: any, idx: number) => {
      md += `## ${slide.title}\n\n`;
      if (slide.subtitle) md += `### ${slide.subtitle}\n\n`;
      slide.content.forEach((point: string) => {
        md += `- ${point}\n`;
      });
      if (slide.notes) {
        md += `\n<aside class="notes">\n${slide.notes}\n</aside>\n`;
      }
      if (idx < outline.slides.length - 1) md += `\n---\n\n`;
    });

    return md;
  };

  const getPurposeIcon = (p: string) => {
    switch (p) {
      case "case_summary":
        return <Briefcase className="h-4 w-4" />;
      case "legal_brief":
        return <FileText className="h-4 w-4" />;
      case "client_presentation":
        return <Users className="h-4 w-4" />;
      case "training":
        return <GraduationCap className="h-4 w-4" />;
      default:
        return <Presentation className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Presentation className="h-8 w-8" />
            Slide Generator
          </h1>
          <p className="text-muted-foreground">
            Create professional presentations with AI-powered content
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Presentation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Topic */}
              <div className="space-y-2">
                <Label htmlFor="topic">Topic *</Label>
                <Input
                  id="topic"
                  placeholder="e.g., FDCPA Violations in Debt Collection"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={generateMutation.isPending}
                />
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Select
                  value={purpose}
                  onValueChange={(v: any) => setPurpose(v)}
                  disabled={generateMutation.isPending}
                >
                  <SelectTrigger id="purpose">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="case_summary">Case Summary</SelectItem>
                    <SelectItem value="legal_brief">Legal Brief</SelectItem>
                    <SelectItem value="client_presentation">Client Presentation</SelectItem>
                    <SelectItem value="training">Training/Education</SelectItem>
                    <SelectItem value="general">General Presentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <Label htmlFor="audience">Target Audience</Label>
                <Select
                  value={audience}
                  onValueChange={(v: any) => setAudience(v)}
                  disabled={generateMutation.isPending}
                >
                  <SelectTrigger id="audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legal_professionals">Legal Professionals</SelectItem>
                    <SelectItem value="clients">Clients</SelectItem>
                    <SelectItem value="judges">Judges/Court</SelectItem>
                    <SelectItem value="general_public">General Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Slide Count */}
              <div className="space-y-2">
                <Label htmlFor="slideCount">Number of Slides</Label>
                <Input
                  id="slideCount"
                  type="number"
                  min={3}
                  max={50}
                  value={slideCount}
                  onChange={(e) => setSlideCount(parseInt(e.target.value) || 10)}
                  disabled={generateMutation.isPending}
                />
              </div>

              {/* Tone */}
              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select
                  value={tone}
                  onValueChange={(v: any) => setTone(v)}
                  disabled={generateMutation.isPending}
                >
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="conversational">Conversational</SelectItem>
                    <SelectItem value="persuasive">Persuasive</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Key Points */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Key Points (Optional)</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addKeyPoint}
                    disabled={generateMutation.isPending}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Point
                  </Button>
                </div>
                <div className="space-y-2">
                  {keyPoints.map((point, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder={`Key point ${idx + 1}`}
                        value={point}
                        onChange={(e) => updateKeyPoint(idx, e.target.value)}
                        disabled={generateMutation.isPending}
                      />
                      {keyPoints.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeKeyPoint(idx)}
                          disabled={generateMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !topic.trim()}
                className="w-full"
                size="lg"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Slides...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Presentation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Preview
                </CardTitle>
                {generatedOutline && (
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={exportToPowerPoint}
                      disabled={exportPowerPointMutation.isPending}
                    >
                      {exportPowerPointMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Export to PowerPoint
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadMarkdown}>
                      <FileText className="h-4 w-4 mr-2" />
                      Download Markdown
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!generatedOutline && !generateMutation.isPending && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Presentation className="h-16 w-16 mb-4 opacity-20" />
                  <p>Your generated slides will appear here</p>
                </div>
              )}

              {generateMutation.isPending && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Creating your presentation...</p>
                </div>
              )}

              {generatedOutline && (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-6">
                    {/* Title Slide */}
                    <div className="p-6 border rounded-lg bg-primary/5">
                      <h2 className="text-2xl font-bold mb-2">{generatedOutline.title}</h2>
                      {generatedOutline.subtitle && (
                        <p className="text-lg text-muted-foreground">{generatedOutline.subtitle}</p>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Badge variant="secondary">{generatedOutline.theme}</Badge>
                        <Badge variant="outline">{generatedOutline.totalSlides} slides</Badge>
                      </div>
                    </div>

                    {/* Slides */}
                    {generatedOutline.slides.map((slide: any, idx: number) => (
                      <div key={idx} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                Slide {idx + 1}
                              </Badge>
                              {slide.layout && (
                                <Badge variant="secondary" className="text-xs">
                                  {slide.layout}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-lg">{slide.title}</h3>
                            {slide.subtitle && (
                              <p className="text-sm text-muted-foreground">{slide.subtitle}</p>
                            )}
                          </div>
                        </div>

                        <ul className="space-y-2 mb-3">
                          {slide.content.map((point: string, pidx: number) => (
                            <li key={pidx} className="text-sm flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>

                        {slide.notes && (
                          <div className="mt-3 p-3 bg-muted/50 rounded text-xs">
                            <p className="font-medium mb-1">Speaker Notes:</p>
                            <p className="text-muted-foreground">{slide.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
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
