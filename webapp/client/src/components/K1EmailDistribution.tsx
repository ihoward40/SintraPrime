import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface K1EmailDistributionProps {
  trustAccountId: number;
  onComplete?: () => void;
}

export function K1EmailDistribution({ trustAccountId, onComplete }: K1EmailDistributionProps) {
  const [emailSubject, setEmailSubject] = useState("Your Schedule K-1 (Form 1041) is Ready");
  const [emailBody, setEmailBody] = useState(
    `Dear Beneficiary,

Your Schedule K-1 (Form 1041) for the current tax year is now available. This form reports your share of income, deductions, and credits from the trust.

Please review the attached PDF carefully and provide it to your tax preparer when filing your personal income tax return.

If you have any questions, please contact the trust administrator.

Best regards,
Trust Administration`
  );

  const { data: trustAccounts } = trpc.trustAccounting.getTrustAccounts.useQuery({});
  const trustAccount = trustAccounts?.find((t) => t.id === trustAccountId);

  const sendK1Email = trpc.k1Distribution.sendK1Email.useMutation({
    onSuccess: () => {
      toast.success("Schedule K-1 emails sent successfully!");
      onComplete?.();
    },
    onError: (error) => {
      toast.error(`Failed to send emails: ${error.message}`);
    },
  });

  const handleSendAll = async () => {
    if (!trustAccount) {
      toast.error("Trust account not found");
      return;
    }

    const beneficiaries = (trustAccount.metadata as any)?.beneficiaries || [];

    if (beneficiaries.length === 0) {
      toast.error("No beneficiaries found for this trust account");
      return;
    }

    await sendK1Email.mutateAsync({
      trustAccountId,
      subject: emailSubject,
      body: emailBody,
    });
  };

  const beneficiaries = trustAccount
    ? ((trustAccount.metadata as any)?.beneficiaries || [])
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Distribution Settings
          </CardTitle>
          <CardDescription>
            Configure email template for Schedule K-1 distribution to beneficiaries
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email Subject</label>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Email subject line"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email Body</label>
            <Textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Email message body"
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {beneficiaries.length} beneficiar{beneficiaries.length === 1 ? 'y' : 'ies'} will receive emails
            </div>
            <Button
              onClick={handleSendAll}
              disabled={sendK1Email.isPending || beneficiaries.length === 0}
            >
              {sendK1Email.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send to All Beneficiaries
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Beneficiary List */}
      <Card>
        <CardHeader>
          <CardTitle>Beneficiary Recipients</CardTitle>
          <CardDescription>
            Schedule K-1 will be sent to the following beneficiaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {beneficiaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No beneficiaries configured for this trust account</p>
            </div>
          ) : (
            <div className="space-y-3">
              {beneficiaries.map((beneficiary: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{beneficiary.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {beneficiary.email || "No email address"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Share: {beneficiary.share}%
                    </div>
                  </div>
                  {beneficiary.email ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Ready
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      No Email
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
