import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

export function ModerationDashboard() {
  const [moderatorNotes, setModeratorNotes] = useState<Record<number, string>>({});
  
  const { data: flaggedReviews, refetch } = trpc.aiOS.tools.getFlaggedReviews.useQuery();
  const moderateReview = trpc.aiOS.tools.moderateReview.useMutation({
    onSuccess: () => {
      toast.success("Review moderated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to moderate review: ${error.message}`);
    },
  });

  const handleModerate = async (flagId: number, action: "approve" | "remove") => {
    await moderateReview.mutateAsync({
      flagId,
      action,
      moderatorNotes: moderatorNotes[flagId],
    });
    setModeratorNotes((prev) => {
      const updated = { ...prev };
      delete updated[flagId];
      return updated;
    });
  };

  const pendingCount = flaggedReviews?.filter(f => f.status === "pending").length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Review Moderation Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Review and moderate flagged user reviews to maintain community quality
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting moderation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Flagged</CardTitle>
              <Shield className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{flaggedReviews?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                All time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {flaggedReviews?.filter(f => f.status !== "pending").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Approved or removed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Flagged Reviews List */}
        <Card>
          <CardHeader>
            <CardTitle>Flagged Reviews</CardTitle>
            <CardDescription>
              Review flagged content and take appropriate action
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!flaggedReviews || flaggedReviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No flagged reviews</p>
                <p className="text-sm">All reviews are in good standing</p>
              </div>
            ) : (
              <div className="space-y-6">
                {flaggedReviews.map((flag) => (
                  <div
                    key={flag.id}
                    className="border rounded-lg p-6 space-y-4"
                  >
                    {/* Flag Status */}
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          flag.status === "pending"
                            ? "default"
                            : flag.status === "approved"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {flag.status}
                      </Badge>
                      {flag.flaggedAt && (
                        <span className="text-sm text-muted-foreground">
                          Flagged {new Date(flag.flaggedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Flag Reason */}
                    <div>
                      <h4 className="font-semibold mb-2">Reason for Flag:</h4>
                      <p className="text-sm text-muted-foreground">{flag.reason}</p>
                    </div>

                    {/* Review ID */}
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Review ID: {flag.reviewId}
                      </span>
                    </div>

                    {/* Moderator Notes */}
                    {flag.status === "pending" && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Moderator Notes (Optional)
                        </label>
                        <Textarea
                          placeholder="Add notes about your moderation decision..."
                          value={moderatorNotes[flag.id] || ""}
                          onChange={(e) =>
                            setModeratorNotes((prev) => ({
                              ...prev,
                              [flag.id]: e.target.value,
                            }))
                          }
                          rows={3}
                        />
                      </div>
                    )}

                    {/* Actions */}
                    {flag.status === "pending" && (
                      <div className="flex gap-3">
                        <Button
                          variant="default"
                          onClick={() => handleModerate(flag.id, "approve")}
                          disabled={moderateReview.isPending}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve Review
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleModerate(flag.id, "remove")}
                          disabled={moderateReview.isPending}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Remove Review
                        </Button>
                      </div>
                    )}

                    {/* Resolved Info */}
                    {flag.status !== "pending" && flag.moderatorNote && (
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold mb-2 text-sm">Moderator Notes:</h4>
                        <p className="text-sm text-muted-foreground">{flag.moderatorNote}</p>
                        {flag.resolvedAt && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Resolved {new Date(flag.resolvedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
