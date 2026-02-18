import { useState } from "react";
import { RefundDialog } from "@/components/RefundDialog";
import { RefundAnalytics } from "@/components/RefundAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Download,
  Calendar,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PaymentDashboard() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "failed" | "succeeded" | "refunded" | "partially_refunded">("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});

  // CSV Export mutations
  const exportTransactions = trpc.stripePayment.exportTransactionsCSV.useMutation({
    onSuccess: (data: { csv: string; filename: string }) => {
      downloadCSV(data.csv, data.filename);
    },
  });

  const exportRefunds = trpc.stripePayment.exportRefundsCSV.useMutation({
    onSuccess: (data: { csv: string; filename: string }) => {
      downloadCSV(data.csv, data.filename);
    },
  });

  const exportFinancialSummary = trpc.stripePayment.exportFinancialSummaryCSV.useMutation({
    onSuccess: (data: { csv: string; filename: string }) => {
      downloadCSV(data.csv, data.filename);
    },
  });

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportTransactions = () => {
    exportTransactions.mutate({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleExportRefunds = () => {
    exportRefunds.mutate({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
  };

  const handleExportFinancialSummary = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    exportFinancialSummary.mutate({
      startDate: dateRange.startDate || thirtyDaysAgo.toISOString().split('T')[0],
      endDate: dateRange.endDate || now.toISOString().split('T')[0],
    });
  };

  // Fetch payment statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.stripePayment.getPaymentStats.useQuery();

  // Fetch payment history
  const { data: payments, isLoading: paymentsLoading, refetch: refetchPayments } = trpc.stripePayment.getPaymentHistory.useQuery({
    limit: 100,
  });

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "succeeded":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "canceled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const filteredPayments = payments?.filter((payment) => {
    if (statusFilter !== "all" && payment.status !== statusFilter) return false;
    if (serviceFilter !== "all" && payment.serviceType !== serviceFilter) return false;
    return true;
  });

  const handleRefresh = () => {
    refetchStats();
    refetchPayments();
  };

  const handleExportCSV = () => {
    if (!filteredPayments || filteredPayments.length === 0) return;

    const headers = ["Transaction ID", "Date", "Service", "Amount", "Status", "Tax Year"];
    const rows = filteredPayments.map((p) => [
      p.id.toString(),
      new Date(p.createdAt).toLocaleDateString(),
      getServiceLabel(p.serviceType),
      formatCurrency(p.amount),
      p.status,
      p.taxYear?.toString() || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payment-history-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (statsLoading || paymentsLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Dashboard</h1>
          <p className="text-muted-foreground">
            Track your tax preparation payments and financial analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportTransactions} variant="outline" disabled={exportTransactions.isPending}>
            <Download className="w-4 h-4 mr-2" />
            {exportTransactions.isPending ? 'Exporting...' : 'Export Transactions'}
          </Button>
          <Button onClick={handleExportRefunds} variant="outline" disabled={exportRefunds.isPending}>
            <Download className="w-4 h-4 mr-2" />
            {exportRefunds.isPending ? 'Exporting...' : 'Export Refunds'}
          </Button>
          <Button onClick={handleExportFinancialSummary} variant="outline" disabled={exportFinancialSummary.isPending}>
            <Download className="w-4 h-4 mr-2" />
            {exportFinancialSummary.isPending ? 'Exporting...' : 'Export Summary'}
          </Button>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="refunds">Refund Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.totalPaid) : "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              From successful payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.totalPending) : "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalTransactions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              All payment attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? formatCurrency(stats.averagePayment) : "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status Distribution */}
      {stats && stats.totalTransactions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Status Distribution</CardTitle>
            <CardDescription>Breakdown of payment statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.successfulPayments}
                </div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.pendingPayments}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/10 rounded-lg">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {stats.failedPayments}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/10 rounded-lg">
                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {stats.canceledPayments}
                </div>
                <div className="text-sm text-muted-foreground">Canceled</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All your tax preparation payments</CardDescription>
            </div>
            <Button onClick={handleExportCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "pending" | "failed" | "succeeded" | "refunded" | "partially_refunded")}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="succeeded">Succeeded</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Service Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="form1041_filing">Form 1041 Filing</SelectItem>
                <SelectItem value="k1_preparation">K-1 Preparation</SelectItem>
                <SelectItem value="tax_consultation">Tax Consultation</SelectItem>
                <SelectItem value="audit_support">Audit Support</SelectItem>
                <SelectItem value="full_service">Full Service</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions Table */}
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      ID
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Service
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Tax Year
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments && filteredPayments.length > 0 ? (
                    filteredPayments.map((payment) => (
                      <tr key={payment.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="p-4 align-middle">
                          <span className="font-mono text-sm">#{payment.id}</span>
                        </td>
                        <td className="p-4 align-middle">
                          {new Date(payment.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-4 align-middle">
                          {getServiceLabel(payment.serviceType)}
                        </td>
                        <td className="p-4 align-middle">
                          {payment.taxYear || "N/A"}
                        </td>
                        <td className="p-4 align-middle font-semibold">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="p-4 align-middle">
                          <Badge
                            variant="outline"
                            className={getStatusColor(payment.status)}
                          >
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle">
                          {payment.status === "succeeded" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(payment);
                                setRefundDialogOpen(true);
                              }}
                            >
                              Refund
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No payments found matching the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="refunds" className="space-y-6">
          <RefundAnalytics />
        </TabsContent>
      </Tabs>
    </div>

      {/* Refund Dialog */}
      {selectedTransaction && (
        <RefundDialog
          open={refundDialogOpen}
          onOpenChange={setRefundDialogOpen}
          transaction={selectedTransaction}
          onRefundComplete={() => {
            refetchStats();
            refetchPayments();
          }}
        />
      )}
    </>
  );
}
