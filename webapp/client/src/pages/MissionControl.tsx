/**
 * Mission Control - AI Operating System Dashboard
 * 
 * Unified interface for:
 * - Intelligence Database
 * - Stack Builder
 * - AI Roles (Head of Innovation, Ghostwriter, Prompt Engineer)
 * - Master Prompt Library
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { RecommendationWidget } from "@/components/RecommendationWidget";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, Layers, Bot, FileCode, Plus, Search,
  Sparkles, Pencil, Code2, Play, Star
} from "lucide-react";
import { ReviewDialog } from "@/components/ReviewDialog";
import { toast } from "sonner";

export default function MissionControl() {
  const [activeTab, setActiveTab] = useState("intelligence");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mission Control</h1>
          <p className="text-muted-foreground">SintraPrime AI Operating System</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="intelligence">
            <Database className="mr-2 h-4 w-4" />
            Intelligence DB
          </TabsTrigger>
          <TabsTrigger value="stacks">
            <Layers className="mr-2 h-4 w-4" />
            Stack Builder
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Bot className="mr-2 h-4 w-4" />
            AI Roles
          </TabsTrigger>
          <TabsTrigger value="prompts">
            <FileCode className="mr-2 h-4 w-4" />
            Prompt Library
          </TabsTrigger>
        </TabsList>

        {/* Intelligence Database */}
        <TabsContent value="intelligence">
          <IntelligenceDatabaseTab />
        </TabsContent>

        {/* Stack Builder */}
        <TabsContent value="stacks">
          <StackBuilderTab />
        </TabsContent>

        {/* AI Roles */}
        <TabsContent value="roles">
          <AIRolesTab />
        </TabsContent>

        {/* Prompt Library */}
        <TabsContent value="prompts">
          <PromptLibraryTab />
        </TabsContent>
      </Tabs>

      {/* AI Recommendations Widget */}
      <RecommendationWidget />
    </div>
  );
}

