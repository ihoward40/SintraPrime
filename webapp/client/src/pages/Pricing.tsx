import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, Zap, Users, Building2, AlertTriangle, ExternalLink, CreditCard, Receipt } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const TIERS = [
  {
    key: "free" as const,
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with basic legal tools",
    icon: Zap,
    popular: false,
    features: [
      { name: "Up to 2 active cases", included: true },
      { name: "Basic document templates (4)", included: true },
      { name: "AI Companion (10 messages/day)", included: true },
      { name: "Deadline calculator", included: true },
      { name: "Evidence management (50MB storage)", included: true },
      { name: "File uploads", included: false },
      { name: "Quantum Workspace", included: false },
      { name: "Warfare Strategy Planner", included: false },
      { name: "Coalition collaboration", included: false },
      { name: "Legal Alerts", included: false },
      { name: "Priority support", included: false },
    ],
  },
  {
    key: "pro" as const,
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "Full access for individual legal warriors",
    icon: Star,
    popular: true,
    features: [
      { name: "Unlimited active cases", included: true },
      { name: "All document templates", included: true },
      { name: "AI Companion (unlimited)", included: true },
      { name: "Deadline calculator", included: true },
      { name: "Evidence management (5GB storage)", included: true },
      { name: "File uploads (PDF, DOC, images)", included: true },
      { name: "Quantum Workspace", included: true },
      { name: "7-Front Warfare Strategy Planner", included: true },
      { name: "Coalition collaboration", included: false },
      { name: "Legal Alerts (10/month)", included: true },
      { name: "Email support", included: true },
    ],
  },
  {
    key: "coalition" as const,
    name: "Coalition",
    price: "$79",
    period: "/month",
    description: "Team collaboration for class actions and groups",
    icon: Users,
    popular: false,
    features: [
      { name: "Everything in Pro", included: true },
      { name: "Up to 10 team members", included: true },
      { name: "Coalition workspace", included: true },
      { name: "Shared case management", included: true },
      { name: "Evidence management (25GB storage)", included: true },
      { name: "Real-time collaboration", included: true },
      { name: "Quantum Workspace (shared)", included: true },
      { name: "7-Front Warfare Strategy Planner", included: true },
      { name: "Unlimited Legal Alerts", included: true },
      { name: "Task assignment & tracking", included: true },
      { name: "Priority support", included: true },
    ],
  },
  {
    key: "enterprise" as const,
    name: "Enterprise",
    price: "$199",
    period: "/month",
    description: "For law firms and large organizations",
    icon: Building2,
    popular: false,
    features: [
      { name: "Everything in Coalition", included: true },
      { name: "Unlimited team members", included: true },
      { name: "Custom branding", included: true },
      { name: "API access", included: true },
      { name: "Evidence management (100GB storage)", included: true },
      { name: "Advanced analytics & reporting", included: true },
      { name: "Dedicated account manager", included: true },
      { name: "Custom document templates", included: true },
      { name: "SSO / SAML authentication", included: true },
      { name: "Audit logs", included: true },
      { name: "24/7 phone support", included: true },
    ],
  },
];

