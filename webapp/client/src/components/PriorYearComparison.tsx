import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface PriorYearComparisonProps {
  currentYear: number;
}

interface ComparisonResult {
  documentType: string;
  priorYearPresent: boolean;
  currentYearPresent: boolean;
  status: "missing" | "new" | "present";
  priorYearAmount?: number;
  currentYearAmount?: number;
  changePercent?: number;
}

export function PriorYearComparison({ currentYear }: PriorYearComparisonProps) {
  const [uploading, setUploading] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);

  const priorYearDocs = trpc.documentProcessing.getMissingDocuments.useQuery({
    taxYear: currentYear - 1,
  });

  const currentYearDocs = trpc.documentProcessing.getMissingDocuments.useQuery({
    taxYear: currentYear,
  });

  const uploadAndProcess = trpc.documentProcessing.uploadAndProcessDocument.useMutation({
    onSuccess: () => {
      toast.success("Prior year return uploaded successfully");
      setUploading(false);
      priorYearDocs.refetch();
      performComparison();
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
    },
  });

  const performComparison = () => {
    if (!priorYearDocs.data || !currentYearDocs.data) return;

    const commonTypes = [
      "w2",
      "1099-int",
      "1099-div",
      "1099-b",
      "1099-r",
      "k1",
      "k1-1041",
    ];

    const results: ComparisonResult[] = commonTypes.map((type) => {
      const priorPresent = priorYearDocs.data.uploaded.some(
        (d) => d.documentType === type
      );
      const currentPresent = currentYearDocs.data.uploaded.some(
        (d) => d.documentType === type
      );

      let status: "missing" | "new" | "present";
      if (priorPresent && !currentPresent) {
        status = "missing";
      } else if (!priorPresent && currentPresent) {
        status = "new";
      } else {
        status = "present";
      }

      return {
        documentType: type,
        priorYearPresent: priorPresent,
        currentYearPresent: currentPresent,
        status,
      };
    });

    setComparisonResults(results);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(",")[1];

      await uploadAndProcess.mutateAsync({
        fileName: file.name,
        mimeType: file.type,
        base64Data,
        documentType: "prior_year_return",
        taxYear: currentYear - 1,
      });
    };
    reader.readAsDataURL(file);
  };

  const missingDocs = comparisonResults.filter((r) => r.status === "missing");
  const newDocs = comparisonResults.filter((r) => r.status === "new");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Prior Year Comparison
              </CardTitle>
              <CardDescription>
                Compare {currentYear} documents with {currentYear - 1} to identify missing items
              </CardDescription>
            </div>
            <Button
              onClick={() => document.getElementById("prior-year-upload")?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Prior Year Return
                </>
              )}
            </Button>
            <input
              id="prior-year-upload"
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="hidden"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Missing This Year</p>
                    <p className="text-2xl font-bold text-red-600">{missingDocs.length}</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">New This Year</p>
                    <p className="text-2xl font-bold text-green-600">{newDocs.length}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Prior Year Docs</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {priorYearDocs.data?.uploaded.length || 0}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Comparison Results */}
          {comparisonResults.length > 0 ? (
            <div className="space-y-2">
              <h3 className="font-semibold mb-4">Document Comparison</h3>
              {comparisonResults.map((result) => (
                <Card
                  key={result.documentType}
                  className={
                    result.status === "missing"
                      ? "bg-red-50 border-red-200"
                      : result.status === "new"
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50"
                  }
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {result.status === "missing" ? (
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                        ) : result.status === "new" ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-gray-500" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{result.documentType.toUpperCase()}</p>
                            {result.status === "missing" && (
                              <Badge variant="destructive" className="text-xs">
                                Missing This Year
                              </Badge>
                            )}
                            {result.status === "new" && (
                              <Badge variant="default" className="text-xs bg-green-600">
                                New This Year
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            <span>
                              {currentYear - 1}: {result.priorYearPresent ? "✓" : "✗"}
                            </span>
                            <span>
                              {currentYear}: {result.currentYearPresent ? "✓" : "✗"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Upload prior year return to enable comparison analysis
              </AlertDescription>
            </Alert>
          )}

          {/* Missing Documents Alert */}
          {missingDocs.length > 0 && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                <p className="font-semibold mb-2">Action Required</p>
                <p className="text-sm">
                  You had {missingDocs.length} document type(s) last year that are missing this year:
                </p>
                <ul className="list-disc list-inside text-sm mt-2">
                  {missingDocs.map((doc) => (
                    <li key={doc.documentType}>{doc.documentType.toUpperCase()}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* New Documents Info */}
          {newDocs.length > 0 && (
            <Alert className="bg-green-50 border-green-200">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <p className="font-semibold mb-2">New Income Sources</p>
                <p className="text-sm">
                  You have {newDocs.length} new document type(s) this year:
                </p>
                <ul className="list-disc list-inside text-sm mt-2">
                  {newDocs.map((doc) => (
                    <li key={doc.documentType}>{doc.documentType.toUpperCase()}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Auto-Comparison Trigger */}
          {priorYearDocs.data && currentYearDocs.data && comparisonResults.length === 0 && (
            <div className="flex justify-center">
              <Button onClick={performComparison}>
                <FileText className="w-4 h-4 mr-2" />
                Run Comparison Analysis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
