import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  FileCheck,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Send,
  Trash2,
  CheckCheck,
  User,
  Calendar,
} from "lucide-react";

interface CPACollaborationHubProps {
  trustAccountId?: number;
}

export function CPACollaborationHub({ trustAccountId }: CPACollaborationHubProps) {
  // Using sonner toast
  const [selectedReview, setSelectedReview] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [approvalSignature, setApprovalSignature] = useState("");

  // Queries
  const { data: trustReviews, refetch: refetchTrustReviews } = trpc.cpaCollaboration.getTrustReviews.useQuery(
    { trustAccountId: trustAccountId! },
    { enabled: !!trustAccountId }
  );

  const { data: pendingReviews, refetch: refetchPending } = trpc.cpaCollaboration.getReviewsByStatus.useQuery({
    status: "pending",
  });

  const { data: inReviewReviews, refetch: refetchInReview } = trpc.cpaCollaboration.getReviewsByStatus.useQuery({
    status: "in_review",
  });

  const { data: reviewStats } = trpc.cpaCollaboration.getReviewStats.useQuery();

  const { data: selectedReviewData } = trpc.cpaCollaboration.getReviewById.useQuery(
    { id: selectedReview! },
    { enabled: !!selectedReview }
  );

  const { data: comments, refetch: refetchComments } = trpc.cpaCollaboration.getComments.useQuery(
    { reviewId: selectedReview! },
    { enabled: !!selectedReview }
  );

  // Mutations
  const submitForReview = trpc.cpaCollaboration.submitForReview.useMutation({
    onSuccess: () => {
      toast.success("Return submitted for CPA review");
      refetchTrustReviews();
      refetchPending();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const startReview = trpc.cpaCollaboration.startReview.useMutation({
    onSuccess: () => {
      toast.success("Review started");
      refetchPending();
      refetchInReview();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const approveReview = trpc.cpaCollaboration.approveReview.useMutation({
    onSuccess: () => {
      toast.success("Return approved");
      refetchInReview();
      setSelectedReview(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const requestChanges = trpc.cpaCollaboration.requestChanges.useMutation({
    onSuccess: () => {
      toast.success("Changes requested");
      refetchInReview();
      setSelectedReview(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addComment = trpc.cpaCollaboration.addComment.useMutation({
    onSuccess: () => {
      toast.success("Comment added");
      refetchComments();
      setCommentText("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resolveComment = trpc.cpaCollaboration.resolveComment.useMutation({
    onSuccess: () => {
      toast.success("Comment resolved");
      refetchComments();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500", icon: Clock, label: "Pending" },
      in_review: { color: "bg-blue-500", icon: FileCheck, label: "In Review" },
      changes_requested: { color: "bg-orange-500", icon: AlertCircle, label: "Changes Requested" },
      approved: { color: "bg-green-500", icon: CheckCircle2, label: "Approved" },
      rejected: { color: "bg-red-500", icon: XCircle, label: "Rejected" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const handleApprove = () => {
    if (!selectedReview || !approvalSignature) {
      toast.error("Signature required");
      return;
    }

    approveReview.mutate({
      reviewId: selectedReview,
      reviewNotes,
      approvalSignature,
    });
  };

  const handleRequestChanges = () => {
    if (!selectedReview || !reviewNotes) {
      toast.error("Review notes required");
      return;
    }

    requestChanges.mutate({
      reviewId: selectedReview,
      reviewNotes,
      changesRequested: [
        {
          field: "general",
          issue: reviewNotes,
          suggestion: "Please review and address the issues noted",
          priority: "medium",
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewStats?.pending || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewStats?.inReview || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Changes Requested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewStats?.changesRequested || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{reviewStats?.approved || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewStats?.total || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending ({reviewStats?.pending || 0})</TabsTrigger>
          <TabsTrigger value="in_review">In Review ({reviewStats?.inReview || 0})</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
              <CardDescription>Returns waiting for CPA review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingReviews?.map((review) => (
                  <Card key={review.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(review.status)}
                            <span className="font-semibold">
                              {review.reviewType.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Tax Year: {review.taxYear}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-4 w-4" />
                              Submitted: {new Date(review.submittedAt).toLocaleDateString()}
                            </div>
                          </div>
                          {review.submissionNotes && (
                            <p className="text-sm mt-2">{review.submissionNotes}</p>
                          )}
                        </div>
                        <Button
                          onClick={() => {
                            startReview.mutate({ reviewId: review.id });
                            setSelectedReview(review.id);
                          }}
                        >
                          Start Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!pendingReviews?.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending reviews
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in_review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>In Review</CardTitle>
              <CardDescription>Returns currently being reviewed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inReviewReviews?.map((review) => (
                  <Card key={review.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(review.status)}
                            <span className="font-semibold">
                              {review.reviewType.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Tax Year: {review.taxYear}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="h-4 w-4" />
                              Started: {review.reviewStartedAt ? new Date(review.reviewStartedAt).toLocaleDateString() : "N/A"}
                            </div>
                          </div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button onClick={() => setSelectedReview(review.id)}>
                              Review Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Review: {review.reviewType.replace(/_/g, " ")}</DialogTitle>
                              <DialogDescription>
                                Tax Year {review.taxYear} - Trust Account ID: {review.trustAccountId}
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6">
                              {/* Comments Section */}
                              <div>
                                <h3 className="text-lg font-semibold mb-4">Comments & Discussion</h3>
                                <ScrollArea className="h-[300px] border rounded-lg p-4">
                                  <div className="space-y-4">
                                    {comments?.map((comment) => (
                                      <Card key={comment.id} className={comment.isResolved ? "opacity-60" : ""}>
                                        <CardContent className="pt-4">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-2">
                                                <User className="h-4 w-4" />
                                                <span className="font-semibold text-sm">User {comment.userId}</span>
                                                <Badge variant="outline">{comment.commentType}</Badge>
                                                {comment.isResolved && (
                                                  <Badge className="bg-green-500 text-white">
                                                    <CheckCheck className="h-3 w-3 mr-1" />
                                                    Resolved
                                                  </Badge>
                                                )}
                                              </div>
                                              <p className="text-sm">{comment.commentText}</p>
                                              <p className="text-xs text-muted-foreground mt-2">
                                                {new Date(comment.createdAt).toLocaleString()}
                                              </p>
                                            </div>
                                            {!comment.isResolved && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => resolveComment.mutate({ commentId: comment.id })}
                                              >
                                                <CheckCheck className="h-4 w-4" />
                                              </Button>
                                            )}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                </ScrollArea>

                                <div className="mt-4 space-y-2">
                                  <Label>Add Comment</Label>
                                  <div className="flex gap-2">
                                    <Textarea
                                      value={commentText}
                                      onChange={(e) => setCommentText(e.target.value)}
                                      placeholder="Add a comment or question..."
                                      className="flex-1"
                                    />
                                    <Button
                                      onClick={() => {
                                        if (selectedReview && commentText) {
                                          addComment.mutate({
                                            reviewId: selectedReview,
                                            commentText,
                                            commentType: "general",
                                          });
                                        }
                                      }}
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              <Separator />

                              {/* Review Actions */}
                              <div className="space-y-4">
                                <div>
                                  <Label>Review Notes</Label>
                                  <Textarea
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    placeholder="Enter your review notes..."
                                    className="mt-2"
                                  />
                                </div>

                                <div>
                                  <Label>Digital Signature (for approval)</Label>
                                  <Input
                                    value={approvalSignature}
                                    onChange={(e) => setApprovalSignature(e.target.value)}
                                    placeholder="Enter your full name as digital signature"
                                    className="mt-2"
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    onClick={handleApprove}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    disabled={!approvalSignature}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Approve Return
                                  </Button>
                                  <Button
                                    onClick={handleRequestChanges}
                                    variant="outline"
                                    className="flex-1"
                                    disabled={!reviewNotes}
                                  >
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    Request Changes
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {!inReviewReviews?.length && (
                  <div className="text-center py-8 text-muted-foreground">
                    No reviews in progress
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Reviews</CardTitle>
              <CardDescription>Approved and rejected returns</CardDescription>
            </CardHeader>
            <CardContent>
              {trustAccountId && trustReviews ? (
                <div className="space-y-4">
                  {trustReviews
                    .filter((r) => r.status === "approved" || r.status === "rejected")
                    .map((review) => (
                      <Card key={review.id} className={`border-l-4 ${review.status === "approved" ? "border-l-green-500" : "border-l-red-500"}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                {getStatusBadge(review.status)}
                                <span className="font-semibold">
                                  {review.reviewType.replace(/_/g, " ").toUpperCase()}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Tax Year: {review.taxYear}
                              </div>
                              {review.reviewNotes && (
                                <p className="text-sm mt-2">{review.reviewNotes}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a trust account to view completed reviews
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
