import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Package,
  Search,
  ExternalLink,
  Download,
  Star,
  GitFork,
  Check,
  Server,
  Mic,
  Database,
  Bot,
  FlaskConical,
  Network,
  Shield,
  Cpu,
  BookOpen,
  RefreshCw,
  Play,
  Copy,
  Terminal,
  ChevronRight,
} from "lucide-react";

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  replaces: string;
  stars: string;
  icon: React.ElementType;
  color: string;
  features: string[];
  installCmd: string;
  githubUrl: string;
  status: "available" | "installed" | "configuring";
  tags: string[];
}

const tools: Tool[] = [
  {
    id: "coolify",
    name: "Coolify",
    description: "Self-hosted PaaS platform replacing Heroku, Vercel & Netlify. Deploy apps, databases, and services with zero vendor lock-in.",
    category: "Infrastructure",
    replaces: "Heroku / Vercel / Netlify",
    stars: "32.4k",
    icon: Server,
    color: "text-purple-500",
    features: ["One-click deployments", "Auto SSL certificates", "Docker & Git-based", "Built-in databases"],
    installCmd: "curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash",
    githubUrl: "https://github.com/coollabsio/coolify",
    status: "available",
    tags: ["deployment", "hosting", "paas"],
  },
  {
    id: "rag-pipeline",
    name: "RAG Pipeline (LlamaIndex)",
    description: "Open-source RAG framework for building retrieval-augmented generation pipelines over private documents and knowledge bases.",
    category: "AI / RAG",
    replaces: "Azure AI Search / Pinecone",
    stars: "37.8k",
    icon: BookOpen,
    color: "text-blue-500",
    features: ["Document ingestion", "Vector search", "Multi-modal support", "100+ integrations"],
    installCmd: "pip install llama-index",
    githubUrl: "https://github.com/run-llama/llama_index",
    status: "available",
    tags: ["rag", "ai", "search", "embeddings"],
  },
  {
    id: "coqui-tts",
    name: "Coqui TTS",
    description: "State-of-the-art text-to-speech library with 1100+ pre-trained models. High-quality voice synthesis with custom voice cloning.",
    category: "Voice / TTS",
    replaces: "ElevenLabs / AWS Polly",
    stars: "34.1k",
    icon: Mic,
    color: "text-green-500",
    features: ["Voice cloning", "1100+ models", "Real-time synthesis", "Multi-language"],
    installCmd: "pip install TTS",
    githubUrl: "https://github.com/coqui-ai/TTS",
    status: "available",
    tags: ["tts", "voice", "speech", "audio"],
  },
  {
    id: "doltdb",
    name: "DoltDB",
    description: "Git for data. A SQL database with branching, merging, and version control. Perfect for legal document versioning and audit trails.",
    category: "Database",
    replaces: "Notion Databases / Airtable",
    stars: "17.2k",
    icon: Database,
    color: "text-orange-500",
    features: ["Git-like versioning", "SQL interface", "Branch & merge data", "Complete audit trail"],
    installCmd: "brew install dolt",
    githubUrl: "https://github.com/dolthub/dolt",
    status: "available",
    tags: ["database", "versioning", "sql", "audit"],
  },
  {
    id: "deerflow",
    name: "DeerFlow",
    description: "Open-source deep research agent workflow powered by LLMs. Automates multi-step research tasks with web search and analysis.",
    category: "AI Agents",
    replaces: "Perplexity Pro / Elicit",
    stars: "9.6k",
    icon: Bot,
    color: "text-cyan-500",
    features: ["Autonomous research", "Multi-step planning", "Web search integration", "Report generation"],
    installCmd: "git clone https://github.com/bytedance/deer-flow && pip install -r requirements.txt",
    githubUrl: "https://github.com/bytedance/deer-flow",
    status: "available",
    tags: ["agents", "research", "automation", "llm"],
  },
  {
    id: "promptfoo",
    name: "PromptFoo",
    description: "LLM testing and evaluation framework. Test prompts, compare models, and catch regressions before they reach production.",
    category: "AI Testing",
    replaces: "LangSmith / PromptLayer",
    stars: "5.1k",
    icon: FlaskConical,
    color: "text-yellow-500",
    features: ["Prompt testing", "Model comparison", "CI/CD integration", "Red teaming"],
    installCmd: "npx promptfoo@latest init",
    githubUrl: "https://github.com/promptfoo/promptfoo",
    status: "available",
    tags: ["testing", "llm", "evaluation", "ci"],
  },
  {
    id: "n8n",
    name: "n8n Workflow Automation",
    description: "Self-hosted workflow automation with 400+ integrations. Build complex automation workflows with a visual editor.",
    category: "Automation",
    replaces: "Zapier / Make",
    stars: "47.8k",
    icon: Network,
    color: "text-red-500",
    features: ["400+ integrations", "Visual workflow builder", "Code execution", "Webhooks & triggers"],
    installCmd: "npx n8n",
    githubUrl: "https://github.com/n8n-io/n8n",
    status: "available",
    tags: ["automation", "workflow", "integrations", "no-code"],
  },
  {
    id: "authentik",
    name: "Authentik",
    description: "Open-source identity provider with SSO, LDAP, SAML, and OIDC support. Enterprise-grade auth without the enterprise price tag.",
    category: "Security / Auth",
    replaces: "Auth0 / Okta",
    stars: "14.3k",
    icon: Shield,
    color: "text-indigo-500",
    features: ["SSO support", "LDAP/SAML/OIDC", "MFA built-in", "Custom flows"],
    installCmd: "docker compose up -d",
    githubUrl: "https://github.com/goauthentik/authentik",
    status: "available",
    tags: ["auth", "sso", "security", "identity"],
  },
  {
    id: "localai",
    name: "LocalAI",
    description: "Run LLMs, image generation, and audio AI locally. OpenAI-compatible API with no GPU required for many models.",
    category: "AI Runtime",
    replaces: "OpenAI API / Anthropic API",
    stars: "25.7k",
    icon: Cpu,
    color: "text-teal-500",
    features: ["OpenAI-compatible API", "No GPU required", "25+ model families", "Audio & vision"],
    installCmd: "docker run -p 8080:8080 localai/localai:latest",
    githubUrl: "https://github.com/mudler/LocalAI",
    status: "available",
    tags: ["llm", "local", "inference", "api"],
  },
  {
    id: "appflowy",
    name: "AppFlowy",
    description: "Open-source Notion alternative with AI-powered writing, kanban boards, documents, and databases. Full privacy, self-hosted.",
    category: "Productivity",
    replaces: "Notion / Confluence",
    stars: "59.2k",
    icon: Package,
    color: "text-pink-500",
    features: ["AI writing assistant", "Kanban boards", "Document editor", "Grid databases"],
    installCmd: "Download from appflowy.io",
    githubUrl: "https://github.com/AppFlowy-IO/AppFlowy",
    status: "available",
    tags: ["productivity", "notes", "kanban", "documents"],
  },
];

