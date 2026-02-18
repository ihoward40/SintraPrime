import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export function RepairApprovalPanel() {
  const { data: pendingApprovals, refetch } = trpc.nanobot.getPendingApprovals.useQuery();
  const approveRepair = trpc.nanobot.approveRepair.useMutation();
  const rejectRepair = trpc.nanobot.rejectRepair.useMutation();

  const [selectedRepair, setSelectedRepair] = useState<any | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = async (repairId: number) => {
    try {
      await approveRepair.mutateAsync({
        repairId,
        approvedBy: "user", // TODO: Get from auth context
      });
      toast.success("Repair approved and executed");
      refetch();
    } catch (err) {
      toast.error("Failed to approve repair: " + String(err));
    }
  };

  const handleReject = async () => {
    if (!selectedRepair) return;

    try {
      await rejectRepair.mutateAsync({
        repairId: selectedRepair.id,
        rejectedBy: "user", // TODO: Get from auth context
        reason: rejectionReason,
      });
      toast.success("Repair rejected");
      setShowRejectDialog(false);
      setSelectedRepair(null);
      setRejectionReason("");
      refetch();
    } catch (err) {
      toast.error("Failed to reject repair: " + String(err));
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Low Risk</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Medium Risk</Badge>;
      case "high":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">High Risk</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!pendingApprovals || pendingApprovals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repair Approvals</CardTitle>
          <CardDescription>No pending repair approvals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-sm text-muted-foreground">
              All repairs are either automated or have been reviewed
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Repair Approvals ({pendingApprovals.length})
          </CardTitle>
          <CardDescription>
            Review and approve high-risk repairs before execution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingApprovals.map((repair: any) => (
              <div
                key={repair.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{repair.repairType}</h4>
                      {getRiskBadge(repair.metadata?.riskLevel || "unknown")}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {repair.repairDescription}
                    </p>
                  </div>
                </div>

                {repair.metadata?.requestedAt && (
                  <p className="text-xs text-muted-foreground">
                    Requested: {new Date(repair.metadata.requestedAt).toLocaleString()}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(repair.id)}
                    disabled={approveRepair.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Approve & Execute
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedRepair(repair);
                      setShowRejectDialog(true);
                    }}
                    disabled={rejectRepair.isPending}
                    className="border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Repair</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this repair (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setSelectedRepair(null);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejectRepair.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject Repair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
