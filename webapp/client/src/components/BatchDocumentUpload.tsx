import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface UploadFile {
  id: string;
  file: File;
  documentType: string;
  status: "pending" | "uploading" | "processing" | "success" | "error";
  progress: number;
  error?: string;
  taxDocumentId?: number;
}

interface BatchDocumentUploadProps {
  onComplete?: () => void;
}

export function BatchDocumentUpload({ onComplete }: BatchDocumentUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const uploadFile = trpc.upload.file.useMutation();
  const processDocument = trpc.documentProcessing.uploadAndProcessDocument.useMutation();

  const detectDocumentType = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes("w-2") || lower.includes("w2")) return "W-2";
    if (lower.includes("1099")) {
      if (lower.includes("int")) return "1099-INT";
      if (lower.includes("div")) return "1099-DIV";
      if (lower.includes("b")) return "1099-B";
      if (lower.includes("r")) return "1099-R";
      return "1099-MISC";
    }
    if (lower.includes("k-1") || lower.includes("k1")) return "Schedule K-1";
    return "Unknown";
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = Array.from(selectedFiles).map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      documentType: detectDocumentType(file.name),
      status: "pending",
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

  const updateFileStatus = (id: string, updates: Partial<UploadFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadSingleFile = async (fileItem: UploadFile) => {
    try {
      updateFileStatus(fileItem.id, { status: "uploading", progress: 30 });

      // Convert file to base64
      const arrayBuffer = await fileItem.file.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      // Upload file to S3
      const uploadResult = await uploadFile.mutateAsync({
        fileName: fileItem.file.name,
        mimeType: fileItem.file.type,
        base64Data,
        context: "document" as const,
        documentType: fileItem.documentType,
      });

      updateFileStatus(fileItem.id, { status: "processing", progress: 60 });

      // Process document with OCR
      const processResult = await processDocument.mutateAsync({
        fileName: fileItem.file.name,
        mimeType: fileItem.file.type,
        base64Data,
        documentType: fileItem.documentType,
        taxYear: new Date().getFullYear(),
      });

      updateFileStatus(fileItem.id, {
        status: "success",
        progress: 100,
        taxDocumentId: processResult.taxDocumentId,
      });

      return { success: true };
    } catch (error: any) {
      updateFileStatus(fileItem.id, {
        status: "error",
        progress: 0,
        error: error.message || "Upload failed",
      });
      return { success: false, error: error.message };
    }
  };

  const handleUploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending" || f.status === "error");
    
    if (pendingFiles.length === 0) {
      toast.info("No files to upload");
      return;
    }

    toast.info(`Uploading ${pendingFiles.length} documents...`);

    // Upload files in parallel (max 3 at a time)
    const batchSize = 3;
    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      const batch = pendingFiles.slice(i, i + batchSize);
      await Promise.all(batch.map((file) => uploadSingleFile(file)));
    }

    const successCount = files.filter((f) => f.status === "success").length;
    const errorCount = files.filter((f) => f.status === "error").length;

    if (errorCount === 0) {
      toast.success(`All ${successCount} documents uploaded successfully`);
      if (onComplete) onComplete();
    } else {
      toast.warning(`${successCount} succeeded, ${errorCount} failed`);
    }
  };

  const handleRetry = (id: string) => {
    const file = files.find((f) => f.id === id);
    if (file) {
      updateFileStatus(id, { status: "pending", progress: 0, error: undefined });
      uploadSingleFile(file);
    }
  };

  const getStatusIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "pending":
        return <FileText className="w-4 h-4 text-muted-foreground" />;
      case "uploading":
      case "processing":
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: UploadFile["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "uploading":
        return <Badge variant="secondary">Uploading</Badge>;
      case "processing":
        return <Badge variant="secondary">Processing</Badge>;
      case "success":
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  const totalFiles = files.length;
  const successFiles = files.filter((f) => f.status === "success").length;
  const errorFiles = files.filter((f) => f.status === "error").length;
  const processingFiles = files.filter((f) => f.status === "uploading" || f.status === "processing").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Document Upload</CardTitle>
        <CardDescription>Upload multiple tax documents at once for automatic processing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Drag and drop files here</p>
          <p className="text-sm text-muted-foreground mb-4">
            or click to browse (PDF, JPEG, PNG)
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="file-input"
          />
          <Button asChild variant="outline">
            <label htmlFor="file-input" className="cursor-pointer">
              Select Files
            </label>
          </Button>
        </div>

        {/* Summary Stats */}
        {totalFiles > 0 && (
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{totalFiles}</div>
                <p className="text-xs text-muted-foreground">Total Files</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-500">{successFiles}</div>
                <p className="text-xs text-muted-foreground">Successful</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-500">{errorFiles}</div>
                <p className="text-xs text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-500">{processingFiles}</div>
                <p className="text-xs text-muted-foreground">Processing</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Files ({files.length})</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFiles([])}
                  disabled={processingFiles > 0}
                >
                  Clear All
                </Button>
                <Button
                  size="sm"
                  onClick={handleUploadAll}
                  disabled={processingFiles > 0 || files.every((f) => f.status === "success")}
                >
                  Upload All
                </Button>
              </div>
            </div>

            {files.map((file) => (
              <Card key={file.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(file.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{file.file.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {file.documentType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {(file.file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {getStatusBadge(file.status)}
                          {file.status === "error" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetry(file.id)}
                            >
                              Retry
                            </Button>
                          )}
                          {(file.status === "pending" || file.status === "error") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeFile(file.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {(file.status === "uploading" || file.status === "processing") && (
                        <div className="space-y-1">
                          <Progress value={file.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground">
                            {file.status === "uploading" ? "Uploading..." : "Processing with OCR..."}
                          </p>
                        </div>
                      )}

                      {file.error && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-red-600 dark:text-red-400">{file.error}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {files.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No files selected. Drag and drop or click to select files.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
