import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';

import { getDb } from '../db/mysql';
import { ikeBillingEvents } from '../db/schema';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).json({ error: 'Webhook configuration error' });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Log the webhook event
  console.log(`Stripe webhook received: ${event.type}`);

  try {
    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;
      case 'charge.failed':
        await handleChargeFailed(event.data.object as Stripe.Charge);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing Stripe webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

function formatAmountFromCents(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toFixed(2);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const database = getDb();
  await database.insert(ikeBillingEvents).values({
    id: randomUUID(),
    event_type: 'payment_intent.succeeded',
    event_source: 'stripe',
    amount: formatAmountFromCents(paymentIntent.amount),
    currency: paymentIntent.currency.toUpperCase(),
    status: 'succeeded',
    stripe_event_id: paymentIntent.id,
    metadata: {
      customer: paymentIntent.customer,
      description: paymentIntent.description,
    },
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const database = getDb();
  await database.insert(ikeBillingEvents).values({
    id: randomUUID(),
    event_type: 'payment_intent.failed',
    event_source: 'stripe',
    amount: formatAmountFromCents(paymentIntent.amount),
    currency: paymentIntent.currency.toUpperCase(),
    status: 'failed',
    stripe_event_id: paymentIntent.id,
    metadata: {
      customer: paymentIntent.customer,
      last_payment_error: paymentIntent.last_payment_error,
    },
  });
}

async function handleChargeSucceeded(charge: Stripe.Charge) {
  const database = getDb();
  await database.insert(ikeBillingEvents).values({
    id: randomUUID(),
    event_type: 'charge.succeeded',
    event_source: 'stripe',
    amount: formatAmountFromCents(charge.amount),
    currency: charge.currency.toUpperCase(),
    status: 'succeeded',
    stripe_event_id: charge.id,
    metadata: {
      customer: charge.customer,
      description: charge.description,
    },
  });
}

async function handleChargeFailed(charge: Stripe.Charge) {
  const database = getDb();
  await database.insert(ikeBillingEvents).values({
    id: randomUUID(),
    event_type: 'charge.failed',
    event_source: 'stripe',
    amount: formatAmountFromCents(charge.amount),
    currency: charge.currency.toUpperCase(),
    status: 'failed',
    stripe_event_id: charge.id,
    metadata: {
      customer: charge.customer,
      failure_message: charge.failure_message,
    },
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const database = getDb();
  await database.insert(ikeBillingEvents).values({
    id: randomUUID(),
    event_type: 'invoice.payment_succeeded',
    event_source: 'stripe',
    amount: formatAmountFromCents(invoice.amount_paid),
    currency: invoice.currency?.toUpperCase() || 'USD',
    status: 'succeeded',
    stripe_event_id: invoice.id,
    metadata: {
      customer: invoice.customer,
      subscription: (invoice as any).subscription,
    },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const database = getDb();
  await database.insert(ikeBillingEvents).values({
    id: randomUUID(),
    event_type: 'invoice.payment_failed',
    event_source: 'stripe',
    amount: formatAmountFromCents(invoice.amount_due),
    currency: invoice.currency?.toUpperCase() || 'USD',
    status: 'failed',
    stripe_event_id: invoice.id,
    metadata: {
      customer: invoice.customer,
      subscription: (invoice as any).subscription,
    },
  });
}
