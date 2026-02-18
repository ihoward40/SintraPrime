import type { Express, Request, Response } from "express";
import express from "express";
import { stripe } from "./stripe";
import { getDb } from "./db";
import { sendPaymentReceiptEmail, sendPaymentFailureEmail } from "./services/emailNotifications";
import { users, payments, paymentTransactions, auditTrail } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export function registerStripeWebhook(app: Express) {
  // IMPORTANT: raw body parser must be registered BEFORE json parser for this route
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      if (!stripe) {
        console.log("[Stripe Webhook] Stripe not configured");
        return res.status(400).json({ error: "Stripe not configured" });
      }

      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event;

      try {
        if (webhookSecret && sig) {
          event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
          event = JSON.parse(req.body.toString());
        }
      } catch (err: any) {
        console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
        return res.status(400).json({ error: `Webhook Error: ${err.message}` });
      }

      // Handle test events
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

      try {
        const database = await getDb();
        if (!database) {
          console.error("[Stripe Webhook] Database not available");
          return res.status(500).json({ error: "Database not available" });
        }

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object;
            const userId = parseInt(session.client_reference_id || session.metadata?.user_id || "0");
            const tier = session.metadata?.tier;
            const customerId = session.customer as string;
            const subscriptionId = session.subscription as string;

            if (userId && tier) {
              await database
                .update(users)
                .set({
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: subscriptionId,
                  subscriptionTier: tier as any,
                })
                .where(eq(users.id, userId));

              console.log(`[Stripe Webhook] User ${userId} upgraded to ${tier}`);
            }
            break;
          }

          case "invoice.paid": {
            const invoice = event.data.object;
            const customerId = invoice.customer as string;

            const [user] = await database
              .select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId))
              .limit(1);

            if (user) {
              await database.insert(payments).values({
                userId: user.id,
                stripeInvoiceId: invoice.id,
                stripePaymentIntentId: invoice.payment_intent as string,
                amount: invoice.amount_paid,
                currency: invoice.currency,
                status: "paid",
                description: invoice.lines?.data?.[0]?.description || "Subscription payment",
              });
              console.log(`[Stripe Webhook] Payment recorded for user ${user.id}`);
            }
            break;
          }

          case "customer.subscription.updated": {
            const subscription = event.data.object;
            const customerId = subscription.customer as string;

            const [user] = await database
              .select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId))
              .limit(1);

            if (user) {
              const status = subscription.status;
              if (status === "canceled" || status === "unpaid") {
                await database
                  .update(users)
                  .set({ subscriptionTier: "free", stripeSubscriptionId: null })
                  .where(eq(users.id, user.id));
                console.log(`[Stripe Webhook] User ${user.id} subscription canceled`);
              }
            }
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object;
            const customerId = subscription.customer as string;

            const [user] = await database
              .select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId))
              .limit(1);

            if (user) {
              await database
                .update(users)
                .set({ subscriptionTier: "free", stripeSubscriptionId: null })
                .where(eq(users.id, user.id));
              console.log(`[Stripe Webhook] User ${user.id} subscription deleted`);
            }
            break;
          }

          case "payment_intent.succeeded": {
            const paymentIntent = event.data.object;
            const existingTransaction = await database
              .select()
              .from(paymentTransactions)
              .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntent.id))
              .limit(1);

            if (existingTransaction.length > 0) {
              const transaction = existingTransaction[0];
              await database
                .update(paymentTransactions)
                .set({
                  status: "succeeded",
                  updatedAt: new Date(),
                })
                .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntent.id));

              console.log(`[Stripe Webhook] Payment ${paymentIntent.id} succeeded`);

              // Send payment receipt email
              if (transaction.userId) {
                const [user] = await database
                  .select()
                  .from(users)
                  .where(eq(users.id, transaction.userId))
                  .limit(1);
                
                if (user && user.email) {
                  await sendPaymentReceiptEmail({
                    recipientEmail: user.email,
                    recipientName: user.name || "Valued Customer",
                    transactionId: transaction.id,
                    amount: transaction.amount,
                    serviceType: transaction.serviceType,
                    taxYear: transaction.taxYear || new Date().getFullYear(),
                    description: transaction.description || undefined,
                    paymentDate: new Date(),
                    receiptUrl: transaction.receiptUrl || undefined,
                    stripePaymentIntentId: transaction.stripePaymentIntentId,
                  });
                  console.log(`[Stripe Webhook] Receipt email sent to ${user.email}`);
                }
              }
            }
            break;
          }

          case "payment_intent.payment_failed": {
            const paymentIntent = event.data.object;
            const existingTransaction = await database
              .select()
              .from(paymentTransactions)
              .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntent.id))
              .limit(1);

            if (existingTransaction.length > 0) {
              const transaction = existingTransaction[0];
              await database
                .update(paymentTransactions)
                .set({
                  status: "failed",
                  updatedAt: new Date(),
                })
                .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntent.id));

              console.log(`[Stripe Webhook] Payment ${paymentIntent.id} failed`);

              // Send payment failure email
              if (transaction.userId) {
                const [user] = await database
                  .select()
                  .from(users)
                  .where(eq(users.id, transaction.userId))
                  .limit(1);
                
                if (user && user.email) {
                  const failureReason = paymentIntent.last_payment_error?.message || "Payment could not be processed";
                  await sendPaymentFailureEmail({
                    recipientEmail: user.email,
                    recipientName: user.name || "Valued Customer",
                    amount: transaction.amount,
                    serviceType: transaction.serviceType,
                    failureReason,
                    retryUrl: `${process.env.VITE_APP_URL || "https://sintraprime.manus.space"}/tax-agent`,
                  });
                  console.log(`[Stripe Webhook] Failure email sent to ${user.email}`);
                }
              }
            }
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
      } catch (err: any) {
        console.error(`[Stripe Webhook] Error processing event: ${err.message}`);
        return res.status(500).json({ error: "Webhook processing error" });
      }

      res.json({ received: true });
    }
  );
}
