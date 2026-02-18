import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, Download } from "lucide-react";
import { Streamdown } from "streamdown";

export default function ContractReview() {
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractText, setContractText] = useState("");
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const reviewContractMutation = trpc.contracts.reviewContract.useMutation({
    onSuccess: (data: any) => {
      setReviewResult(data);
      setIsAnalyzing(false);
    },
    onError: (error: any) => {
      console.error("Contract review failed:", error);
      setIsAnalyzing(false);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setContractFile(file);
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setContractText(text);
    };
    reader.readAsText(file);
  };

  const handleAnalyze = () => {
    if (!contractText) return;

    setIsAnalyzing(true);
    reviewContractMutation.mutate({
      contractText,
      contractType: "general",
    });
  };

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case "high":
        return <XCircle className="h-4 w-4" />;
      case "medium":
        return <AlertTriangle className="h-4 w-4" />;
      case "low":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Contract Review Tool</h1>
        <p className="text-muted-foreground mt-2">
          Upload a contract for AI-powered analysis, risk assessment, and clause extraction
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Upload & Analysis */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Upload Contract</CardTitle>
              <CardDescription>
                Upload a contract file or paste the text below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contract-file">Contract File</Label>
                <div className="mt-2">
                  <Input
                    id="contract-file"
                    type="file"
                    accept=".txt,.doc,.docx,.pdf"
                    onChange={handleFileUpload}
                  />
                </div>
                {contractFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {contractFile.name}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="contract-text">Or Paste Contract Text</Label>
                <textarea
                  id="contract-text"
                  className="w-full h-32 mt-2 p-2 border rounded-md"
                  placeholder="Paste your contract text here..."
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                />
              </div>

              <Button
                onClick={handleAnalyze}
                disabled={!contractText || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>Analyzing...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Analyze Contract
                  </>
                )}
              </Button>

              {reviewResult && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Analysis complete! View results on the right.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-2">
          {!reviewResult ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Upload and analyze a contract to see results here</p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="risks">Risks</TabsTrigger>
                <TabsTrigger value="clauses">Clauses</TabsTrigger>
                <TabsTrigger value="obligations">Obligations</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>

              <TabsContent value="summary">
                <Card>
                  <CardHeader>
                    <CardTitle>Contract Analysis Summary</CardTitle>
                    <CardDescription>
                      Overall assessment and key findings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Overall Risk Score</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRiskColor(reviewResult.riskLevel)}>
                          {reviewResult.riskLevel} Risk
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Score: {reviewResult.riskScore}/100
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Summary</h3>
                      <div className="prose prose-sm max-w-none">
                        <Streamdown>{reviewResult.summary}</Streamdown>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-destructive">
                          {reviewResult.risks?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Risks Found</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-primary">
                          {reviewResult.clauses?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Clauses Identified</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {reviewResult.obligations?.length || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">Obligations</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="risks">
                <Card>
                  <CardHeader>
                    <CardTitle>Risk Assessment</CardTitle>
                    <CardDescription>
                      Identified risks and potential issues
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reviewResult.risks?.map((risk: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold">{risk.title}</h4>
                            <Badge variant={getRiskColor(risk.severity)}>
                              {getRiskIcon(risk.severity)}
                              <span className="ml-1">{risk.severity}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {risk.description}
                          </p>
                          <div className="text-sm">
                            <span className="font-medium">Mitigation: </span>
                            {risk.mitigation}
                          </div>
                        </div>
                      ))}
                      {(!reviewResult.risks || reviewResult.risks.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">
                          No risks identified
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="clauses">
                <Card>
                  <CardHeader>
                    <CardTitle>Extracted Clauses</CardTitle>
                    <CardDescription>
                      Key clauses identified in the contract
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reviewResult.clauses?.map((clause: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold">{clause.type}</h4>
                            <Badge variant="outline">{clause.category}</Badge>
                          </div>
                          <p className="text-sm">{clause.text}</p>
                        </div>
                      ))}
                      {(!reviewResult.clauses || reviewResult.clauses.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">
                          No clauses extracted
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="obligations">
                <Card>
                  <CardHeader>
                    <CardTitle>Obligations</CardTitle>
                    <CardDescription>
                      Contractual obligations and responsibilities
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reviewResult.obligations?.map((obligation: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold">{obligation.title}</h4>
                            <Badge variant="outline">{obligation.party}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {obligation.description}
                          </p>
                          {obligation.deadline && (
                            <div className="text-sm">
                              <span className="font-medium">Deadline: </span>
                              {obligation.deadline}
                            </div>
                          )}
                        </div>
                      ))}
                      {(!reviewResult.obligations || reviewResult.obligations.length === 0) && (
                        <p className="text-center text-muted-foreground py-8">
                          No obligations identified
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recommendations">
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                    <CardDescription>
                      Suggested improvements and actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <Streamdown>{reviewResult.recommendations}</Streamdown>
                    </div>

                    <div className="mt-6 flex gap-2">
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export Report
                      </Button>
                      <Button variant="outline">
                        Save Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
