import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { DollarSign, TrendingDown, Percent, BarChart3 } from "lucide-react";

export function RefundAnalytics() {
  const { data: analytics, isLoading } = trpc.stripePayment.getRefundAnalytics.useQuery();

  const formatCurrency = (cents: number) => {
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No refund data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunded</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.totalRefundedAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.refundCount} refund{analytics.refundCount !== 1 ? "s" : ""} processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refund Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.refundRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Of all completed payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Refund</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.averageRefundAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per refunded transaction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refund Type Split</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.fullRefundsCount} / {analytics.partialRefundsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Full / Partial refunds
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Refunds by Service Type */}
      <Card>
        <CardHeader>
          <CardTitle>Refunds by Service Type</CardTitle>
          <CardDescription>Breakdown of refunds across different tax services</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(analytics.refundsByServiceType).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(analytics.refundsByServiceType).map(([service, data]: [string, any]) => (
                <div key={service} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{getServiceLabel(service)}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.count} refund{data.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(data.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No refunds by service type yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Refunds */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Refunds</CardTitle>
          <CardDescription>Last 30 days of refund activity</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.recentRefunds.length > 0 ? (
            <div className="space-y-3">
              {analytics.recentRefunds.slice(0, 5).map((refund) => (
                <div
                  key={refund.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">#{refund.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {getServiceLabel(refund.serviceType)} • {refund.taxYear || "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(refund.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">
                      -{formatCurrency(refund.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {refund.status.replace("_", " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No recent refunds in the last 30 days
            </p>
          )}
        </CardContent>
      </Card>

      {/* Refund Trends Chart */}
      {Object.keys(analytics.refundTrends).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Refund Trends</CardTitle>
            <CardDescription>Daily refund activity over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(analytics.refundTrends)
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([date, data]: [string, any]) => (
                  <div key={date} className="flex items-center gap-4">
                    <div className="w-24 text-sm text-muted-foreground">
                      {new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="flex-1">
                      <div
                        className="bg-red-500 h-6 rounded flex items-center justify-end px-2 text-white text-sm font-medium"
                        style={{
                          width: `${Math.min(
                            (data.amount / analytics.totalRefundedAmount) * 100,
                            100
                          )}%`,
                          minWidth: "60px",
                        }}
                      >
                        {formatCurrency(data.amount)}
                      </div>
                    </div>
                    <div className="w-16 text-right text-sm text-muted-foreground">
                      {data.count} refund{data.count !== 1 ? "s" : ""}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