function IntelligenceDatabaseTab() {
  const { data: tools, refetch } = trpc.aiOS.tools.list.useQuery();
  const [searchFilters, setSearchFilters] = useState({
    category: "",
    skillLevel: "",
    budgetTier: "",
  });
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<{ id: number; name: string } | null>(null);
  const [expandedToolId, setExpandedToolId] = useState<number | null>(null);

  const { data: reviews } = trpc.aiOS.tools.getReviews.useQuery(
    { toolId: expandedToolId! },
    { enabled: !!expandedToolId }
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">AI Tools Intelligence Database</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <Label>Category</Label>
            <Input
              placeholder="script, image, video..."
              value={searchFilters.category}
              onChange={(e) =>
                setSearchFilters({ ...searchFilters, category: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Skill Level</Label>
            <Input
              placeholder="beginner, intermediate, advanced"
              value={searchFilters.skillLevel}
              onChange={(e) =>
                setSearchFilters({ ...searchFilters, skillLevel: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Budget Tier</Label>
            <Input
              placeholder="free, low, premium"
              value={searchFilters.budgetTier}
              onChange={(e) =>
                setSearchFilters({ ...searchFilters, budgetTier: e.target.value })
              }
            />
          </div>
        </div>

        <div className="space-y-3">
          {tools?.map((tool: any) => (
            <div key={tool.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{tool.name}</h3>
                  {tool.avgRating > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{tool.avgRating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({tool.reviewCount})</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {tool.category}
                  </span>
                  <span className="text-xs bg-secondary px-2 py-1 rounded">
                    Reliability: {tool.reliabilityScore}/10
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{tool.notes}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>Skill: {tool.skillLevel}</span>
                  <span>•</span>
                  <span>Budget: {tool.budgetTier}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setExpandedToolId(expandedToolId === tool.id ? null : tool.id);
                    }}
                  >
                    {expandedToolId === tool.id ? "Hide" : "View"} Reviews
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedTool({ id: tool.id, name: tool.name });
                      setReviewDialogOpen(true);
                    }}
                  >
                    Write Review
                  </Button>
                </div>
              </div>

              {/* Reviews Section */}
              {expandedToolId === tool.id && reviews && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <h4 className="font-medium text-sm">User Reviews</h4>
                  {reviews.length > 0 ? (
                    reviews.map((review: any) => (
                      <div key={review.id} className="p-3 bg-muted/30 rounded space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    star <= review.rating
                                      ? "fill-yellow-400 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm">{review.reviewText}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Review Dialog */}
      {selectedTool && (
        <ReviewDialog
          toolId={selectedTool.id}
          toolName={selectedTool.name}
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          onSuccess={() => {
            refetch();
            if (expandedToolId) {
              // Refetch reviews for expanded tool
            }
          }}
        />
      )}
    </div>
  );
}

function StackBuilderTab() {
  const { data: stacks } = trpc.aiOS.stacks.list.useQuery();
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [projectDetails, setProjectDetails] = useState({
    projectName: "",
    outputType: "",
    budget: "medium" as "low" | "medium" | "high",
    skillLevel: "intermediate" as "beginner" | "intermediate" | "advanced",
  });

  const recommendStack = trpc.aiOS.stacks.recommend.useMutation({
    onSuccess: (data) => {
      toast.success("Stack recommendation generated");
      console.log("Recommendation:", data);
    },
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Stack Builder</h2>
        <Button
          onClick={() => setShowRecommendation(!showRecommendation)}
          className="mb-4"
        >
          <Plus className="mr-2 h-4 w-4" />
          Get AI Recommendation
        </Button>

        {showRecommendation && (
          <div className="space-y-4 mb-6 p-4 border rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Project Name</Label>
                <Input
                  value={projectDetails.projectName}
                  onChange={(e) =>
                    setProjectDetails({ ...projectDetails, projectName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Output Type</Label>
                <Input
                  placeholder="film, reel, ad, legal brief..."
                  value={projectDetails.outputType}
                  onChange={(e) =>
                    setProjectDetails({ ...projectDetails, outputType: e.target.value })
                  }
                />
              </div>
            </div>
            <Button
              onClick={() => recommendStack.mutate(projectDetails)}
              disabled={recommendStack.isPending}
            >
              Generate Recommendation
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {stacks?.map((stack: any) => (
            <div key={stack.id} className="p-4 border rounded-lg">
              <h3 className="font-semibold">{stack.projectName}</h3>
              <p className="text-sm text-muted-foreground">
                {stack.outputType} • {stack.budget} budget • {stack.skillLevel}
              </p>
              <span className="text-xs bg-secondary px-2 py-1 rounded mt-2 inline-block">
                {stack.status}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AIRolesTab() {
  const [activeRole, setActiveRole] = useState<"innovation" | "ghostwriter" | "engineer">(
    "innovation"
  );
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const headOfInnovation = trpc.aiOS.roles.headOfInnovation.useMutation({
    onSuccess: (data) => {
      setOutput(data.recommendation);
      toast.success("Recommendation generated");
    },
  });

  const ghostwriter = trpc.aiOS.roles.ghostwriter.useMutation({
    onSuccess: (data) => {
      setOutput(data.content);
      toast.success("Content generated");
    },
  });

  const promptEngineer = trpc.aiOS.roles.promptEngineer.useMutation({
    onSuccess: (data) => {
      setOutput(
        `**Optimized Prompt:**\n${data.optimizedPrompt}\n\n**Parameter Breakdown:**\n${data.parameterBreakdown}\n\n**Technical Reasoning:**\n${data.technicalReasoning}`
      );
      toast.success("Prompt optimized");
    },
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">AI Roles</h2>

        <Tabs value={activeRole} onValueChange={(v: any) => setActiveRole(v)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="innovation">
              <Sparkles className="mr-2 h-4 w-4" />
              Head of Innovation
            </TabsTrigger>
            <TabsTrigger value="ghostwriter">
              <Pencil className="mr-2 h-4 w-4" />
              Ghostwriter
            </TabsTrigger>
            <TabsTrigger value="engineer">
              <Code2 className="mr-2 h-4 w-4" />
              Prompt Engineer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="innovation" className="space-y-4">
            <Textarea
              placeholder="Project type: Film production&#10;Budget: Medium&#10;Skill level: Intermediate&#10;Timeline: 2 weeks"
              rows={6}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button
              onClick={() =>
                headOfInnovation.mutate({
                  projectType: input,
                  budget: "medium",
                  skillLevel: "intermediate",
                })
              }
              disabled={headOfInnovation.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              Get Recommendation
            </Button>
          </TabsContent>

          <TabsContent value="ghostwriter" className="space-y-4">
            <Textarea
              placeholder="Topic: AI in legal tech&#10;Content type: YouTube script&#10;Target audience: Legal professionals"
              rows={6}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button
              onClick={() =>
                ghostwriter.mutate({
                  topic: input,
                  contentType: "youtube_script",
                })
              }
              disabled={ghostwriter.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              Generate Content
            </Button>
          </TabsContent>

          <TabsContent value="engineer" className="space-y-4">
            <Textarea
              placeholder="Tool: Midjourney&#10;Goal: Generate photorealistic courtroom scene"
              rows={6}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button
              onClick={() =>
                promptEngineer.mutate({
                  tool: "Midjourney",
                  goal: input,
                })
              }
              disabled={promptEngineer.isPending}
            >
              <Play className="mr-2 h-4 w-4" />
              Optimize Prompt
            </Button>
          </TabsContent>
        </Tabs>

        {output && (
          <Card className="p-4 mt-6 bg-secondary/20">
            <h3 className="font-semibold mb-2">Output:</h3>
            <pre className="whitespace-pre-wrap text-sm">{output}</pre>
          </Card>
        )}
      </Card>
    </div>
  );
}

function PromptLibraryTab() {
  const { data: prompts } = trpc.aiOS.prompts.list.useQuery();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Master Prompt Library</h2>
        <Button className="mb-4">
          <Plus className="mr-2 h-4 w-4" />
          Create Prompt
        </Button>

        <div className="space-y-3">
          {prompts?.map((prompt: any) => (
            <div key={prompt.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{prompt.name}</h3>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {prompt.category}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{prompt.description}</p>
              <Button size="sm" variant="outline">
                <Play className="mr-2 h-3 w-3" />
                Execute
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
