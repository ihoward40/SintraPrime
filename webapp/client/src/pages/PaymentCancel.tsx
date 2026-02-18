import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XCircle, Home, ArrowLeft, HelpCircle, FileText } from "lucide-react";

export default function PaymentCancel() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto py-16 max-w-3xl">
      {/* Cancel Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/20 mb-4">
          <XCircle className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h1 className="text-4xl font-bold mb-2">Payment Cancelled</h1>
        <p className="text-lg text-muted-foreground">
          Your payment was not completed
        </p>
      </div>

      {/* Information Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>What Happened?</CardTitle>
          <CardDescription>Your payment session was cancelled</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You have cancelled the payment process or closed the payment window before completing the transaction.
            No charges have been made to your payment method.
          </p>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="font-medium">Common reasons for cancellation:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Changed your mind about the purchase</li>
              <li>Need to review the details before proceeding</li>
              <li>Want to use a different payment method</li>
              <li>Encountered an error during checkout</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>What Would You Like to Do?</CardTitle>
          <CardDescription>Choose your next action</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full justify-start"
            variant="outline"
            size="lg"
            onClick={() => setLocation("/tax-agent")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Tax Agent & Try Again
          </Button>

          <Button
            className="w-full justify-start"
            variant="outline"
            size="lg"
            onClick={() => setLocation("/")}
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>

          <Button
            className="w-full justify-start"
            variant="outline"
            size="lg"
            asChild
          >
            <a href="https://help.manus.im" target="_blank" rel="noopener noreferrer">
              <HelpCircle className="w-4 h-4 mr-2" />
              Contact Support
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Help Information */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <strong>Need Assistance?</strong> If you encountered an error or have questions about our tax preparation services,
          our support team is here to help. You can also review our pricing and service details before making a decision.
        </AlertDescription>
      </Alert>

      {/* Payment Methods Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Accepted Payment Methods</CardTitle>
          <CardDescription>We accept the following payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="font-medium text-sm">Visa</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="font-medium text-sm">Mastercard</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="font-medium text-sm">American Express</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="font-medium text-sm">Discover</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            All payments are securely processed through Stripe
          </p>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert className="mt-6">
        <AlertDescription className="text-center">
          🔒 Your payment information is always secure and encrypted. We never store your card details.
        </AlertDescription>
      </Alert>
    </div>
  );
}
