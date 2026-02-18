import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js";
import {
  CreditCard,
  DollarSign,
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Calendar,
  FileText,
} from "lucide-react";

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

interface BeneficiaryPaymentPortalProps {
  trustAccountId?: number;
}

export function BeneficiaryPaymentPortal({ trustAccountId }: BeneficiaryPaymentPortalProps) {
  // Using sonner toast
  const [serviceType, setServiceType] = useState<string>("k1_preparation");
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());
  const [amount, setAmount] = useState<number>(25000); // $250.00 in cents
  const [isProcessing, setIsProcessing] = useState(false);

  // Queries
  const { data: paymentHistory, refetch: refetchHistory } = trpc.stripePayment.getPaymentHistory.useQuery({
    limit: 50,
  });

  const { data: paymentStats } = trpc.stripePayment.getPaymentStats.useQuery();

  // Mutations
  const createCheckoutSession = trpc.stripePayment.createCheckoutSession.useMutation({
    onSuccess: async (data) => {
      toast.success("Redirecting to Stripe Checkout...");
      
      // Redirect to Stripe Checkout
      window.open(data.checkoutUrl, "_blank");
      
      setIsProcessing(false);
      refetchHistory();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsProcessing(false);
    },
  });

  const handlePayment = async () => {
    if (!serviceType || !taxYear || amount < 100) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsProcessing(true);

    try {
      await createCheckoutSession.mutateAsync({
        amount,
        trustAccountId,
        serviceType: serviceType as any,
        taxYear,
        description: `Tax Preparation Service - ${serviceType.replace(/_/g, " ")} for ${taxYear}`,
      });

      // Checkout session created and user will be redirected
    } catch (error: any) {
      console.error("Payment error:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500", icon: Clock, label: "Pending" },
      processing: { color: "bg-blue-500", icon: Clock, label: "Processing" },
      succeeded: { color: "bg-green-500", icon: CheckCircle2, label: "Succeeded" },
      failed: { color: "bg-red-500", icon: XCircle, label: "Failed" },
      canceled: { color: "bg-gray-500", icon: XCircle, label: "Canceled" },
      refunded: { color: "bg-purple-500", icon: Receipt, label: "Refunded" },
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

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const serviceTypeOptions = [
    { value: "k1_preparation", label: "Schedule K-1 Preparation", price: 25000 },
    { value: "form1041_filing", label: "Form 1041 Filing", price: 50000 },
    { value: "tax_consultation", label: "Tax Consultation", price: 15000 },
    { value: "audit_support", label: "Audit Support", price: 75000 },
    { value: "full_service", label: "Full Service Package", price: 100000 },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(paymentStats?.totalPaid || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {paymentStats?.successfulPayments || 0} successful transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(paymentStats?.totalPending || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentStats?.totalTransactions || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Make a Payment
          </CardTitle>
          <CardDescription>Pay for tax preparation services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Service Type</Label>
            <Select
              value={serviceType}
              onValueChange={(value) => {
                setServiceType(value);
                const option = serviceTypeOptions.find((o) => o.value === value);
                if (option) {
                  setAmount(option.price);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} - {formatCurrency(option.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tax Year</Label>
            <Select value={taxYear.toString()} onValueChange={(value) => setTaxYear(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select tax year" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                value={amount / 100}
                onChange={(e) => setAmount(Math.round(parseFloat(e.target.value) * 100))}
                min={1}
                step={0.01}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Amount: {formatCurrency(amount)}
            </p>
          </div>

          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pay {formatCurrency(amount)}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Secure payment powered by Stripe. Your payment information is encrypted and secure.
          </p>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>View your past transactions and receipts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentHistory?.map((payment) => (
              <Card key={payment.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(payment.status)}
                        <span className="font-semibold">
                          {payment.serviceType.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Tax Year: {payment.taxYear}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <DollarSign className="h-4 w-4" />
                          Amount: {formatCurrency(payment.amount)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4" />
                          Date: {new Date(payment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      {payment.description && (
                        <p className="text-sm mt-2">{payment.description}</p>
                      )}
                      {payment.receiptNumber && (
                        <div className="flex items-center gap-2 mt-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-mono">{payment.receiptNumber}</span>
                        </div>
                      )}
                    </div>
                    {payment.receiptUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(payment.receiptUrl!, "_blank")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Receipt
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!paymentHistory?.length && (
              <div className="text-center py-8 text-muted-foreground">
                No payment history
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
