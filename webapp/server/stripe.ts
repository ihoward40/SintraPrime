import Stripe from "stripe";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "./stripe-products";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-04-30.basil" as any })
  : null;

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(
  userId: number,
  email: string,
  name?: string | null
): Promise<string | null> {
  if (!stripe) return null;

  // Search for existing customer by email
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { userId: userId.toString() },
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout Session for a subscription
 */
export async function createCheckoutSession(params: {
  userId: number;
  email: string;
  name?: string | null;
  tier: SubscriptionTier;
  origin: string;
  customerId?: string | null;
}): Promise<string | null> {
  if (!stripe) return null;
  const { userId, email, name, tier, origin, customerId } = params;

  const tierConfig = SUBSCRIPTION_TIERS[tier];
  if (!tierConfig || tierConfig.priceMonthly === 0) return null;

  // Create or find a product for this tier
  const products = await stripe.products.list({ limit: 100 });
  let product = products.data.find(
    (p) => p.metadata?.tier === tier && p.active
  );

  if (!product) {
    product = await stripe.products.create({
      name: `SintraPrime ${tierConfig.name}`,
      description: `SintraPrime ${tierConfig.name} subscription - ${tierConfig.features.slice(0, 3).join(", ")}`,
      metadata: { tier },
    });
  }

  // Find or create a price
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 10,
  });
  let price = prices.data.find(
    (p) =>
      p.unit_amount === tierConfig.priceMonthly &&
      p.recurring?.interval === "month"
  );

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: tierConfig.priceMonthly,
      currency: "usd",
      recurring: { interval: "month" },
    });
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: customerId || undefined,
    customer_email: customerId ? undefined : email,
    allow_promotion_codes: true,
    client_reference_id: userId.toString(),
    metadata: {
      user_id: userId.toString(),
      customer_email: email,
      customer_name: name || "",
      tier,
    },
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${origin}/pricing?success=true&tier=${tier}`,
    cancel_url: `${origin}/pricing?canceled=true`,
  });

  return session.url;
}

/**
 * Create a Stripe Customer Portal session for managing subscriptions
 */
export async function createPortalSession(
  customerId: string,
  origin: string
): Promise<string | null> {
  if (!stripe) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/pricing`,
  });

  return session.url;
}

/**
 * Get payment history for a customer
 */
export async function getPaymentHistory(customerId: string) {
  if (!stripe) return [];

  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 20,
  });

  return invoices.data.map((inv) => ({
    id: inv.id,
    amount: inv.amount_paid,
    currency: inv.currency,
    status: inv.status,
    description: inv.lines.data[0]?.description || "Subscription payment",
    created: inv.created * 1000, // Convert to ms
    invoicePdf: inv.invoice_pdf,
    hostedUrl: inv.hosted_invoice_url,
  }));
}
