import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, FileText, Download, CheckCircle2, XCircle, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useRef } from "react";
import { DocumentPreview } from "./DocumentPreview";

interface TaxDocument {
  id: string;
  type: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  count?: number;
}

const commonTaxDocs: TaxDocument[] = [
  { id: 'w2', type: 'W-2', description: 'Wage and Tax Statement', required: true, uploaded: false },
  { id: '1099int', type: '1099-INT', description: 'Interest Income', required: false, uploaded: false },
  { id: '1099div', type: '1099-DIV', description: 'Dividends and Distributions', required: false, uploaded: false },
  { id: '1099b', type: '1099-B', description: 'Proceeds from Broker Transactions', required: false, uploaded: false },
  { id: '1099r', type: '1099-R', description: 'Distributions from Pensions, Annuities, etc.', required: false, uploaded: false },
  { id: 'k1', type: 'K-1', description: 'Partner\'s Share of Income (Form 1065)', required: false, uploaded: false },
  { id: 'k1trust', type: 'K-1 (1041)', description: 'Beneficiary\'s Share of Income (Trust)', required: false, uploaded: false },
  { id: '1098', type: '1098', description: 'Mortgage Interest Statement', required: false, uploaded: false },
  { id: '1098t', type: '1098-T', description: 'Tuition Statement', required: false, uploaded: false },
  { id: 'trust', type: 'Trust Instrument', description: 'Trust Agreement or Declaration', required: true, uploaded: false },
  { id: 'estate', type: 'Estate Docs', description: 'Will, Letters Testamentary, etc.', required: false, uploaded: false },
];

export function MissingDocsRadar() {
  const [documents, setDocuments] = useState<TaxDocument[]>(commonTaxDocs);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadDocType, setCurrentUploadDocType] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    documentType: string;
    extractedData: Record<string, any>;
    ocrText: string;
    taxDocumentId: number;
  } | null>(null);

  const uploadAndProcess = trpc.documentProcessing.uploadAndProcessDocument.useMutation({
    onSuccess: (data) => {
      // Show preview dialog with extracted data
      setPreviewData({
        documentType: currentUploadDocType!,
        extractedData: data.extractedData,
        ocrText: data.ocrText,
        taxDocumentId: data.taxDocumentId,
      });
      setUploading(null);
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(null);
      setCurrentUploadDocType(null);
    },
  });

  const verifyDocument = trpc.documentProcessing.verifyDocument.useMutation();

  const toggleDocument = (id: string) => {
    setDocuments(documents.map(doc => 
      doc.id === id ? { ...doc, uploaded: !doc.uploaded } : doc
    ));
  };

  const handleFileUpload = async (docId: string, file: File) => {
    setUploading(docId);
    setCurrentUploadDocType(docId);

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = (reader.result as string).split(',')[1];
      
      await uploadAndProcess.mutateAsync({
        fileName: file.name,
        mimeType: file.type,
        base64Data,
        documentType: docId,
        taxYear: new Date().getFullYear() - 1,
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePreviewSave = (data: Record<string, any>) => {
    if (!previewData) return;
    
    // Mark document as uploaded
    toggleDocument(previewData.documentType);
    setPreviewData(null);
    setCurrentUploadDocType(null);
    toast.success("Document verified and saved");
  };

  const handlePreviewReject = () => {
    if (!previewData) return;
    
    // Reject the document
    verifyDocument.mutate({
      taxDocumentId: previewData.taxDocumentId,
      verificationStatus: "rejected",
      notes: "Document rejected by user during preview",
    });
    
    setPreviewData(null);
    setCurrentUploadDocType(null);
    toast.error("Document rejected");
  };

  const triggerFileUpload = (docId: string) => {
    setCurrentUploadDocType(docId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUploadDocType) {
      handleFileUpload(currentUploadDocType, file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedDocs(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const generateRequestLetter = () => {
    const missing = documents.filter(d => !d.uploaded && selectedDocs.includes(d.id));
    
    if (missing.length === 0) {
      toast.error("No documents selected");
      return;
    }

    const letterContent = `
Dear [Client Name],

To complete your tax return preparation, we need the following documents:

${missing.map((doc, index) => `${index + 1}. ${doc.type} - ${doc.description}`).join('\n')}

Please provide these documents at your earliest convenience. You can upload them through the secure portal or email them to [email address].

If you have any questions about these documents or need assistance locating them, please don't hesitate to contact us.

Best regards,
[Your Name]
[Firm Name]
    `.trim();

    // Create a downloadable text file
    const blob = new Blob([letterContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'missing-documents-request.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Request letter downloaded");
  };

  const missingCount = documents.filter(d => !d.uploaded).length;
  const uploadedCount = documents.filter(d => d.uploaded).length;
  const requiredMissing = documents.filter(d => d.required && !d.uploaded).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Missing Docs Radar
              </CardTitle>
              <CardDescription>
                Track required documents and generate request letters
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant={requiredMissing > 0 ? "destructive" : "default"}>
                {requiredMissing} Required Missing
              </Badge>
              <Badge variant="outline">
                {uploadedCount}/{documents.length} Uploaded
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Missing</p>
                    <p className="text-2xl font-bold text-red-600">{missingCount}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Uploaded</p>
                    <p className="text-2xl font-bold text-green-600">{uploadedCount}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Required Missing</p>
                    <p className="text-2xl font-bold text-amber-600">{requiredMissing}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Document List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Document Checklist</h3>
              <Button size="sm" variant="outline" onClick={() => toast.info("Upload functionality coming soon")}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </Button>
            </div>

            {documents.map(doc => (
              <Card key={doc.id} className={doc.uploaded ? "bg-green-50 border-green-200" : "bg-gray-50"}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedDocs.includes(doc.id)}
                        onChange={() => toggleSelection(doc.id)}
                        className="rounded border-gray-300"
                        disabled={doc.uploaded}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{doc.type}</p>
                          {doc.required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                          {doc.uploaded && (
                            <Badge variant="default" className="text-xs bg-green-600">Uploaded</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      </div>
                    </div>
                    {doc.uploaded ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleDocument(doc.id)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Mark Missing
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => triggerFileUpload(doc.id)}
                        disabled={uploading === doc.id}
                      >
                        {uploading === doc.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.tiff"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Actions */}
          <div className="flex gap-4">
            <Button 
              onClick={generateRequestLetter}
              disabled={selectedDocs.length === 0}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Generate Request Letter ({selectedDocs.length} selected)
            </Button>
          </div>

          {/* Prior Year Comparison */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2 text-sm text-blue-900">
                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">Prior Year Comparison</p>
                  <p className="text-xs">
                    Compare with last year's tax documents to identify missing items. Upload prior year return for automatic comparison.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => toast.info("Prior year comparison coming soon")}>
                    Upload Prior Year Return
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Document Preview Dialog */}
      {previewData && (
        <DocumentPreview
          isOpen={!!previewData}
          onClose={() => setPreviewData(null)}
          documentType={previewData.documentType}
          extractedData={previewData.extractedData}
          ocrText={previewData.ocrText}
          onSave={handlePreviewSave}
          onReject={handlePreviewReject}
        />
      )}
    </div>
  );
}
