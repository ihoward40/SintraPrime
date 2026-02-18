import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { AlertCircle, FileText, Upload, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

type DisputeStatus = "needs_response" | "under_review" | "won" | "lost";

export function DisputeManagement() {
  const [selectedStatus, setSelectedStatus] = useState<DisputeStatus | "all">("all");
  const [selectedDispute, setSelectedDispute] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [showResponseDialog, setShowResponseDialog] = useState(false);

  const { data: allDisputes, isLoading, refetch } = trpc.disputeManagement.getDisputes.useQuery();
  
  // Filter disputes client-side
  const disputes = allDisputes?.filter((dispute: any) => 
    selectedStatus === "all" || dispute.status === selectedStatus
  );

  const submitResponse = trpc.disputeManagement.submitEvidence.useMutation({
    onSuccess: () => {
      toast.success("Dispute response submitted successfully");
      setShowResponseDialog(false);
      setResponseText("");
      setEvidenceFiles([]);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to submit response: ${error.message}`);
    },
  });

  const getStatusBadge = (status: DisputeStatus) => {
    const variants: Record<DisputeStatus, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      needs_response: { variant: "destructive", icon: <AlertCircle className="h-3 w-3 mr-1" /> },
      under_review: { variant: "secondary", icon: <Clock className="h-3 w-3 mr-1" /> },
      won: { variant: "default", icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      lost: { variant: "outline", icon: <XCircle className="h-3 w-3 mr-1" /> },
    };

    const { variant, icon } = variants[status];
    return (
      <Badge variant={variant} className="flex items-center w-fit">
        {icon}
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setEvidenceFiles(Array.from(e.target.files));
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedDispute) return;

    // In a real implementation, you would upload files to S3 first
    // For now, we'll just submit the text response
    await submitResponse.mutateAsync({
      disputeId: selectedDispute,
      evidence: {
        customerCommunication: responseText,
        // Add file URLs here after uploading to S3
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dispute Management</h2>
          <p className="text-muted-foreground">
            Manage chargebacks and payment disputes
          </p>
        </div>
        <Select
          value={selectedStatus}
          onValueChange={(value) => setSelectedStatus(value as DisputeStatus | "all")}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Disputes</SelectItem>
            <SelectItem value="needs_response">Needs Response</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Disputes List */}
      {disputes && disputes.length > 0 ? (
        <div className="grid gap-4">
          {disputes.map((dispute: any) => (
            <Card key={dispute.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      Dispute #{dispute.id}
                      {getStatusBadge(dispute.status)}
                    </CardTitle>
                    <CardDescription>
                      Stripe ID: {dispute.stripeDisputeId}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(dispute.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dispute.currency.toUpperCase()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Reason</p>
                    <p className="font-medium capitalize">
                      {dispute.reason.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {new Date(dispute.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Due Date</p>
                    <p className="font-medium">
                      {dispute.dueBy
                        ? new Date(dispute.dueBy).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Evidence Submitted</p>
                    <p className="font-medium">
                      {dispute.evidenceSubmitted ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                {dispute.status === "needs_response" && (
                  <Button
                    onClick={() => {
                      setSelectedDispute(dispute.id);
                      setShowResponseDialog(true);
                    }}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Submit Response
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-2">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <p className="text-lg font-medium">No disputes found</p>
              <p className="text-muted-foreground">
                {selectedStatus === "all"
                  ? "You don't have any payment disputes"
                  : `No disputes with status "${selectedStatus.replace("_", " ")}"`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Dispute Response</DialogTitle>
            <DialogDescription>
              Provide evidence and explanation to challenge this dispute
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="response">Response Explanation</Label>
              <Textarea
                id="response"
                placeholder="Explain why this dispute should be resolved in your favor. Include details about the transaction, customer communication, and any relevant context..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="evidence">Supporting Evidence</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <Input
                  id="evidence"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="evidence"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Click to upload files</p>
                    <p className="text-sm text-muted-foreground">
                      PDFs, images, receipts, communication logs
                    </p>
                  </div>
                </label>
              </div>
              {evidenceFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected files:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {evidenceFiles.map((file, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResponseDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitResponse}
              disabled={!responseText.trim() || submitResponse.isPending}
            >
              {submitResponse.isPending ? "Submitting..." : "Submit Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
