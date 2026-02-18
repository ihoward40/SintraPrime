import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileDown, Loader2, FileText, Scale, Clock, Users,
  Shield, Briefcase, CheckCircle2
} from "lucide-react";

export default function CaseExport() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [reportTitle, setReportTitle] = useState("");

  const { data: cases, isLoading: casesLoading } = trpc.cases.list.useQuery();

  const generateMutation = trpc.caseExport.generateReport.useMutation({
    onSuccess: (data) => {
      setGeneratedHtml(data.html);
      setReportTitle(data.title);
      toast.success("Case report generated successfully");
    },
    onError: (err) => toast.error(err.message || "Failed to generate report"),
  });

  const handleGenerate = () => {
    if (!selectedCaseId) {
      toast.error("Please select a case first");
      return;
    }
    generateMutation.mutate({ caseId: parseInt(selectedCaseId) });
  };

  const handleDownload = () => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SintraPrime-Case-Report-${reportTitle.replace(/[^a-zA-Z0-9]/g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const handlePrint = () => {
    if (!generatedHtml) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(generatedHtml);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  };

  const selectedCase = useMemo(() => {
    if (!selectedCaseId || !cases) return null;
    return cases.find((c: any) => c.id === parseInt(selectedCaseId));
  }, [selectedCaseId, cases]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Case Export</h1>
        <p className="text-muted-foreground mt-1">
          Generate comprehensive case reports for attorney review or court submission
        </p>
      </div>

      {/* Case Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Select Case
          </CardTitle>
          <CardDescription>
            Choose a case to generate a complete report package
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a case..." />
            </SelectTrigger>
            <SelectContent>
              {cases?.map((c: any) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.title} — {c.caseType || "General"} ({c.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedCase && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{selectedCase.title}</h3>
                <Badge>{selectedCase.status}</Badge>
              </div>
              {selectedCase.description && (
                <p className="text-sm text-muted-foreground">{selectedCase.description}</p>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground">
                {selectedCase.caseType && <span>Type: {selectedCase.caseType}</span>}
                {selectedCase.priority && <span>Priority: {selectedCase.priority}</span>}
              </div>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={!selectedCaseId || generateMutation.isPending}
            className="w-full"
          >
            {generateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating Report...</>
            ) : (
              <><FileText className="h-4 w-4 mr-2" /> Generate Case Report</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Report Includes */}
      <Card>
        <CardHeader>
          <CardTitle>Report Contents</CardTitle>
          <CardDescription>
            The generated report includes all case data in a professionally formatted document
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Scale, label: "Case Summary", desc: "Status, type, priority, dates" },
              { icon: Users, label: "Parties", desc: "All parties with contact info" },
              { icon: FileText, label: "Documents", desc: "Complete document listing" },
              { icon: Shield, label: "Evidence", desc: "Evidence inventory with sources" },
              { icon: Clock, label: "Timeline", desc: "Chronological event history" },
              { icon: Briefcase, label: "Strategies", desc: "Warfare strategy breakdown" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <item.icon className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Generated Report Preview & Actions */}
      {generatedHtml && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Report Ready: {reportTitle}
                </CardTitle>
                <CardDescription>
                  Your case report has been generated. Download or print it below.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                  Print
                </Button>
                <Button onClick={handleDownload}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Download HTML
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-white">
              <iframe
                srcDoc={generatedHtml}
                className="w-full h-[600px]"
                title="Case Report Preview"
                sandbox="allow-same-origin"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Open the downloaded HTML file in your browser and use "Print to PDF" for a PDF version.
              This document is marked CONFIDENTIAL and includes SintraPrime branding.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
