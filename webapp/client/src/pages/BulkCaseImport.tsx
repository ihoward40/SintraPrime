import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileUp, CheckCircle2, XCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface CaseRow {
  title: string;
  caseNumber?: string;
  description?: string;
  status?: string;
  caseType?: string;
  priority?: string;
}

export default function BulkCaseImport() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CaseRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createCase = trpc.cases.create.useMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("Please upload a CSV file");
        return;
      }
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("CSV file must have at least a header row and one data row");
        return;
      }

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const data: CaseRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim());
        const row: CaseRow = {
          title: "",
        };

        headers.forEach((header, index) => {
          const value = values[index] || "";
          if (header === "title") row.title = value;
          else if (header === "casenumber" || header === "case_number") row.caseNumber = value;
          else if (header === "description") row.description = value;
          else if (header === "status") row.status = value;
          else if (header === "casetype" || header === "case_type") row.caseType = value;
          else if (header === "priority") row.priority = value;
        });

        if (row.title) {
          data.push(row);
        }
      }

      setParsedData(data);
      toast.success(`Parsed ${data.length} cases from CSV`);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error("No data to import");
      return;
    }

    setImporting(true);
    let successCount = 0;
    let failedCount = 0;

    for (const row of parsedData) {
      try {
        await createCase.mutateAsync({
          title: row.title,
          caseNumber: row.caseNumber,
          description: row.description,
          caseType: row.caseType || "consumer_protection",
          priority: (row.priority as any) || "medium",
        });
        successCount++;
      } catch (error) {
        failedCount++;
        console.error(`Failed to import case: ${row.title}`, error);
      }
    }

    setImporting(false);
    setImportResults({ success: successCount, failed: failedCount });
    toast.success(`Import complete: ${successCount} succeeded, ${failedCount} failed`);
  };

  const downloadTemplate = () => {
    const template = `title,case_number,description,case_type,priority
Smith v. Debt Collector,2024-CV-001,FDCPA violation case,consumer_protection,high
Jones FCRA Dispute,2024-CV-002,Credit report dispute,consumer_protection,medium
Doe v. Bank,2024-CV-003,TILA violation,consumer_protection,high`;
    
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "case_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Bulk Case Import</h1>
          <p className="text-muted-foreground">
            Import multiple cases at once from a CSV file
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Download Template</CardTitle>
              <CardDescription>
                Download the CSV template with the required columns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download CSV Template
              </Button>
              <div className="mt-4 text-sm text-muted-foreground">
                <p className="font-medium mb-2">Required columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>title</code> - Case title (required)</li>
                  <li><code>case_number</code> - Case number (optional)</li>
                  <li><code>description</code> - Case description (optional)</li>
                  <li><code>case_type</code> - consumer_protection, civil_rights, etc. (optional)</li>
                  <li><code>priority</code> - low, medium, high, urgent (optional)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 2: Upload CSV File</CardTitle>
              <CardDescription>
                Select your completed CSV file to import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {file ? file.name : "Select CSV File"}
              </Button>
              {file && (
                <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{parsedData.length} cases ready to import</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {parsedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Review & Import</CardTitle>
              <CardDescription>
                Review the parsed data before importing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Case Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{row.title}</TableCell>
                        <TableCell>{row.caseNumber || "-"}</TableCell>
                        <TableCell>{row.status || "draft"}</TableCell>
                        <TableCell>{row.caseType || "consumer_protection"}</TableCell>
                        <TableCell>{row.priority || "medium"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button
                onClick={handleImport}
                disabled={importing}
                className="w-full"
                size="lg"
              >
                <FileUp className="mr-2 h-4 w-4" />
                {importing ? "Importing..." : `Import ${parsedData.length} Cases`}
              </Button>

              {importResults && (
                <div className="flex items-center justify-center gap-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">{importResults.success} succeeded</span>
                  </div>
                  {importResults.failed > 0 && (
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">{importResults.failed} failed</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