const categories = ["All", "Infrastructure", "AI / RAG", "Voice / TTS", "Database", "AI Agents", "AI Testing", "Automation", "Security / Auth", "AI Runtime", "Productivity"];

export default function OpenSourceToolsHub() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [installedTools, setInstalledTools] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      searchQuery === "" ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tags.some((tag) => tag.includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInstall = (tool: Tool) => {
    setInstalledTools((prev) => new Set([...prev, tool.id]));
    toast.success(`${tool.name} marked as installed!`, {
      description: "Tool added to your infrastructure stack.",
    });
  };

  const handleCopyCmd = (tool: Tool) => {
    navigator.clipboard.writeText(tool.installCmd);
    setCopiedId(tool.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Install command copied to clipboard!");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Package className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Open Source Tools Hub</h1>
            <p className="text-muted-foreground text-sm">
              10 top open-source tools replacing expensive SaaS subscriptions
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Star className="h-3 w-3" />
          Save $2,400+/mo
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Tools Available", value: "10", icon: Package, color: "text-purple-500" },
          { label: "Combined Stars", value: "282k+", icon: Star, color: "text-yellow-500" },
          { label: "Installed", value: installedTools.size.toString(), icon: Check, color: "text-green-500" },
          { label: "Monthly Savings", value: "$2,400+", icon: RefreshCw, color: "text-blue-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tools by name, feature, or tag..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex flex-wrap h-auto gap-1 justify-start bg-transparent p-0">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {cat}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTools.map((tool) => {
              const Icon = tool.icon;
              const isInstalled = installedTools.has(tool.id);
              return (
                <Card
                  key={tool.id}
                  className={`border transition-all hover:shadow-md ${isInstalled ? "border-green-200 bg-green-50/30" : ""}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary rounded-lg">
                          <Icon className={`h-5 w-5 ${tool.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {tool.name}
                            {isInstalled && (
                              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                <Check className="h-2.5 w-2.5 mr-1" />
                                Installed
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription className="text-xs flex items-center gap-1">
                            <span className="text-muted-foreground">Replaces:</span>
                            <span className="font-medium text-orange-600">{tool.replaces}</span>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {tool.stars}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{tool.description}</p>

                    {/* Features */}
                    <div className="grid grid-cols-2 gap-1">
                      {tool.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-1 text-xs">
                          <ChevronRight className="h-3 w-3 text-primary" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {tool.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Install Command */}
                    <div className="bg-secondary/50 rounded-md p-2 flex items-center gap-2">
                      <Terminal className="h-3 w-3 text-muted-foreground shrink-0" />
                      <code className="text-xs flex-1 truncate font-mono">{tool.installCmd}</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 shrink-0"
                        onClick={() => handleCopyCmd(tool)}
                      >
                        {copiedId === tool.id ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {!isInstalled ? (
                        <Button
                          size="sm"
                          className="flex-1 gap-1"
                          onClick={() => handleInstall(tool)}
                        >
                          <Download className="h-3 w-3" />
                          Add to Stack
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1 text-green-600 border-green-200"
                          onClick={() => {
                            setInstalledTools((prev) => {
                              const next = new Set(prev);
                              next.delete(tool.id);
                              return next;
                            });
                          }}
                        >
                          <Check className="h-3 w-3" />
                          In Your Stack
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => window.open(tool.githubUrl, "_blank")}
                      >
                        <GitFork className="h-3 w-3" />
                        GitHub
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filteredTools.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No tools found matching your search.</p>
              <Button variant="link" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}>
                Clear filters
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4 text-green-500" />
            Quick Start: Your Open Source Stack
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Step 1: Infrastructure</h4>
              <p className="text-muted-foreground text-xs">Deploy Coolify on a VPS for $5/mo and host everything else on it.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Step 2: AI Stack</h4>
              <p className="text-muted-foreground text-xs">Run LocalAI for model inference, LlamaIndex for RAG, and PromptFoo for testing.</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Step 3: Automation</h4>
              <p className="text-muted-foreground text-xs">Use n8n for workflow automation and DeerFlow for deep research agents.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
