import type { Request, Response } from "express";
import Stripe from "stripe";
import { getDb } from "../db";
import { paymentTransactions, auditTrail } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey && stripeSecretKey.trim().length > 0
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2026-01-28.clover",
    })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Stripe Webhook Handler
 * 
 * Handles webhook events from Stripe to update payment status
 * 
 * CRITICAL: This endpoint MUST use express.raw() middleware, NOT express.json()
 * The raw body is required for signature verification
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  if (!stripe || !webhookSecret || webhookSecret.trim().length === 0) {
    console.warn(
      "[Stripe Webhook] Stripe not configured (missing STRIPE_SECRET_KEY and/or STRIPE_WEBHOOK_SECRET)"
    );
    return res.status(503).json({ error: "Stripe webhook not configured" });
  }

  const sig = req.headers["stripe-signature"];

  if (!sig) {
    console.error("[Stripe Webhook] No signature header");
    return res.status(400).send("No signature header");
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({
      verified: true,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "charge.succeeded":
        await handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;

      case "charge.failed":
        await handleChargeFailed(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // Log webhook event to audit trail
    const db = await getDb();
    if (db) {
    await db.insert(auditTrail).values({
      userId: 1, // System user
      eventType: "efile_submission", // Using closest available enum value
      action: "stripe_webhook_received",
      entityType: "payment",
      entityId: 0,
      changes: {
        eventType: event.type,
        eventId: event.id,
      },
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
    });
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error(`[Stripe Webhook] Error processing event: ${error.message}`);
    res.status(500).send(`Webhook processing error: ${error.message}`);
  }
}

/**
 * Handle checkout.session.completed event
 * This is triggered when a customer completes the checkout flow
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`[Stripe Webhook] Processing checkout.session.completed: ${session.id}`);

  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database not available");
    return;
  }

  const paymentIntentId = session.payment_intent as string;
  const customerId = session.customer as string;
  const customerEmail = session.customer_email || session.customer_details?.email;
  const amountTotal = session.amount_total || 0;

  // Extract metadata
  const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;
  const serviceType = session.metadata?.service_type || "unknown";
  const taxYear = session.metadata?.tax_year ? parseInt(session.metadata.tax_year) : null;

  // Update payment transaction
  const existingTransaction = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntentId))
    .limit(1);

  if (existingTransaction.length > 0) {
    // Update existing transaction
    await db
      .update(paymentTransactions)
      .set({
        status: "succeeded",
        stripeCustomerId: customerId,
        receiptUrl: session.url || null,
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntentId));

    console.log(`[Stripe Webhook] Updated transaction ${existingTransaction[0].id} to completed`);
  } else {
    // Create new transaction (shouldn't happen normally, but handle it)
    await db.insert(paymentTransactions).values({
      userId: userId || 0,
      amount: amountTotal,
      currency: session.currency || "usd",
      status: "succeeded",
      serviceType: serviceType as any,
      taxYear: taxYear || new Date().getFullYear(),
      stripePaymentIntentId: paymentIntentId,
      stripeCustomerId: customerId,
      receiptUrl: session.url || null,
      description: session.metadata?.description || null,
    });

    console.log(`[Stripe Webhook] Created new transaction for payment intent ${paymentIntentId}`);
  }

  // Log audit trail
  await db.insert(auditTrail).values({
    userId: userId || 1,
    eventType: "efile_submission", // Using closest available enum value
    action: "payment_completed",
    entityType: "payment_transaction",
    entityId: existingTransaction[0]?.id || 0,
    changes: {
      sessionId: session.id,
      paymentIntentId,
      amount: amountTotal,
      customerEmail,
    },
    ipAddress: null,
    userAgent: null,
  });
}

/**
 * Handle payment_intent.succeeded event
 * This is triggered when a payment is successfully processed
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Stripe Webhook] Processing payment_intent.succeeded: ${paymentIntent.id}`);

  const db = await getDb();
  if (!db) return;

  const existingTransaction = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntent.id))
    .limit(1);

  if (existingTransaction.length > 0) {
    await db
      .update(paymentTransactions)
      .set({
        status: "succeeded",
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntent.id));

    console.log(`[Stripe Webhook] Updated transaction ${existingTransaction[0].id} to completed`);
  }
}

/**
 * Handle payment_intent.payment_failed event
 * This is triggered when a payment fails
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[Stripe Webhook] Processing payment_intent.payment_failed: ${paymentIntent.id}`);

  const db = await getDb();
  if (!db) return;

  const existingTransaction = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntent.id))
    .limit(1);

  if (existingTransaction.length > 0) {
    await db
      .update(paymentTransactions)
      .set({
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntent.id));

    console.log(`[Stripe Webhook] Updated transaction ${existingTransaction[0].id} to failed`);
  }
}

/**
 * Handle charge.succeeded event
 * This is triggered when a charge is successfully created
 */
async function handleChargeSucceeded(charge: Stripe.Charge) {
  console.log(`[Stripe Webhook] Processing charge.succeeded: ${charge.id}`);

  const paymentIntentId = charge.payment_intent as string;
  
  if (!paymentIntentId) {
    console.log("[Stripe Webhook] No payment intent ID in charge");
    return;
  }

  const db = await getDb();
  if (!db) return;

  const existingTransaction = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntentId))
    .limit(1);

  if (existingTransaction.length > 0) {
    await db
      .update(paymentTransactions)
      .set({
        receiptUrl: charge.receipt_url || null,
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntentId));

    console.log(`[Stripe Webhook] Updated transaction ${existingTransaction[0].id} with receipt URL`);
  }
}

/**
 * Handle charge.failed event
 * This is triggered when a charge fails
 */
async function handleChargeFailed(charge: Stripe.Charge) {
  console.log(`[Stripe Webhook] Processing charge.failed: ${charge.id}`);

  const paymentIntentId = charge.payment_intent as string;
  
  if (!paymentIntentId) {
    console.log("[Stripe Webhook] No payment intent ID in charge");
    return;
  }

  const db = await getDb();
  if (!db) return;

  const existingTransaction = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntentId))
    .limit(1);

  if (existingTransaction.length > 0) {
    await db
      .update(paymentTransactions)
      .set({
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.stripePaymentIntentId, paymentIntentId));

    console.log(`[Stripe Webhook] Updated transaction ${existingTransaction[0].id} to failed`);
  }
}
