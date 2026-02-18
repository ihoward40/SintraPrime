import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, TrendingUp, Check } from "lucide-react";

export function RecommendationWidget() {
  const [projectDescription, setProjectDescription] = useState("");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [adoptedTools, setAdoptedTools] = useState<Set<number>>(new Set());

  const generateRecommendations = trpc.aiOS.recommendations.generate.useMutation({
    onSuccess: (data) => {
      setRecommendations(data);
      toast.success(`Generated ${data.length} recommendations`);
    },
    onError: (error) => {
      toast.error(`Failed to generate recommendations: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    if (!projectDescription.trim()) {
      toast.error("Please describe your project first");
      return;
    }
    generateRecommendations.mutate({
      projectDescription,
      limit: 10,
    });
  };

  const handleAdopt = (toolId: number) => {
    setAdoptedTools((prev) => new Set(prev).add(toolId));
    toast.success("Tool added to your stack");
    // TODO: Track adoption in analytics
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Tool Recommendations
        </CardTitle>
        <CardDescription>
          Describe your project and get personalized AI tool suggestions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Project Description</label>
          <Textarea
            placeholder="E.g., I need to create marketing videos for a legal tech startup, analyze competitor websites, and automate social media posting..."
            value={projectDescription}
            onChange={(e) => setProjectDescription(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <Button
            onClick={handleGenerate}
            disabled={generateRecommendations.isPending || !projectDescription.trim()}
            className="w-full"
          >
            {generateRecommendations.isPending ? (
              "Generating Recommendations..."
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Get AI Recommendations
              </>
            )}
          </Button>
        </div>

        {/* Recommendations List */}
        {recommendations.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Recommended Tools</h3>
              <Badge variant="secondary">{recommendations.length} tools</Badge>
            </div>

            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.toolId}
                  className="border rounded-lg p-4 space-y-3 hover:border-primary/50 transition-colors"
                >
                  {/* Tool Name & Score */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold">{rec.toolName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-sm text-muted-foreground">
                          {rec.score}% match
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={rec.score >= 80 ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {rec.score >= 80 ? "Highly Recommended" : "Good Fit"}
                    </Badge>
                  </div>

                  {/* Reason */}
                  <p className="text-sm text-muted-foreground">{rec.reason}</p>

                  {/* Action Button */}
                  <Button
                    size="sm"
                    variant={adoptedTools.has(rec.toolId) ? "secondary" : "default"}
                    onClick={() => handleAdopt(rec.toolId)}
                    disabled={adoptedTools.has(rec.toolId)}
                    className="w-full"
                  >
                    {adoptedTools.has(rec.toolId) ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Added to Stack
                      </>
                    ) : (
                      "Adopt This Tool"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {recommendations.length === 0 && !generateRecommendations.isPending && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Describe your project to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
