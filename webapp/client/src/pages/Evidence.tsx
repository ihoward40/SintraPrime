import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useCallback } from "react";
import { Shield, Upload, Search, Eye, Trash2, AlertTriangle, CheckCircle2, FileUp, X, Plus } from "lucide-react";
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
import { toast } from "sonner";
import { useTierGate } from "@/hooks/useTierGate";
import UpgradePrompt from "@/components/UpgradePrompt";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
  "video/webm",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Evidence() {
  const { tier, canAccess, requiredTier } = useTierGate();
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCaseId, setUploadCaseId] = useState("");
  const [uploadType, setUploadType] = useState("document");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadSourceUrl, setUploadSourceUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: cases } = trpc.cases.list.useQuery();

  const uploadMutation = trpc.upload.file.useMutation({
    onSuccess: () => {
      toast.success("Evidence uploaded successfully");
      setUploadDialogOpen(false);
      resetUploadForm();
    },
    onError: (err: any) => toast.error(`Upload failed: ${err.message}`),
  });

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle("");
    setUploadCaseId("");
    setUploadType("document");
    setUploadDescription("");
    setUploadSourceUrl("");
  };

  const handleFileSelect = useCallback((file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be under 10MB");
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
    if (!uploadFile) { toast.error("Please select a file"); return; }
    if (!uploadTitle.trim()) { toast.error("Please enter a title"); return; }
    if (!uploadCaseId) { toast.error("Please select a case"); return; }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        fileName: uploadFile.name,
        mimeType: uploadFile.type || "application/octet-stream",
        base64Data: base64,
        context: "evidence",
        caseId: parseInt(uploadCaseId),
        title: uploadTitle,
        description: uploadDescription || undefined,
        evidenceType: uploadType,
        sourceUrl: uploadSourceUrl || undefined,
      });
    };
    reader.readAsDataURL(uploadFile);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Evidence Management</h1>
            <p className="text-muted-foreground">
              Upload and manage evidence with chain of custody tracking
            </p>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Evidence
          </Button>
        </div>

        {/* Disclaimer */}
        <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10">
          <CardContent className="py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              Evidence management is for organizational purposes. For court submissions, ensure all evidence 
              meets your jurisdiction's rules of evidence and authentication requirements. Consult an attorney.
            </p>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search evidence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Evidence by Case */}
        {cases && cases.length > 0 ? (
          <div className="space-y-6">
            {cases.map((caseItem) => (
              <EvidenceByCase key={caseItem.id} caseId={caseItem.id} caseTitle={caseItem.title} searchQuery={searchQuery} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
              <Shield className="h-16 w-16 text-muted-foreground" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">No evidence yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Create a case first, then upload evidence files to it.
                </p>
              </div>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload Evidence
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Upload Evidence Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        setUploadDialogOpen(open);
        if (!open) resetUploadForm();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Evidence</DialogTitle>
            <DialogDescription>Upload files as evidence with chain of custody tracking (max 10MB)</DialogDescription>
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
                  <p className="text-sm font-medium">Drag & drop evidence files, or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOC, Images, Audio, Video</p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Case *</Label>
              <Select value={uploadCaseId} onValueChange={setUploadCaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case..." />
                </SelectTrigger>
                <SelectContent>
                  {cases?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Evidence title..."
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Evidence Type</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="photo">Photo</SelectItem>
                  <SelectItem value="screenshot">Screenshot</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio Recording</SelectItem>
                  <SelectItem value="correspondence">Correspondence</SelectItem>
                  <SelectItem value="financial">Financial Record</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Source URL (optional)</Label>
              <Input
                placeholder="https://..."
                value={uploadSourceUrl}
                onChange={(e) => setUploadSourceUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe this evidence..."
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
                  Upload Evidence
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function EvidenceByCase({ caseId, caseTitle, searchQuery }: { caseId: number; caseTitle: string; searchQuery: string }) {
  const { data: evidenceItems } = trpc.evidence.list.useQuery({ caseId });

  const filtered = evidenceItems?.filter((e: { title: string; evidenceType?: string | null }) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.evidenceType || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!filtered || filtered.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{caseTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
              <Shield className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{item.title}</h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.evidenceType && (
                    <Badge variant="outline" className="text-xs">{item.evidenceType}</Badge>
                  )}
                  {item.blockchainVerified && (
                    <Badge className="bg-green-500 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {item.fileSize && (
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(item.fileSize)}
                    </span>
                  )}
                  {item.captureMethod && (
                    <Badge variant="secondary" className="text-xs">{item.captureMethod}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {item.chainOfCustody && Array.isArray(item.chainOfCustody) && item.chainOfCustody.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Chain of custody: {item.chainOfCustody.length} event{item.chainOfCustody.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
              {item.fileUrl && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(item.fileUrl, "_blank")}>
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
