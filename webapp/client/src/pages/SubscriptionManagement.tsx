import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  Check,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";

export default function SubscriptionManagement() {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("");
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<number | null>(null);

  // Fetch user's subscriptions
  const { data: subscriptionsData, isLoading, refetch } = trpc.subscriptionBilling.getSubscriptionAnalytics.useQuery();
  const subscriptions = subscriptionsData?.subscriptions || [];

  // Fetch subscription analytics
  const { data: analytics } = trpc.subscriptionBilling.getSubscriptionAnalytics.useQuery();

  // Cancel subscription mutation
  const cancelSubscription = trpc.subscriptionBilling.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription canceled successfully");
      refetch();
      setCancelDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to cancel subscription: ${error.message}`);
    },
  });

  // Upgrade subscription mutation
  const upgradeSubscription = trpc.subscriptionBilling.changeSubscriptionPlan.useMutation({
    onSuccess: () => {
      toast.success("Subscription upgraded successfully");
      refetch();
      setUpgradeDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to upgrade subscription: ${error.message}`);
    },
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      monthly: "Monthly Plan",
      quarterly: "Quarterly Plan",
      annual: "Annual Plan",
    };
    return labels[plan] || plan;
  };

  const getPlanPrice = (plan: string) => {
    const prices: Record<string, number> = {
      monthly: 9900,
      quarterly: 24900,
      annual: 89900,
    };
    return prices[plan] || 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "trialing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "canceled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "past_due":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const handleCancelSubscription = (subscriptionId: number) => {
    setSelectedSubscriptionId(subscriptionId);
    setCancelDialogOpen(true);
  };

  const confirmCancelSubscription = () => {
    if (selectedSubscriptionId) {
      cancelSubscription.mutate({ subscriptionId: selectedSubscriptionId });
    }
  };

  const handleUpgradeSubscription = (subscriptionId: number, currentPlan: string) => {
    setSelectedSubscriptionId(subscriptionId);
    setSelectedPlan(currentPlan);
    setUpgradeDialogOpen(true);
  };

  const confirmUpgradeSubscription = (newPlan: "monthly" | "quarterly" | "annual") => {
    if (selectedSubscriptionId) {
      upgradeSubscription.mutate({
        subscriptionId: selectedSubscriptionId,
        newPlanId: newPlan,
      });
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
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Subscription Management</h1>
        <p className="text-muted-foreground">
          Manage your tax preparation service subscriptions
        </p>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.totalSpent)}
              </div>
              <p className="text-xs text-muted-foreground">Recurring revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Subscriptions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalSubscriptions - analytics.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">In trial period</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Subscriptions */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Your Subscriptions</h2>

        {!subscriptions || subscriptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Subscriptions</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any active subscriptions yet.
              </p>
              <Button>Browse Plans</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((subscription: any) => (
              <Card key={subscription.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{getPlanLabel(subscription.plan)}</CardTitle>
                    <Badge className={getStatusColor(subscription.status)}>
                      {subscription.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {formatCurrency(getPlanPrice(subscription.plan))} /{" "}
                    {subscription.plan === "monthly"
                      ? "month"
                      : subscription.plan === "quarterly"
                      ? "quarter"
                      : "year"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Started:</span>
                      <span>{new Date(subscription.startDate).toLocaleDateString()}</span>
                    </div>
                    {subscription.trialEndDate && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Trial Ends:</span>
                        <span>{new Date(subscription.trialEndDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {subscription.currentPeriodEnd && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Next Billing:</span>
                        <span>{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                      </div>
                    )}
                    {subscription.canceledAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Canceled:</span>
                        <span>{new Date(subscription.canceledAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {subscription.status === "active" && (
                      <>
                        {subscription.plan !== "annual" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpgradeSubscription(subscription.id, subscription.plan)}
                          >
                            <ArrowUpCircle className="w-4 h-4 mr-2" />
                            Upgrade
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelSubscription(subscription.id)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this subscription? You'll continue to have access
              until the end of your current billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelSubscription}
              disabled={cancelSubscription.isPending}
            >
              {cancelSubscription.isPending ? "Canceling..." : "Cancel Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Subscription Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Subscription</DialogTitle>
            <DialogDescription>
              Choose a new plan to upgrade your subscription
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPlan !== "quarterly" && (
              <Card
                className="cursor-pointer hover:border-primary"
                onClick={() => confirmUpgradeSubscription("quarterly")}
              >
                <CardHeader>
                  <CardTitle>Quarterly Plan</CardTitle>
                  <CardDescription>{formatCurrency(24900)} / quarter</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      Save 17% vs monthly
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      Billed every 3 months
                    </li>
                  </ul>
                </CardContent>
              </Card>
            )}
            {selectedPlan !== "annual" && (
              <Card
                className="cursor-pointer hover:border-primary"
                onClick={() => confirmUpgradeSubscription("annual")}
              >
                <CardHeader>
                  <CardTitle>Annual Plan</CardTitle>
                  <CardDescription>{formatCurrency(89900)} / year</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      Save 24% vs monthly
                    </li>
                    <li className="flex items-center">
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      Best value
                    </li>
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
