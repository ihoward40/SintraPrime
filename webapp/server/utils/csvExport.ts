/**
 * CSV Export Utility for Payment Dashboard
 * Generates CSV files from payment transaction data
 */

export interface PaymentTransaction {
  id: number;
  userId: number;
  stripePaymentIntentId: string;
  stripeCustomerId: string | null;
  amount: number;
  currency: string;
  status: string;
  serviceType: string;
  taxYear: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundData {
  id: number;
  paymentTransactionId: number;
  stripeRefundId: string;
  amount: number;
  reason: string | null;
  status: string;
  createdAt: Date;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data: any[], headers: string[]): string {
  const rows = [headers.join(",")];
  
  for (const item of data) {
    const row = headers.map(header => {
      let value = item[header];
      
      // Handle dates
      if (value instanceof Date) {
        value = value.toISOString();
      }
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = "";
      }
      
      // Escape commas and quotes
      value = String(value);
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
    
    rows.push(row.join(","));
  }
  
  return rows.join("\n");
}

/**
 * Generate transaction history CSV
 */
export function generateTransactionCSV(transactions: PaymentTransaction[]): string {
  const headers = [
    "id",
    "userId",
    "stripePaymentIntentId",
    "stripeCustomerId",
    "amount",
    "currency",
    "status",
    "serviceType",
    "taxYear",
    "createdAt",
    "updatedAt",
  ];
  
  // Convert amount from cents to dollars
  const formattedTransactions = transactions.map(t => ({
    ...t,
    amount: (t.amount / 100).toFixed(2),
  }));
  
  return arrayToCSV(formattedTransactions, headers);
}

/**
 * Generate refund report CSV
 */
export function generateRefundCSV(refunds: RefundData[]): string {
  const headers = [
    "id",
    "paymentTransactionId",
    "stripeRefundId",
    "amount",
    "reason",
    "status",
    "createdAt",
  ];
  
  // Convert amount from cents to dollars
  const formattedRefunds = refunds.map(r => ({
    ...r,
    amount: (r.amount / 100).toFixed(2),
  }));
  
  return arrayToCSV(formattedRefunds, headers);
}

/**
 * Generate financial summary CSV
 */
export function generateFinancialSummaryCSV(summary: {
  totalRevenue: number;
  totalRefunded: number;
  netRevenue: number;
  transactionCount: number;
  refundCount: number;
  averageTransactionValue: number;
  period: string;
}): string {
  const data = [
    { metric: "Total Revenue", value: `$${(summary.totalRevenue / 100).toFixed(2)}` },
    { metric: "Total Refunded", value: `$${(summary.totalRefunded / 100).toFixed(2)}` },
    { metric: "Net Revenue", value: `$${(summary.netRevenue / 100).toFixed(2)}` },
    { metric: "Transaction Count", value: summary.transactionCount },
    { metric: "Refund Count", value: summary.refundCount },
    { metric: "Average Transaction Value", value: `$${(summary.averageTransactionValue / 100).toFixed(2)}` },
    { metric: "Period", value: summary.period },
  ];
  
  return arrayToCSV(data, ["metric", "value"]);
}
