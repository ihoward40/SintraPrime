import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, CheckCircle2, XCircle, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface ReceiptVerificationModalProps {
  receipt: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReceiptVerificationModal({ receipt, isOpen, onClose }: ReceiptVerificationModalProps) {
  // Verify receipt cryptographically
  const { data: verification, isLoading } = trpc.governance.verifyReceipt.useQuery(
    { receiptId: receipt?.receipt_id },
    { enabled: isOpen && !!receipt }
  );

  if (!receipt) return null;

  const getVerificationIcon = (status: boolean | undefined) => {
    if (status === undefined) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return status ? (
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  const getVerificationBadge = (status: boolean | undefined) => {
    if (status === undefined) return <Badge variant="secondary">Checking...</Badge>;
    return status ? (
      <Badge className="bg-green-100 text-green-800">Verified</Badge>
    ) : (
      <Badge variant="destructive">Failed</Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Cryptographic Receipt Verification
          </DialogTitle>
          <DialogDescription>
            Verify the integrity and authenticity of this governance receipt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Receipt Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Receipt Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Receipt ID:</span>
                <p className="font-mono text-xs break-all">{receipt.receipt_id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Timestamp:</span>
                <p>{new Date(receipt.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Action:</span>
                <p>{receipt.action}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Actor:</span>
                <p>{receipt.actor}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Verification Status */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Verifying receipt...
            </div>
          ) : verification ? (
            <>
              {/* Overall Status */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getVerificationIcon(verification.isValid)}
                  <div>
                    <p className="font-semibold">Overall Verification Status</p>
                    <p className="text-sm text-muted-foreground">
                      {verification.isValid
                        ? 'All cryptographic checks passed'
                        : 'One or more verification checks failed'}
                    </p>
                  </div>
                </div>
                {getVerificationBadge(verification.isValid)}
              </div>

              {/* Hash Verification */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    Hash Verification
                    {getVerificationIcon(verification.hashValid)}
                  </h3>
                  {getVerificationBadge(verification.hashValid)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Expected Hash:</span>
                    <p className="font-mono text-xs break-all mt-1">{verification.expectedHash}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Actual Hash:</span>
                    <p className="font-mono text-xs break-all mt-1">{verification.actualHash}</p>
                  </div>
                  {verification.hashValid && (
                    <p className="text-green-600 text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Hashes match - receipt data has not been tampered with
                    </p>
                  )}
                  {!verification.hashValid && (
                    <p className="text-red-600 text-xs flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Hash mismatch detected - possible data tampering
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Signature Verification */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    Digital Signature
                    {getVerificationIcon(verification.signatureValid)}
                  </h3>
                  {getVerificationBadge(verification.signatureValid)}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-muted/30 rounded">
                    <span className="text-muted-foreground">Signature:</span>
                    <p className="font-mono text-xs break-all mt-1">
                      {receipt.signature || 'No signature present'}
                    </p>
                  </div>
                  {verification.signatureValid && (
                    <p className="text-green-600 text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Valid HMAC-SHA256 signature - receipt authenticity confirmed
                    </p>
                  )}
                  {!verification.signatureValid && receipt.signature && (
                    <p className="text-red-600 text-xs flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Invalid signature - authenticity cannot be verified
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Chain Integrity */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    Chain Integrity
                    {getVerificationIcon(verification.chainValid)}
                  </h3>
                  {getVerificationBadge(verification.chainValid)}
                </div>
                <div className="space-y-2 text-sm">
                  {receipt.previous_hash ? (
                    <>
                      <div className="p-3 bg-muted/30 rounded">
                        <span className="text-muted-foreground">Previous Receipt Hash:</span>
                        <p className="font-mono text-xs break-all mt-1">{receipt.previous_hash}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <LinkIcon className="h-3 w-3" />
                        <span>Linked to previous receipt in chain</span>
                      </div>
                      {verification.chainValid && (
                        <p className="text-green-600 text-xs flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Chain link verified - receipt is part of unbroken audit trail
                        </p>
                      )}
                      {!verification.chainValid && (
                        <p className="text-red-600 text-xs flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Chain link broken - audit trail integrity compromised
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      This is the genesis receipt (first in chain)
                    </p>
                  )}
                </div>
              </div>

              {/* Evidence Hash */}
              {receipt.evidence_hash && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Evidence Hash</h3>
                    <div className="p-3 bg-muted/30 rounded text-sm">
                      <span className="text-muted-foreground">SHA-256 Hash:</span>
                      <p className="font-mono text-xs break-all mt-1">{receipt.evidence_hash}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Evidence data is cryptographically hashed for tamper detection
                    </p>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Unable to verify receipt
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
