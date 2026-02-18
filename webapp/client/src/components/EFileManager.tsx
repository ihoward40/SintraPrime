import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Send, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function EFileManager() {
  const [submissions, setSubmissions] = useState([
    {
      id: 1,
      trustName: "Smith Family Trust",
      taxYear: 2025,
      formType: "Form 1041",
      status: "pending",
      submittedAt: new Date("2026-02-10T10:00:00"),
      acknowledgmentId: null,
      rejectionReason: null,
    },
    {
      id: 2,
      trustName: "Johnson Irrevocable Trust",
      taxYear: 2025,
      formType: "Form 1041",
      status: "accepted",
      submittedAt: new Date("2026-02-08T14:30:00"),
      acknowledgmentId: "ACK-2026-001234",
      rejectionReason: null,
    },
    {
      id: 3,
      trustName: "Williams Estate",
      taxYear: 2025,
      formType: "Form 1041",
      status: "rejected",
      submittedAt: new Date("2026-02-05T09:15:00"),
      acknowledgmentId: "REJ-2026-005678",
      rejectionReason: "Missing beneficiary SSN on Schedule K-1",
    },
  ]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      submitted: "bg-blue-100 text-blue-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "accepted":
        return <CheckCircle2 className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const handleSubmitReturn = () => {
    toast.info("E-file submission feature is in development. This will connect to IRS MeF system.");
  };

  const handleCheckStatus = (submissionId: number) => {
    toast.info(`Checking status for submission ${submissionId}...`);
    // In production, this would poll the IRS e-file system
  };

  const handleResubmit = (submissionId: number) => {
    toast.info(`Resubmitting return ${submissionId} after corrections...`);
    // In production, this would resubmit the corrected return
  };

  return (
    <div className="space-y-6">
      {/* Warning Alert */}
      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          <strong>IRS E-File Integration:</strong> This feature requires official IRS Modernized e-File (MeF) credentials
          and is currently in development. The interface below demonstrates the planned workflow.
        </AlertDescription>
      </Alert>

      {/* Submit New Return */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Submit New Return
          </CardTitle>
          <CardDescription>
            E-file Form 1041 directly to the IRS Modernized e-File system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSubmitReturn} className="w-full">
            <Send className="w-4 h-4 mr-2" />
            Submit Form 1041 to IRS
          </Button>
        </CardContent>
      </Card>

      {/* Submission History */}
      <Card>
        <CardHeader>
          <CardTitle>E-File Submission History</CardTitle>
          <CardDescription>
            Track the status of your IRS e-file submissions and acknowledgments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{submission.trustName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {submission.formType} - Tax Year {submission.taxYear}
                      </p>
                    </div>
                    <Badge className={getStatusColor(submission.status)}>
                      {getStatusIcon(submission.status)}
                      <span className="ml-1 capitalize">{submission.status}</span>
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Submitted:</span>
                      <span className="ml-2">{submission.submittedAt.toLocaleDateString()}</span>
                    </div>
                    {submission.acknowledgmentId && (
                      <div>
                        <span className="text-muted-foreground">Acknowledgment ID:</span>
                        <span className="ml-2 font-mono text-xs">{submission.acknowledgmentId}</span>
                      </div>
                    )}
                  </div>

                  {/* Rejection Reason */}
                  {submission.status === "rejected" && submission.rejectionReason && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <strong>Rejection Reason:</strong> {submission.rejectionReason}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {submission.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCheckStatus(submission.id)}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Check Status
                      </Button>
                    )}
                    {submission.status === "rejected" && (
                      <Button
                        size="sm"
                        onClick={() => handleResubmit(submission.id)}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Resubmit
                      </Button>
                    )}
                    {submission.status === "accepted" && (
                      <Button size="sm" variant="outline" disabled>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Accepted by IRS
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* E-File Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>IRS MeF Requirements</CardTitle>
          <CardDescription>
            Prerequisites for electronic filing with the IRS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              <span>IRS-approved Electronic Return Originator (ERO) credentials</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Modernized e-File (MeF) system access</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Valid Electronic Filing Identification Number (EFIN)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              <span>XML schema validation for Form 1041</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Secure transmission via IRS-approved gateway</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