export default function Pricing() {
  const [showPayments, setShowPayments] = useState(false);
  const { data: subStatus } = trpc.subscription.status.useQuery();
  const { data: paymentHistory } = trpc.subscription.payments.useQuery(undefined, {
    enabled: showPayments,
  });

  const checkoutMutation = trpc.subscription.checkout.useMutation({
    onSuccess: (data) => {
      toast.info("Redirecting to Stripe checkout...");
      window.open(data.url, "_blank");
    },
    onError: (err) => toast.error(err.message),
  });

  const portalMutation = trpc.subscription.portal.useMutation({
    onSuccess: (data) => {
      toast.info("Opening subscription management...");
      window.open(data.url, "_blank");
    },
    onError: (err) => toast.error(err.message),
  });

  // Handle success/cancel URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast.success(`Successfully upgraded to ${params.get("tier") || "paid"} plan! It may take a moment to reflect.`);
      window.history.replaceState({}, "", "/pricing");
    }
    if (params.get("canceled") === "true") {
      toast.info("Checkout was canceled.");
      window.history.replaceState({}, "", "/pricing");
    }
  }, []);

  const currentTier = subStatus?.tier || "free";

  const handleUpgrade = (tierKey: string) => {
    if (tierKey === "free") return;
    checkoutMutation.mutate({
      tier: tierKey as "pro" | "coalition" | "enterprise",
      origin: window.location.origin,
    });
  };

  const handleManageSubscription = () => {
    portalMutation.mutate({ origin: window.location.origin });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-2">
            Select the tier that fits your legal advocacy needs. Upgrade or downgrade anytime.
          </p>
          {currentTier !== "free" && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <Badge className="bg-primary text-primary-foreground">
                Current Plan: {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalMutation.isPending}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Manage Subscription
              </Button>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-950/10 max-w-3xl mx-auto">
          <CardContent className="py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              SintraPrime is a legal research and organization tool, not a law firm. No tier includes legal advice 
              or attorney-client privilege. Always consult a licensed attorney for legal matters.
            </p>
          </CardContent>
        </Card>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {TIERS.map((tier) => {
            const isCurrent = tier.key === currentTier;
            const isDowngrade = TIERS.findIndex(t => t.key === currentTier) >= TIERS.findIndex(t => t.key === tier.key) && !isCurrent;

            return (
              <Card
                key={tier.name}
                className={`relative flex flex-col ${
                  isCurrent
                    ? "border-green-500 shadow-lg ring-1 ring-green-500/20"
                    : tier.popular
                    ? "border-primary shadow-lg ring-1 ring-primary/20"
                    : ""
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-green-500 text-white px-3 py-0.5">Current Plan</Badge>
                  </div>
                )}
                {!isCurrent && tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-0.5">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-2 p-2 rounded-lg bg-primary/10 w-fit">
                    <tier.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription className="text-sm">{tier.description}</CardDescription>
                  <div className="mt-3">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground text-sm">{tier.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2.5">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                        )}
                        <span className={`text-sm ${feature.included ? "" : "text-muted-foreground/60"}`}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : tier.key === "free" ? (
                    <Button variant="outline" className="w-full" disabled>
                      Free Forever
                    </Button>
                  ) : (
                    <Button
                      variant={tier.popular ? "default" : "outline"}
                      className="w-full"
                      onClick={() => handleUpgrade(tier.key)}
                      disabled={checkoutMutation.isPending}
                    >
                      {checkoutMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          Processing...
                        </div>
                      ) : isDowngrade ? (
                        "Downgrade"
                      ) : (
                        `Upgrade to ${tier.name}`
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Payment History */}
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setShowPayments(!showPayments)}
          >
            <Receipt className="mr-2 h-4 w-4" />
            {showPayments ? "Hide" : "Show"} Payment History
          </Button>

          {showPayments && (
            <Card className="mt-3">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentHistory && paymentHistory.length > 0 ? (
                  <div className="space-y-2">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium">{payment.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payment.created).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">
                            ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                          </span>
                          <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                            {payment.status}
                          </Badge>
                          {payment.invoicePdf && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a href={payment.invoicePdf} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No payment history yet. Upgrade to a paid plan to see your invoices here.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Test Mode Notice */}
        <Card className="max-w-3xl mx-auto border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/10">
          <CardContent className="py-3 flex items-start gap-2">
            <CreditCard className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Test Mode:</strong> Use card number <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">4242 4242 4242 4242</code> with 
              any future expiration date and any CVC to test payments.
            </p>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto space-y-6 pt-4">
          <h2 className="text-2xl font-bold text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Can I switch plans at any time?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes, you can upgrade or downgrade your plan at any time. When upgrading, you'll be charged the 
                  prorated difference. When downgrading, the change takes effect at the end of your billing cycle.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Is my data secure?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  All data is encrypted at rest and in transit. Files are stored in secure cloud storage with 
                  access controls. We never share your data with third parties.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We accept all major credit cards, debit cards, and ACH bank transfers through our secure 
                  Stripe payment processor. Enterprise plans can also pay by invoice.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Do you offer refunds?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, 
                  contact support for a full refund within the first 14 days.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
