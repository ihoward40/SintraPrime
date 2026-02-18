import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useCallback } from "react";
import { FileText, Plus, Search, Upload, File, Eye, Trash2, FileUp, X, CheckCircle2, Download, History } from "lucide-react";
import { toast } from "sonner";
import { useTierGate } from "@/hooks/useTierGate";
import UpgradePrompt from "@/components/UpgradePrompt";
import { RichTextEditor } from "@/components/RichTextEditor";
import { DocumentVersionHistory } from "@/components/DocumentVersionHistory";

const DOCUMENT_TEMPLATES = [
  { name: "Debt Validation Letter", type: "template", category: "FDCPA", content: `[Your Name]\n[Your Address]\n[City, State ZIP]\n[Date]\n\n[Debt Collector Name]\n[Debt Collector Address]\n\nRe: Account Number [XXXX]\n\nDear Sir/Madam,\n\nI am writing in response to your [letter/phone call] dated [date], regarding the above-referenced account. Pursuant to my rights under the Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692g, I am requesting that you provide me with validation of this alleged debt.\n\nPlease provide the following:\n\n1. The amount of the debt and what the amount consists of\n2. The name of the creditor to whom the debt is owed\n3. A copy of the last billing statement sent to me by the original creditor\n4. Proof that you are licensed to collect debts in my state\n5. A copy of the original signed agreement\n\nPlease note that this is not a refusal to pay, but a request for verification as provided by the FDCPA. Until you provide adequate verification, you must cease all collection activities.\n\nSincerely,\n[Your Name]` },
  { name: "FCRA Dispute Letter", type: "template", category: "FCRA", content: `[Your Name]\n[Your Address]\n[City, State ZIP]\n[Date]\n\n[Credit Bureau Name]\n[Credit Bureau Address]\n\nRe: Dispute of Inaccurate Information\n\nDear Sir/Madam,\n\nI am writing to dispute the following information in my credit report. I have identified the following item(s) as inaccurate:\n\n[Account Name]: [Account Number]\nReason for dispute: [Describe the inaccuracy]\n\nPursuant to the Fair Credit Reporting Act, 15 U.S.C. § 1681i, I am requesting that you investigate this matter and correct the inaccurate information.\n\nEnclosed are copies of supporting documents.\n\nPlease investigate this matter and correct the disputed item(s) as soon as possible.\n\nSincerely,\n[Your Name]` },
  { name: "Cease and Desist Letter", type: "template", category: "General", content: `[Your Name]\n[Your Address]\n[City, State ZIP]\n[Date]\n\n[Recipient Name]\n[Recipient Address]\n\nRe: Cease and Desist\n\nDear [Recipient],\n\nThis letter serves as formal notice that you must CEASE AND DESIST all [describe unwanted activity].\n\n[Describe the situation and why the activity must stop]\n\nIf you do not comply with this demand, I will pursue all available legal remedies, including but not limited to filing a lawsuit.\n\nGovern yourself accordingly.\n\nSincerely,\n[Your Name]` },
  { name: "CFPB Complaint Template", type: "template", category: "Consumer", content: `Consumer Financial Protection Bureau Complaint\n\nProduct/Service: [e.g., Debt Collection, Credit Reporting]\nIssue: [Describe the primary issue]\n\nWhat happened:\n[Provide a detailed chronological account of events]\n\nDesired resolution:\n[State what you want to happen]\n\nCompany involved:\n[Company name and contact information]\n\nDocumentation:\n[List all supporting documents]` },
];

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Documents() {
  const { tier, canAccess, requiredTier } = useTierGate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof DOCUMENT_TEMPLATES[0] | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorDocId, setEditorDocId] = useState<number | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocType, setNewDocType] = useState("motion");
  const [newDocContent, setNewDocContent] = useState("");

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState("uploaded");
  const [uploadDescription, setUploadDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents, isLoading, refetch } = trpc.documents.list.useQuery({});
  const createDoc = trpc.documents.create.useMutation({
    onSuccess: () => {
      toast.success("Document created");
      setCreateDialogOpen(false);
      setNewDocTitle("");
      setNewDocContent("");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const uploadMutation = trpc.upload.file.useMutation({
    onSuccess: () => {
      toast.success("File uploaded successfully");
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadTitle("");
      setUploadDescription("");
      refetch();
    },
    onError: (err: any) => toast.error(`Upload failed: ${err.message}`),
  });

  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const generatePdf = trpc.pdf.generate.useMutation({
    onError: (err: any) => toast.error(err.message),
  });

  const handleCreateDocument = () => {
    if (!newDocTitle.trim()) {
      toast.error("Please enter a document title");
      return;
    }
    createDoc.mutate({
      title: newDocTitle,
      documentType: newDocType,
      content: newDocContent || undefined,
    });
  };

  const handleUseTemplate = (template: typeof DOCUMENT_TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setEditorTitle(template.name);
    setEditorContent(template.content);
    setTemplateDialogOpen(false);
    setEditorOpen(true);
  };

  const handleSaveFromEditor = () => {
    if (!editorTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }
    createDoc.mutate({
      title: editorTitle,
      documentType: "template",
      content: editorContent,
    });
    setEditorOpen(false);
  };

  const handleFileSelect = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be under 10MB");
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.endsWith(".txt")) {
      toast.error("Unsupported file type. Accepted: PDF, DOC, DOCX, TXT, PNG, JPG, GIF, WEBP");
      return;
    }
    setUploadFile(file);
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^.]+$/, ""));
    }
  }, [uploadTitle]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file");
      return;
    }
    if (!uploadTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        fileName: uploadFile.name,
        mimeType: uploadFile.type || "application/octet-stream",
        base64Data: base64,
        context: "document",
        title: uploadTitle,
        description: uploadDescription || undefined,
        documentType: uploadType,
      });
    };
    reader.readAsDataURL(uploadFile);
  };

  const filteredDocs = documents?.filter((d: { title: string; documentType?: string | null }) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.documentType || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground">
              Legal document management, templates, and file uploads
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Templates
            </Button>
            <Button variant="outline" onClick={() => {
              if (!canAccess("fileUploads")) {
                toast.error("File uploads require a Pro plan or higher.");
                return;
              }
              setUploadDialogOpen(true);
            }}>
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Document
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Document List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredDocs && filteredDocs.length > 0 ? (
          <div className="space-y-2">
            {filteredDocs.map((doc) => (
              <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-4">
                    {doc.fileUrl ? (
                      <FileUp className="h-8 w-8 text-blue-500 shrink-0" />
                    ) : (
                      <File className="h-8 w-8 text-primary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{doc.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {doc.documentType && (
                          <Badge variant="outline" className="text-xs">{doc.documentType}</Badge>
                        )}
                        {doc.fileUrl && (
                          <Badge variant="secondary" className="text-xs">
                            <Upload className="h-3 w-3 mr-1" />
                            {doc.mimeType?.split("/")[1]?.toUpperCase() || "FILE"}
                          </Badge>
                        )}
                        {doc.fileSize && (
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(doc.fileSize)}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {doc.fileUrl ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(doc.fileUrl!, "_blank")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditorTitle(doc.title);
                              setEditorContent(doc.content || "");
                              setEditorDocId(doc.id);
                              setEditorOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditorDocId(doc.id);
                              setEditorContent(doc.content || "");
                              setShowVersionHistory(true);
                            }}
                            title="Version History"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {doc.content && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={async () => {
                            try {
                              toast.info("Generating PDF...");
                              const result = await generatePdf.mutateAsync({ documentId: doc.id });
                              // Open the HTML in a new tab for printing/saving as PDF
                              const blob = new Blob([result.html], { type: "text/html" });
                              const url = URL.createObjectURL(blob);
                              const win = window.open(url, "_blank");
                              if (win) {
                                win.onload = () => {
                                  setTimeout(() => win.print(), 500);
                                };
                              }
                              toast.success("PDF ready! Use your browser's print dialog to save.");
                            } catch (e) {
                              toast.error("Failed to generate PDF");
                            }
                          }}
                          title="Export as PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          if (confirm("Delete this document?")) {
                            deleteDoc.mutate({ id: doc.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">No documents yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Create a new document, use a template, or upload a file
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTemplateDialogOpen(true)}>
                  Use Template
                </Button>
                <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Document
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload File Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        setUploadDialogOpen(open);
        if (!open) { setUploadFile(null); setUploadTitle(""); setUploadDescription(""); }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload PDFs, Word documents, images, or text files (max 10MB)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              {uploadFile ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div className="text-left">
                    <p className="font-medium">{uploadFile.name}</p>
                    <p className="text-sm text-muted-foreground">{formatFileSize(uploadFile.size)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); setUploadFile(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">Drag & drop a file here, or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, TXT, PNG, JPG, GIF, WEBP</p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Document title..."
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uploaded">Uploaded File</SelectItem>
                  <SelectItem value="motion">Motion</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                  <SelectItem value="brief">Brief</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="evidence">Evidence</SelectItem>
                  <SelectItem value="correspondence">Correspondence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Optional description..."
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending || !uploadFile}>
              {uploadMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Document Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>Create a blank document or paste content</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Document title..."
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newDocType} onValueChange={setNewDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="motion">Motion</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                  <SelectItem value="brief">Brief</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="notes">Notes</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Paste or type document content..."
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateDocument} disabled={createDoc.isPending}>
              {createDoc.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Legal Document Templates</DialogTitle>
            <DialogDescription>
              Choose a template to start with. Templates include common legal documents with proper formatting.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 max-h-96 overflow-y-auto">
            {DOCUMENT_TEMPLATES.map((template, i) => (
              <Card
                key={i}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleUseTemplate(template)}
              >
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs">{template.category}</Badge>
                    </div>
                    <Button variant="outline" size="sm">Use Template</Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              <Input
                value={editorTitle}
                onChange={(e) => setEditorTitle(e.target.value)}
                className="text-lg font-bold border-none p-0 h-auto focus-visible:ring-0"
                placeholder="Document title..."
              />
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <RichTextEditor
              content={editorContent}
              onChange={setEditorContent}
              placeholder="Start writing your legal document..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Close</Button>
            <Button onClick={handleSaveFromEditor} disabled={createDoc.isPending}>
              {createDoc.isPending ? "Saving..." : "Save as Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Version History</DialogTitle>
            <DialogDescription>
              View and restore previous versions of this document
            </DialogDescription>
          </DialogHeader>
          {editorDocId && (
            <DocumentVersionHistory
              documentId={editorDocId}
              currentContent={editorContent}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
