import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, XCircle, Clock, DollarSign, CheckSquare, Square } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export default function ApprovalWorkflow() {
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequests, setSelectedRequests] = useState<Set<number>>(new Set());
  const [bulkComment, setBulkComment] = useState('');

  // Fetch approval requests
  const { data: requests, isLoading, refetch } = trpc.approvals.list.useQuery({ status: filter === 'all' ? undefined : filter });

  // Approve/reject mutations
  const approveMutation = trpc.approvals.approve.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedRequest(null);
      setReviewComment('');
    },
  });

  const rejectMutation = trpc.approvals.reject.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedRequest(null);
      setReviewComment('');
    },
  });

  const bulkApproveMutation = trpc.approvals.bulkApprove.useMutation({
    onSuccess: (result) => {
      refetch();
      setSelectedRequests(new Set());
      setBulkComment('');
      alert(`Bulk Approve Complete:\n${result.successCount} approved, ${result.failureCount} failed`);
    },
  });

  const bulkRejectMutation = trpc.approvals.bulkReject.useMutation({
    onSuccess: (result) => {
      refetch();
      setSelectedRequests(new Set());
      setBulkComment('');
      alert(`Bulk Reject Complete:\n${result.successCount} rejected, ${result.failureCount} failed`);
    },
  });

  const handleApprove = (requestId: number) => {
    approveMutation.mutate({ requestId, comment: reviewComment });
  };

  const handleReject = (requestId: number) => {
    if (!reviewComment.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    rejectMutation.mutate({ requestId, comment: reviewComment });
  };

  const handleBulkApprove = () => {
    if (selectedRequests.size === 0) {
      alert('Please select at least one request');
      return;
    }
    if (!confirm(`Are you sure you want to approve ${selectedRequests.size} request(s)?`)) {
      return;
    }
    bulkApproveMutation.mutate({
      requestIds: Array.from(selectedRequests),
      comment: bulkComment || undefined,
    });
  };

  const handleBulkReject = () => {
    if (selectedRequests.size === 0) {
      alert('Please select at least one request');
      return;
    }
    if (!bulkComment.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    if (!confirm(`Are you sure you want to reject ${selectedRequests.size} request(s)?`)) {
      return;
    }
    bulkRejectMutation.mutate({
      requestIds: Array.from(selectedRequests),
      comment: bulkComment,
    });
  };

  const toggleSelectAll = () => {
    if (!requests) return;
    const pendingRequests = requests.filter(r => r.status === 'pending');
    if (selectedRequests.size === pendingRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(pendingRequests.map(r => r.id)));
    }
  };

  const toggleSelect = (requestId: number) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Approval Workflow</h1>
        <p className="text-muted-foreground">
          Review and approve/reject high-risk operations flagged by policy gates
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All Requests
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          Pending
        </Button>
        <Button
          variant={filter === 'approved' ? 'default' : 'outline'}
          onClick={() => setFilter('approved')}
        >
          Approved
        </Button>
        <Button
          variant={filter === 'rejected' ? 'default' : 'outline'}
          onClick={() => setFilter('rejected')}
        >
          Rejected
        </Button>
      </div>

      {/* Bulk Actions Toolbar */}
      {filter === 'pending' && requests && requests.length > 0 && (
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedRequests.size > 0 && selectedRequests.size === requests.filter(r => r.status === 'pending').length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">
                  {selectedRequests.size > 0 ? `${selectedRequests.size} selected` : 'Select All'}
                </span>
              </div>
              
              {selectedRequests.size > 0 && (
                <>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Optional comment for bulk action..."
                      value={bulkComment}
                      onChange={(e) => setBulkComment(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBulkApprove}
                      disabled={bulkApproveMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Bulk Approve ({selectedRequests.size})
                    </Button>
                    <Button
                      onClick={handleBulkReject}
                      disabled={bulkRejectMutation.isPending}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Bulk Reject ({selectedRequests.size})
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests list */}
      <div className="grid gap-4">
        {!requests || requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No approval requests found</p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} className={selectedRequest === request.id ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  {request.status === 'pending' && (
                    <div className="mr-3 pt-1">
                      <Checkbox
                        checked={selectedRequests.has(request.id)}
                        onCheckedChange={() => toggleSelect(request.id)}
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(request.status)}
                      <CardTitle className="text-lg">{request.action}</CardTitle>
                      <Badge className={getPriorityColor(request.priority)}>
                        {request.priority}
                      </Badge>
                      <Badge variant="outline">{request.requestType}</Badge>
                    </div>
                    <CardDescription>
                      Requested by User #{request.requestedBy} on{' '}
                      {new Date(request.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  {request.estimatedCost && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      ${(request.estimatedCost / 100).toFixed(2)}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-1">Justification:</h4>
                    <p className="text-sm text-muted-foreground">{request.justification}</p>
                  </div>

                  {request.metadata && Object.keys(request.metadata as object).length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-1">Additional Context:</h4>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(request.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="space-y-3 border-t pt-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Review Comment:</label>
                        <Textarea
                          value={selectedRequest === request.id ? reviewComment : ''}
                          onChange={(e) => {
                            setSelectedRequest(request.id);
                            setReviewComment(e.target.value);
                          }}
                          placeholder="Enter your review comments..."
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApprove(request.id)}
                          disabled={approveMutation.isPending}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReject(request.id)}
                          disabled={rejectMutation.isPending}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {request.status !== 'pending' && request.reviewComment && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-1">Review Comment:</h4>
                      <p className="text-sm text-muted-foreground">{request.reviewComment}</p>
                      {request.reviewedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Reviewed on {new Date(request.reviewedAt).toLocaleString()}
                          {request.reviewedBy && ` by User #${request.reviewedBy}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
