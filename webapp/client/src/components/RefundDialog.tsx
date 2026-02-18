import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { DollarSign, AlertCircle } from "lucide-react";

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: number;
    amount: number;
    serviceType: string;
    taxYear: number | null;
    status: string;
  };
  onRefundComplete: () => void;
}

export function RefundDialog({
  open,
  onOpenChange,
  transaction,
  onRefundComplete,
}: RefundDialogProps) {
  const [refundType, setRefundType] = useState<"full" | "partial">("full");
  const [partialAmount, setPartialAmount] = useState<number>(0);
  const [reason, setReason] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const processRefund = trpc.stripePayment.processRefund.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Refund processed successfully! ${formatCurrency(data.amount)} will be returned to your account within 5-10 business days.`
      );
      onOpenChange(false);
      onRefundComplete();
      setIsProcessing(false);
      
      // Reset form
      setRefundType("full");
      setPartialAmount(0);
      setReason("");
    },
    onError: (error) => {
      toast.error(`Refund failed: ${error.message}`);
      setIsProcessing(false);
    },
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const handleRefund = async () => {
    if (refundType === "partial") {
      if (partialAmount <= 0 || partialAmount > transaction.amount) {
        toast.error("Invalid refund amount");
        return;
      }
    }

    setIsProcessing(true);

    await processRefund.mutateAsync({
      transactionId: transaction.id,
      amount: refundType === "full" ? undefined : partialAmount,
      reason: reason || undefined,
    });
  };

  const refundAmount = refundType === "full" ? transaction.amount : partialAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Refund payment for transaction #{transaction.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Transaction Info */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Original Amount:</span>
              <span className="font-semibold">{formatCurrency(transaction.amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service:</span>
              <span className="font-medium">
                {transaction.serviceType.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
            {transaction.taxYear && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax Year:</span>
                <span className="font-medium">{transaction.taxYear}</span>
              </div>
            )}
          </div>

          {/* Refund Type */}
          <div className="space-y-3">
            <Label>Refund Type</Label>
            <RadioGroup value={refundType} onValueChange={(value: any) => setRefundType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="font-normal cursor-pointer">
                  Full Refund ({formatCurrency(transaction.amount)})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="font-normal cursor-pointer">
                  Partial Refund
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Partial Amount Input */}
          {refundType === "partial" && (
            <div className="space-y-2">
              <Label htmlFor="amount">Refund Amount</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  value={partialAmount / 100}
                  onChange={(e) =>
                    setPartialAmount(Math.round(parseFloat(e.target.value || "0") * 100))
                  }
                  min={0.01}
                  max={transaction.amount / 100}
                  step={0.01}
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum: {formatCurrency(transaction.amount)}
              </p>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you're requesting this refund..."
              rows={3}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium">Refund Processing Time</p>
              <p className="mt-1">
                Refunds typically appear in your account within 5-10 business days, depending on
                your bank or card issuer.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRefund}
            disabled={isProcessing || (refundType === "partial" && partialAmount <= 0)}
          >
            {isProcessing ? "Processing..." : `Refund ${formatCurrency(refundAmount)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
