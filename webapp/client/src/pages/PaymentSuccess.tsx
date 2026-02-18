import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Download, Home, FileText, ArrowRight } from "lucide-react";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Extract session_id from URL query parameters
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    setSessionId(sid);
  }, []);

  // Query payment details using session_id
  const { data: payment, isLoading } = trpc.stripePayment.getPaymentBySessionId.useQuery(
    { sessionId: sessionId || "" },
    { enabled: !!sessionId }
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-16 max-w-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="container mx-auto py-16 max-w-2xl">
        <Alert variant="destructive">
          <AlertDescription>
            Payment details not found. Please contact support if you believe this is an error.
          </AlertDescription>
        </Alert>
        <div className="mt-6 text-center">
          <Button onClick={() => setLocation("/")}>
            <Home className="w-4 h-4 mr-2" />
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getServiceLabel = (serviceType: string) => {
    const labels: Record<string, string> = {
      form1041_filing: "Form 1041 Filing",
      k1_preparation: "Schedule K-1 Preparation",
      tax_consultation: "Tax Consultation",
      audit_support: "Audit Support",
      full_service: "Full Service Package",
    };
    return labels[serviceType] || serviceType;
  };

  return (
    <div className="container mx-auto py-16 max-w-3xl">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
          <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-4xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-lg text-muted-foreground">
          Your payment has been processed successfully
        </p>
      </div>

      {/* Payment Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Details</CardTitle>
            <Badge variant="outline" className="bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
              {payment.status === "succeeded" ? "Paid" : payment.status}
            </Badge>
          </div>
          <CardDescription>
            Transaction ID: {payment.id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Amount Paid</p>
              <p className="text-2xl font-bold">{formatAmount(payment.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service</p>
              <p className="text-lg font-semibold">{getServiceLabel(payment.serviceType)}</p>
            </div>
          </div>

          {payment.taxYear && (
            <div>
              <p className="text-sm text-muted-foreground">Tax Year</p>
              <p className="font-medium">{payment.taxYear}</p>
            </div>
          )}

          {payment.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="font-medium">{payment.description}</p>
            </div>
          )}

          <div>
            <p className="text-sm text-muted-foreground">Payment Date</p>
            <p className="font-medium">{new Date(payment.createdAt).toLocaleString()}</p>
          </div>

          {payment.receiptUrl && (
            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full" asChild>
                <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* What's Next */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>What's Next?</CardTitle>
          <CardDescription>Your next steps after payment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <div>
              <p className="font-medium">Confirmation Email</p>
              <p className="text-sm text-muted-foreground">
                A receipt and confirmation email has been sent to your email address
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <div>
              <p className="font-medium">Processing Time</p>
              <p className="text-sm text-muted-foreground">
                Your tax preparation will begin within 1-2 business days
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <div>
              <p className="font-medium">CPA Review</p>
              <p className="text-sm text-muted-foreground">
                Your documents will be reviewed by a certified CPA before filing
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">4</span>
            </div>
            <div>
              <p className="font-medium">IRS Submission</p>
              <p className="text-sm text-muted-foreground">
                Once approved, your return will be electronically filed with the IRS
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button className="flex-1" onClick={() => setLocation("/tax-agent")}>
          <FileText className="w-4 h-4 mr-2" />
          View Tax Agent
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setLocation("/")}>
          <Home className="w-4 h-4 mr-2" />
          Return Home
        </Button>
      </div>

      {/* Support Notice */}
      <Alert className="mt-6">
        <AlertDescription>
          <strong>Need Help?</strong> If you have any questions about your payment or tax preparation,
          please contact our support team or visit the Tax Agent dashboard.
        </AlertDescription>
      </Alert>
    </div>
  );
}
