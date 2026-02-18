import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Eye, Download, Sparkles, Globe, FileText, Video } from "lucide-react";
import { LiveBrowserViewer } from "@/components/LiveBrowserViewer";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

export default function AutomationDemo() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showLiveViewer, setShowLiveViewer] = useState(false);
  const [resultId, setResultId] = useState<number | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please log in to access automation demos");
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  // tRPC mutations
  const createSession = trpc.browserAutomation.createSession.useMutation();
  const navigate = trpc.browserAutomation.navigate.useMutation();
  const extract = trpc.browserAutomation.extract.useMutation();
  const executeTask = trpc.agent.executeTask.useMutation();
  const generateVideo = trpc.videoGeneration.generateVideo.useMutation();
  
  // Result persistence mutations
  const createResult = trpc.automationResults.create.useMutation();
  const updateResult = trpc.automationResults.update.useMutation();

  const demos = [
    {
      id: "web-scraping",
      title: "Web Scraping Demo",
      description: "Watch the agent navigate to FTC.gov, search for debt collection violations, and extract complaint data",
      icon: Globe,
      color: "bg-blue-500",
      steps: [
        "Navigate to FTC.gov",
        "Search for 'debt collection violations'",
        "Extract top 3 complaint categories",
        "Save data to database"
      ]
    },
    {
      id: "document-generation",
      title: "Document Generation Demo",
      description: "Watch the agent research FDCPA violations and generate a professional demand letter",
      icon: FileText,
      color: "bg-green-500",
      steps: [
        "Research FDCPA violations",
        "Analyze case facts",
        "Generate demand letter",
        "Export as PDF"
      ]
    },
    {
      id: "video-creation",
      title: "Video Creation Demo",
      description: "Watch the agent create a professional marketing video using InVideo MCP",
      icon: Video,
      color: "bg-purple-500",
      steps: [
        "Select video template",
        "Generate script with AI",
        "Create video with InVideo",
        "Download final video"
      ]
    },
    {
      id: "full-workflow",
      title: "Complete Workflow Demo",
      description: "Watch the agent execute a full legal research → document generation → video creation workflow",
      icon: Sparkles,
      color: "bg-amber-500",
      steps: [
        "Research case law",
        "Extract key citations",
        "Generate case summary",
        "Create presentation slides",
        "Generate explainer video",
        "Package all deliverables"
      ]
    }
  ];

  const startDemo = async (demoId: string) => {
    setActiveDemo(demoId);
    setShowLiveViewer(true);
    
    // Start browser automation session
    try {
      const demo = demos.find(d => d.id === demoId);
      if (!demo) return;

      toast.info(`Starting ${demo.title}...`);
      
      // Create a unique session ID
      const newSessionId = `demo-${demoId}-${Date.now()}`;
      setSessionId(newSessionId);
      
      // Create result record in database
      const result = await createResult.mutateAsync({
        demoType: demoId,
        sessionId: newSessionId,
        resultData: ""
      });
      setResultId((result as any).insertId || (result as any)[0]?.insertId);

      // Execute the demo based on type
      switch (demoId) {
        case "web-scraping":
          await executeWebScrapingDemo(newSessionId);
          break;
        case "document-generation":
          await executeDocumentGenerationDemo(newSessionId);
          break;
        case "video-creation":
          await executeVideoCreationDemo(newSessionId);
          break;
        case "full-workflow":
          await executeFullWorkflowDemo(newSessionId);
          break;
      }
    } catch (error: any) {
      toast.error(`Demo failed: ${error.message}`);
    }
  };

  const executeWebScrapingDemo = async (sessionId: string) => {
    try {
      // Start browser automation session
      await createSession.mutateAsync({
        sessionId,
        startRecording: true
      });

      toast.success("Web scraping demo started! Watch the live viewer.");

      // Navigate to FTC data page
      await navigate.mutateAsync({
        sessionId,
        url: "https://www.ftc.gov/news-events/data-visualizations/explore-data"
      });

      // Extract data from page
      const extractedData = await extract.mutateAsync({
        sessionId,
        rules: [
          { name: "title", selector: ".data-title" },
          { name: "count", selector: ".data-count" }
        ]
      });

      // Save result to database
      if (resultId) {
        await updateResult.mutateAsync({
          id: resultId,
          status: "completed",
          resultData: JSON.stringify(extractedData || {})
        });
      }

      toast.success("Web scraping completed! Check the action log.");
    } catch (error: any) {
      // Mark as failed
      if (resultId) {
        await updateResult.mutateAsync({
          id: resultId,
          status: "failed",
          errorMessage: error.message
        }).catch(() => {});
      }
      
      toast.error(`Scraping failed: ${error.message}`);
    }
  };

  const executeDocumentGenerationDemo = async (sessionId: string) => {
    try {
      toast.info("Researching FDCPA violations...");

      // Use Agent Zero to research and generate document
      await executeTask.mutateAsync({
        task: "Research the top 3 FDCPA violations and generate a professional demand letter template addressing these violations. Include legal citations and required elements."
      });

      // Save result to database
      if (resultId) {
        await updateResult.mutateAsync({
          id: resultId,
          status: "completed",
          resultData: "Document generated successfully"
        });
      }

      toast.success("Document generation completed! Check results.");
    } catch (error: any) {
      if (resultId) {
        await updateResult.mutateAsync({
          id: resultId,
          status: "failed",
          errorMessage: error.message
        }).catch(() => {});
      }
      
      toast.error(`Document generation failed: ${error.message}`);
    }
  };

  const executeVideoCreationDemo = async (sessionId: string) => {
    try {
      toast.info("Generating video script...");

      // Generate video using InVideo MCP
      const video = await generateVideo.mutateAsync({
        script: "Create a professional video about FDCPA violations and consumer rights. Include information about debt collection harassment, false representations, and unfair practices. End with a call to action for viewers to contact Demo Law Firm at 555-LEGAL-HELP for a free consultation.",
        templateId: "professional",
        duration: 60
      });

      // Save result to database
      if (resultId) {
        await updateResult.mutateAsync({
          id: resultId,
          status: "completed",
          resultData: JSON.stringify({ videoUrl: video })
        });
      }

      toast.success(`Video created! Check the results.`);
    } catch (error: any) {
      if (resultId) {
        await updateResult.mutateAsync({
          id: resultId,
          status: "failed",
          errorMessage: error.message
        }).catch(() => {});
      }
      
      toast.error(`Video creation failed: ${error.message}`);
    }
  };

  const executeFullWorkflowDemo = async (sessionId: string) => {
    try {

      toast.info("Step 1/5: Starting browser automation...");
      await createSession.mutateAsync({ sessionId, startRecording: true });

      toast.info("Step 2/5: Researching case law...");
      await navigate.mutateAsync({
        sessionId,
        url: "https://scholar.google.com"
      });

      toast.info("Step 3/5: Extracting legal citations...");
      await extract.mutateAsync({
        sessionId,
        rules: [
          { name: "case_name", selector: ".gs_rt" },
          { name: "citation", selector: ".gs_a" }
        ]
      });

      toast.info("Step 4/5: Generating case summary with AI...");
      await executeTask.mutateAsync({
        task: "Generate a comprehensive case summary based on the extracted legal citations. Include key holdings, relevant statutes, and practical applications for consumer protection cases."
      });

      toast.info("Step 5/5: Creating explainer video...");
      await generateVideo.mutateAsync({
        script: "Create an educational video explaining the key findings from our legal research on consumer protection and FDCPA violations. Include practical tips for consumers and a call to action.",
        templateId: "educational",
        duration: 90
      });

      // Save result to database
      if (resultId) {
        await updateResult.mutateAsync({
          id: resultId,
          status: "completed",
          resultData: "Full workflow completed successfully"
        });
      }

      toast.success("Full workflow completed! All deliverables ready.");
    } catch (error: any) {
      if (resultId) {
        await updateResult.mutateAsync({
          id: resultId,
          status: "failed",
          errorMessage: error.message
        }).catch(() => {});
      }
      
      toast.error(`Workflow failed: ${error.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Automation Demo Center</h1>
          <p className="text-muted-foreground mt-2">
            Watch SintraPrime's AI agents perform complex tasks in real-time
          </p>
        </div>

        <Tabs defaultValue="demos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="demos">
              <Sparkles className="h-4 w-4 mr-2" />
              Demo Gallery
            </TabsTrigger>
            <TabsTrigger value="live" disabled={!sessionId}>
              <Eye className="h-4 w-4 mr-2" />
              Live Execution
            </TabsTrigger>
          </TabsList>

          <TabsContent value="demos" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              {demos.map((demo) => (
                <Card key={demo.id} className="relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1 h-full ${demo.color}`} />
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${demo.color} bg-opacity-10`}>
                          <demo.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle>{demo.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {demo.description}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Demo Steps:</p>
                      <ul className="space-y-1">
                        {demo.steps.map((step, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                            <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                              {idx + 1}
                            </Badge>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => startDemo(demo.id)}
                        disabled={activeDemo === demo.id}
                        className="flex-1"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {activeDemo === demo.id ? "Running..." : "Start Demo"}
                      </Button>
                      {activeDemo === demo.id && (
                        <Button
                          variant="outline"
                          onClick={() => setShowLiveViewer(true)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Live
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="live" className="space-y-4">
            {sessionId && (
              <Card>
                <CardHeader>
                  <CardTitle>Live Execution Viewer</CardTitle>
                  <CardDescription>
                    Watch the agent perform tasks in real-time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {showLiveViewer && (
                    <LiveBrowserViewer
                      sessionId={sessionId}
                      onClose={() => setShowLiveViewer(false)}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Feature Highlights */}
        <Card>
          <CardHeader>
            <CardTitle>What You'll See</CardTitle>
            <CardDescription>
              Real-time visualization of AI agent automation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Eye className="h-5 w-5 text-blue-500" />
                  </div>
                  <h3 className="font-medium">Live Browser View</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  See exactly what the agent sees - real-time screenshots of browser automation
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <FileText className="h-5 w-5 text-green-500" />
                  </div>
                  <h3 className="font-medium">Action Log</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Detailed step-by-step log of every action the agent takes
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Download className="h-5 w-5 text-purple-500" />
                  </div>
                  <h3 className="font-medium">Session Recording</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Download a video recording of the entire automation session
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
