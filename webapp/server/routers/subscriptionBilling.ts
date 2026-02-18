import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import Stripe from "stripe";
import { getDb } from "../db";
import { subscriptions, subscriptionInvoices } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanId } from "../products";

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

export const subscriptionBillingRouter = router({
  /**
   * Create a new subscription with 14-day trial
   */
  createSubscription: protectedProcedure
    .input(
      z.object({
        planId: z.enum(["monthly", "quarterly", "annual"]),
        origin: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const plan = SUBSCRIPTION_PLANS[input.planId];

      // Create or retrieve Stripe customer
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

      // Create Stripe price if not exists (in production, create these once)
      const price = await getStripe().prices.create({
        unit_amount: plan.priceInCents,
        currency: "usd",
        recurring: {
          interval: plan.interval,
          interval_count: "intervalCount" in plan ? plan.intervalCount : 1,
        },
        product_data: {
          name: plan.name,
        },
      });

      // Create Stripe subscription with 14-day trial
      const subscription = await getStripe().subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: price.id }],
        trial_period_days: 14,
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        metadata: {
          userId: ctx.user.id.toString(),
          planId: input.planId,
        },
      });

      // Save subscription to database
      await db!.insert(subscriptions).values({
        userId: ctx.user.id,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId,
        stripePriceId: price.id,
        plan: input.planId,
        status: (subscription as any).status as "active" | "canceled" | "past_due" | "unpaid" | "trialing",
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        trialEnd: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000) : undefined,
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create checkout session for payment method setup
      const checkoutSession = await getStripe().checkout.sessions.create({
        customer: stripeCustomerId,
        mode: "setup",
        payment_method_types: ["card"],
        success_url: `${input.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${input.origin}/subscription/cancel`,
        metadata: {
          userId: ctx.user.id.toString(),
          subscriptionId: subscription.id,
        },
      });

      return {
        subscriptionId: subscription.id,
        checkoutUrl: checkoutSession.url,
        trialEnd: subscription.trial_end,
      };
    }),

  /**
   * Get current user's active subscriptions
   */
  getMySubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();

    return await db!
      .select()      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .orderBy(desc(subscriptions.createdAt));
  }),

  /**
   * Cancel subscription at period end
   */
  cancelSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Get subscription from database
      const [subscription] = await db!
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.id, input.subscriptionId),
            eq(subscriptions.userId, ctx.user.id)
          )
        );

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      // Cancel at Stripe
      const updated = await getStripe().subscriptions.update(
        subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

      // Update database
      await db!
        .update(subscriptions)
        .set({
          cancelAtPeriodEnd: true,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, input.subscriptionId));

      return { success: true, cancelAt: (updated as any).current_period_end };
    }),

  /**
   * Reactivate cancelled subscription
   */
  reactivateSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Get subscription from database
      const [subscription] = await db!
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.id, input.subscriptionId),
            eq(subscriptions.userId, ctx.user.id)
          )
        );

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      // Reactivate at Stripe
      await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      // Update database
      await db!
        .update(subscriptions)
        .set({
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, input.subscriptionId));

      return { success: true };
    }),

  /**
   * Upgrade/downgrade subscription
   */
  changeSubscriptionPlan: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.number(),
        newPlanId: z.enum(["monthly", "quarterly", "annual"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Get subscription from database
      const [subscription] = await db!
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.id, input.subscriptionId),
            eq(subscriptions.userId, ctx.user.id)
          )
        );

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      const newPlan = SUBSCRIPTION_PLANS[input.newPlanId];

      // Create new price
      const price = await getStripe().prices.create({
        unit_amount: newPlan.priceInCents,
        currency: "usd",
        recurring: {
          interval: newPlan.interval,
          interval_count: "intervalCount" in newPlan ? newPlan.intervalCount : 1,
        },
        product_data: {
          name: newPlan.name,
        },
      });

      // Update Stripe subscription
      const stripeSubscription = await getStripe().subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );
      await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: price.id,
          },
        ],
        proration_behavior: "create_prorations",
      });

      // Update database
      await db!
        .update(subscriptions)
        .set({
          stripePriceId: price.id,
          plan: input.newPlanId,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, input.subscriptionId));

      return { success: true };
    }),

  /**
   * Get subscription invoices
   */
  getSubscriptionInvoices: protectedProcedure
    .input(z.object({ subscriptionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();

      // Verify subscription ownership
      const [subscription] = await db!
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.id, input.subscriptionId),
            eq(subscriptions.userId, ctx.user.id)
          )
        );

      if (!subscription) {
        throw new Error("Subscription not found");
      }

      return await db!
        .select()
        .from(subscriptionInvoices)
        .where(eq(subscriptionInvoices.subscriptionId, input.subscriptionId))
        .orderBy(desc(subscriptionInvoices.createdAt));
    }),

  /**
   * Get subscription analytics
   */
  getSubscriptionAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();

    const userSubscriptions = await db!
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id));

    const activeSubscriptions = userSubscriptions.filter(
      (s) => s.status === "active" || s.status === "trialing"
    );

    const totalSpent = userSubscriptions.reduce((sum, sub) => {
      const plan = SUBSCRIPTION_PLANS[sub.plan as SubscriptionPlanId];
      return sum + (plan?.priceInCents || 0);
    }, 0);

    return {
      totalSubscriptions: userSubscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      totalSpent: totalSpent / 100, // Convert to dollars
      subscriptions: userSubscriptions,
    };
  }),
});
