import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createPaymentTransaction,
  getPaymentTransactionById,
  getUserPaymentTransactions,
  getTrustPaymentTransactions,
  updatePaymentTransaction,
  getDb,
} from "../db";
import { paymentTransactions } from "../../drizzle/schema";
import { eq, and, or, gte, lte } from "drizzle-orm";
import Stripe from "stripe";

// Initialize Stripe with secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey && stripeSecretKey.trim().length > 0
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2026-01-28.clover",
    })
  : null;

function getStripe(): Stripe {
  if (!stripe) {
    throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY)");
  }
  return stripe;
}

/**
 * Stripe Payment Router
 * 
 * Handles payment processing for tax preparation services:
 * - Creating payment intents for beneficiary tax prep fees
 * - Confirming payments and updating transaction status
 * - Retrieving payment history
 * - Generating automated receipts
 */
export const stripePaymentRouter = router({
  /**
   * Create a Stripe Checkout Session for tax prep services
   * This redirects users to Stripe's hosted checkout page
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(100), // Minimum $1.00
        trustAccountId: z.number().optional(),
        serviceType: z.enum([
          "k1_preparation",
          "form1041_filing",
          "tax_consultation",
          "audit_support",
          "full_service",
        ]),
        taxYear: z.number(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get origin from request headers
        const origin = ctx.req.headers.origin || `https://${ctx.req.headers.host}`;

        // Create Stripe Checkout Session
        const session = await getStripe().checkout.sessions.create({
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: `Tax Preparation Service - ${input.serviceType.replace(/_/g, " ")}`,
                  description: input.description || `Tax preparation for year ${input.taxYear}`,
                },
                unit_amount: input.amount,
              },
              quantity: 1,
            },
          ],
          customer_email: ctx.user.email || undefined,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            service_type: input.serviceType,
            tax_year: input.taxYear.toString(),
            trust_account_id: input.trustAccountId?.toString() || "",
            description: input.description || "",
          },
          success_url: `${origin}/tax-agent?tab=payments&payment=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/tax-agent?tab=payments&payment=canceled`,
          allow_promotion_codes: true,
        });

        // Create transaction record with payment intent from session
        const paymentIntentId = session.payment_intent as string;
        const transaction = await createPaymentTransaction({
          userId: ctx.user.id,
          trustAccountId: input.trustAccountId || null,
          stripePaymentIntentId: paymentIntentId,
          stripeCustomerId: session.customer as string || null,
          amount: input.amount,
          currency: "usd",
          status: "pending",
          description: input.description || `Tax Prep Service - ${input.serviceType}`,
          serviceType: input.serviceType,
          taxYear: input.taxYear,
          metadata: {},
        });

        return {
          sessionId: session.id,
          checkoutUrl: session.url!,
          transactionId: transaction!.id,
        };
      } catch (error: any) {
        console.error("Error creating checkout session:", error);
        throw new Error(`Failed to create checkout session: ${error.message}`);
      }
    }),

  /**
   * Create a payment intent for tax prep services
   */
  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(100), // Minimum $1.00
        trustAccountId: z.number().optional(),
        serviceType: z.enum([
          "k1_preparation",
          "form1041_filing",
          "tax_consultation",
          "audit_support",
          "full_service",
        ]),
        taxYear: z.number(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Create Stripe customer if not exists
        let stripeCustomerId = ctx.user.stripeCustomerId;
        if (!stripeCustomerId) {
          const customer = await getStripe().customers.create({
            email: ctx.user.email || undefined,
            name: ctx.user.name || undefined,
            metadata: {
              userId: ctx.user.id.toString(),
            },
          });
          stripeCustomerId = customer.id;
        }

        // Create payment intent
        const paymentIntent = await getStripe().paymentIntents.create({
          amount: input.amount,
          currency: "usd",
          customer: stripeCustomerId,
          description: input.description || `Tax Prep Service - ${input.serviceType}`,
          metadata: {
            userId: ctx.user.id.toString(),
            trustAccountId: input.trustAccountId?.toString() || "",
            serviceType: input.serviceType,
            taxYear: input.taxYear.toString(),
          },
          automatic_payment_methods: {
            enabled: true,
          },
        });

        // Create payment transaction record
        const transaction = await createPaymentTransaction({
          userId: ctx.user.id,
          trustAccountId: input.trustAccountId || null,
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId,
          amount: input.amount,
          currency: "usd",
          status: "pending",
          description: input.description || `Tax Prep Service - ${input.serviceType}`,
          serviceType: input.serviceType,
          taxYear: input.taxYear,
          metadata: {},
        });

        return {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          transactionId: transaction!.id,
        };
      } catch (error: any) {
        console.error("Error creating payment intent:", error);
        throw new Error(`Failed to create payment intent: ${error.message}`);
      }
    }),

  /**
   * Confirm payment and update transaction status
   */
  confirmPayment: protectedProcedure
    .input(
      z.object({
        paymentIntentId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Retrieve payment intent from Stripe
        const paymentIntent = await getStripe().paymentIntents.retrieve(input.paymentIntentId);

        // Find transaction in database
        const transactions = await getUserPaymentTransactions(ctx.user.id);
        const transaction = transactions.find(
          (t) => t.stripePaymentIntentId === input.paymentIntentId
        );

        if (!transaction) {
          throw new Error("Payment transaction not found");
        }

        // Update transaction status
        const status = paymentIntent.status === "succeeded" ? "succeeded" : "failed";
        const updatedTransaction = await updatePaymentTransaction(transaction.id, {
          status,
          paymentMethod: paymentIntent.payment_method?.toString() || null,
          receiptUrl: null, // Receipt URL will be available after charge completes
        });

        // Generate receipt number if succeeded
        if (status === "succeeded") {
          const receiptNumber = `RCP-${transaction.taxYear}-${transaction.id.toString().padStart(6, "0")}`;
          await updatePaymentTransaction(transaction.id, {
            receiptNumber,
          });
        }

        return {
          success: status === "succeeded",
          status,
          transaction: updatedTransaction,
        };
      } catch (error: any) {
        console.error("Error confirming payment:", error);
        throw new Error(`Failed to confirm payment: ${error.message}`);
      }
    }),

  /**
   * Get payment history for current user
   */
  getPaymentHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      const transactions = await getUserPaymentTransactions(ctx.user.id, input.limit);
      return transactions;
    }),

  /**
   * Get payment history for a specific trust account
   */
  getTrustPaymentHistory: protectedProcedure
    .input(
      z.object({
        trustAccountId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const transactions = await getTrustPaymentTransactions(input.trustAccountId);
      return transactions;
    }),

  /**
   * Get payment transaction by ID
   */
  getPaymentById: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const transaction = await getPaymentTransactionById(input.id);
      if (!transaction || transaction.userId !== ctx.user.id) {
        throw new Error("Payment transaction not found or access denied");
      }
      return transaction;
    }),

  /**
   * Get payment transaction by Stripe session ID
   */
  getPaymentBySessionId: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Query payment_transactions where stripePaymentIntentId contains the session ID
      // or metadata contains the session ID
      const transactions = await getUserPaymentTransactions(ctx.user.id, 100);
      const transaction = transactions.find(
        (t) =>
          t.stripePaymentIntentId === input.sessionId ||
          (t.metadata && typeof t.metadata === 'object' && 'sessionId' in t.metadata && t.metadata.sessionId === input.sessionId)
      );
      
      if (!transaction) {
        throw new Error("Payment transaction not found");
      }
      return transaction;
    }),

  /**
   * Cancel a pending payment
   */
  cancelPayment: protectedProcedure
    .input(
      z.object({
        paymentIntentId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Cancel payment intent in Stripe
        await getStripe().paymentIntents.cancel(input.paymentIntentId);

        // Update transaction status
        const transactions = await getUserPaymentTransactions(ctx.user.id);
        const transaction = transactions.find(
          (t) => t.stripePaymentIntentId === input.paymentIntentId
        );

        if (transaction) {
          await updatePaymentTransaction(transaction.id, {
            status: "canceled",
          });
        }

        return { success: true };
      } catch (error: any) {
        console.error("Error canceling payment:", error);
        throw new Error(`Failed to cancel payment: ${error.message}`);
      }
    }),

  /**
   * Get payment statistics for dashboard
   */
  getPaymentStats: protectedProcedure.query(async ({ ctx }) => {
    const transactions = await getUserPaymentTransactions(ctx.user.id, 1000);

    const totalPaid = transactions
      .filter((t) => t.status === "succeeded")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPending = transactions
      .filter((t) => t.status === "pending" || t.status === "processing")
      .reduce((sum, t) => sum + t.amount, 0);

    const byServiceType = transactions.reduce((acc, t) => {
      if (t.status === "succeeded") {
        acc[t.serviceType] = (acc[t.serviceType] || 0) + t.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    const successfulPayments = transactions.filter((t) => t.status === "succeeded").length;
    const pendingPayments = transactions.filter((t) => t.status === "pending" || t.status === "processing").length;
    const failedPayments = transactions.filter((t) => t.status === "failed").length;
    const canceledPayments = transactions.filter((t) => t.status === "canceled").length;
    const averagePayment = successfulPayments > 0 ? Math.round(totalPaid / successfulPayments) : 0;

    return {
      totalPaid,
      totalPending,
      totalTransactions: transactions.length,
      successfulPayments,
      pendingPayments,
      failedPayments,
      canceledPayments,
      averagePayment,
      byServiceType,
    };
  }),

  /**
   * Process a full or partial refund for a payment
   */
  processRefund: protectedProcedure
    .input(
      z.object({
        transactionId: z.number(),
        amount: z.number().optional(), // If not provided, full refund
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get the original transaction
        const transaction = await getPaymentTransactionById(input.transactionId);
        
        if (!transaction) {
          throw new Error("Transaction not found");
        }

        // Verify user owns this transaction
        if (transaction.userId !== ctx.user.id) {
          throw new Error("Unauthorized: You can only refund your own payments");
        }

        // Verify transaction is refundable
        if (transaction.status !== "succeeded") {
          throw new Error("Only successful payments can be refunded");
        }

        if (!transaction.stripePaymentIntentId) {
          throw new Error("No Stripe payment intent found for this transaction");
        }

        // Determine refund amount (full or partial)
        const refundAmount = input.amount || transaction.amount;

        if (refundAmount > transaction.amount) {
          throw new Error("Refund amount cannot exceed original payment amount");
        }

        if (refundAmount < 1) {
          throw new Error("Refund amount must be at least $0.01");
        }

        // Process refund with Stripe
        const refund = await getStripe().refunds.create({
          payment_intent: transaction.stripePaymentIntentId,
          amount: refundAmount,
          reason: input.reason ? "requested_by_customer" : undefined,
          metadata: {
            transaction_id: transaction.id.toString(),
            user_id: ctx.user.id.toString(),
            refund_reason: input.reason || "Customer requested refund",
          },
        });

        // Update transaction status
        const isFullRefund = refundAmount === transaction.amount;
        await updatePaymentTransaction(transaction.id, {
          status: isFullRefund ? "refunded" : "partially_refunded",
        });

        // Send refund confirmation email
        const { sendRefundConfirmationEmail } = await import("../services/refundNotifications");
        if (ctx.user.email) {
          await sendRefundConfirmationEmail({
            recipientEmail: ctx.user.email,
            recipientName: ctx.user.name || "Valued Customer",
            transactionId: transaction.id,
            originalAmount: transaction.amount,
            refundAmount,
            serviceType: transaction.serviceType,
            taxYear: transaction.taxYear || new Date().getFullYear(),
            refundReason: input.reason,
            refundDate: new Date(),
            stripeRefundId: refund.id,
            originalPaymentDate: transaction.createdAt,
          });
        }

        return {
          success: true,
          refundId: refund.id,
          amount: refundAmount,
          status: refund.status,
          isFullRefund,
        };
      } catch (error: any) {
        console.error("Error processing refund:", error);
        throw new Error(`Failed to process refund: ${error.message}`);
      }
    }),

  /**
   * Get refund details for a transaction
   */
  getRefundDetails: protectedProcedure
    .input(
      z.object({
        transactionId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const transaction = await getPaymentTransactionById(input.transactionId);
        
        if (!transaction) {
          throw new Error("Transaction not found");
        }

        // Verify user owns this transaction
        if (transaction.userId !== ctx.user.id) {
          throw new Error("Unauthorized");
        }

        if (!transaction.stripePaymentIntentId) {
          return { refunds: [] };
        }

        // Get refunds from Stripe
        const refunds = await getStripe().refunds.list({
          payment_intent: transaction.stripePaymentIntentId,
        });

        return {
          refunds: refunds.data.map((refund) => ({
            id: refund.id,
            amount: refund.amount,
            status: refund.status,
            reason: refund.reason,
            created: new Date(refund.created * 1000),
            metadata: refund.metadata,
          })),
        };
      } catch (error: any) {
        console.error("Error fetching refund details:", error);
        throw new Error(`Failed to fetch refund details: ${error.message}`);
      }
    }),

  /**
   * Get refund analytics and statistics
   */
  getRefundAnalytics: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { getUserPaymentTransactions } = await import("../db");

      // Get all transactions for the user
      const allTransactions = await getUserPaymentTransactions(ctx.user.id);

      // Filter refunded transactions
      const refundedTransactions = allTransactions.filter(
        (t: any) => t.status === "refunded" || t.status === "partially_refunded"
      );

      // Calculate total refunded amount
      const totalRefundedAmount = refundedTransactions.reduce(
        (sum: number, txn: any) => sum + txn.amount,
        0
      );

      // Calculate refund rate
      const totalPayments = allTransactions.filter(
        (t: any) => t.status === "succeeded" || t.status === "refunded" || t.status === "partially_refunded"
      ).length;
      const refundCount = refundedTransactions.length;
      const refundRate = totalPayments > 0 ? (refundCount / totalPayments) * 100 : 0;

      // Calculate average refund amount
      const averageRefundAmount =
        refundCount > 0 ? totalRefundedAmount / refundCount : 0;

      // Group refunds by service type
      const refundsByServiceType = refundedTransactions.reduce(
        (acc: any, txn: any) => {
          const service = txn.serviceType;
          if (!acc[service]) {
            acc[service] = { count: 0, amount: 0 };
          }
          acc[service].count++;
          acc[service].amount += txn.amount;
          return acc;
        },
        {} as Record<string, { count: number; amount: number }>
      );

      // Group refunds by status (full vs partial)
      const fullRefunds = refundedTransactions.filter((t: any) => t.status === "refunded");
      const partialRefunds = refundedTransactions.filter(
        (t: any) => t.status === "partially_refunded"
      );

      // Get refund trends (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentRefunds = refundedTransactions.filter(
        (t: any) => new Date(t.createdAt) >= thirtyDaysAgo
      );

      // Group by day for trend chart
      const refundTrends = recentRefunds.reduce(
        (acc: any, txn: any) => {
          const date = new Date(txn.createdAt).toISOString().split("T")[0];
          if (!acc[date]) {
            acc[date] = { count: 0, amount: 0 };
          }
          acc[date].count++;
          acc[date].amount += txn.amount;
          return acc;
        },
        {} as Record<string, { count: number; amount: number }>
      );

      return {
        totalRefundedAmount,
        refundCount,
        refundRate: Math.round(refundRate * 100) / 100,
        averageRefundAmount: Math.round(averageRefundAmount),
        fullRefundsCount: fullRefunds.length,
        partialRefundsCount: partialRefunds.length,
        refundsByServiceType,
        refundTrends,
        recentRefunds: recentRefunds.map((t: any) => ({
          id: t.id,
          amount: t.amount,
          serviceType: t.serviceType,
          status: t.status,
          createdAt: t.createdAt,
          taxYear: t.taxYear,
        })),
      };
    } catch (error: any) {
      console.error("Error fetching refund analytics:", error);
      throw new Error(`Failed to fetch refund analytics: ${error.message}`);
    }
  }),

  /**
   * Export transaction history as CSV
   */
  exportTransactionsCSV: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z.enum(["succeeded", "pending", "failed", "refunded", "partially_refunded"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { generateTransactionCSV } = await import("../utils/csvExport");
      
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        // Build where conditions
        const conditions = [eq(paymentTransactions.userId, ctx.user.id)];
        if (input.startDate) {
          conditions.push(gte(paymentTransactions.createdAt, new Date(input.startDate)));
        }
        if (input.endDate) {
          conditions.push(lte(paymentTransactions.createdAt, new Date(input.endDate)));
        }
        if (input.status) {
          conditions.push(eq(paymentTransactions.status, input.status));
        }
        
        const transactions = await db
          .select()
          .from(paymentTransactions)
          .where(and(...conditions));
        const csvContent = generateTransactionCSV(transactions);
        
        return {
          csv: csvContent,
          filename: `transactions_${new Date().toISOString().split('T')[0]}.csv`,
        };
      } catch (error: any) {
        console.error("Error exporting transactions CSV:", error);
        throw new Error(`Failed to export transactions: ${error.message}`);
      }
    }),

  /**
   * Export refund report as CSV
   */
  exportRefundsCSV: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { generateRefundCSV } = await import("../utils/csvExport");
      
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        // Build where conditions
        const conditions = [
          eq(paymentTransactions.userId, ctx.user.id),
          or(
            eq(paymentTransactions.status, "refunded"),
            eq(paymentTransactions.status, "partially_refunded")
          )
        ];
        
        if (input.startDate) {
          conditions.push(gte(paymentTransactions.createdAt, new Date(input.startDate)));
        }
        if (input.endDate) {
          conditions.push(lte(paymentTransactions.createdAt, new Date(input.endDate)));
        }
        
        const refundedTransactions = await db
          .select()
          .from(paymentTransactions)
          .where(and(...conditions));
        
        // Format as refund data
        const refunds = refundedTransactions.map((t: any) => ({
          id: t.id,
          paymentTransactionId: t.id,
          stripeRefundId: t.stripePaymentIntentId,
          amount: t.amount,
          reason: t.serviceType,
          status: t.status,
          createdAt: t.updatedAt,
        }));
        
        const csvContent = generateRefundCSV(refunds);
        
        return {
          csv: csvContent,
          filename: `refunds_${new Date().toISOString().split('T')[0]}.csv`,
        };
      } catch (error: any) {
        console.error("Error exporting refunds CSV:", error);
        throw new Error(`Failed to export refunds: ${error.message}`);
      }
    }),

  /**
   * Export financial summary as CSV
   */
  exportFinancialSummaryCSV: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { generateFinancialSummaryCSV } = await import("../utils/csvExport");
      
      try {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        const transactions = await db
          .select()
          .from(paymentTransactions)
          .where(
            and(
              eq(paymentTransactions.userId, ctx.user.id),
              gte(paymentTransactions.createdAt, new Date(input.startDate)),
              lte(paymentTransactions.createdAt, new Date(input.endDate))
            )
          );
        
        const succeededTransactions = transactions.filter((t: any) => t.status === "succeeded");
        const refundedTransactions = transactions.filter((t: any) => 
          t.status === "refunded" || t.status === "partially_refunded"
        );
        
        const totalRevenue = succeededTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
        const totalRefunded = refundedTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
        const netRevenue = totalRevenue - totalRefunded;
        const averageTransactionValue = succeededTransactions.length > 0
          ? totalRevenue / succeededTransactions.length
          : 0;
        
        const summary = {
          totalRevenue,
          totalRefunded,
          netRevenue,
          transactionCount: succeededTransactions.length,
          refundCount: refundedTransactions.length,
          averageTransactionValue,
          period: `${input.startDate} to ${input.endDate}`,
        };
        
        const csvContent = generateFinancialSummaryCSV(summary);
        
        return {
          csv: csvContent,
          filename: `financial_summary_${new Date().toISOString().split('T')[0]}.csv`,
        };
      } catch (error: any) {
        console.error("Error exporting financial summary CSV:", error);
        throw new Error(`Failed to export financial summary: ${error.message}`);
      }
    }),
});
