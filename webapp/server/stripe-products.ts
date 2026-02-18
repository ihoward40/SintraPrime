/**
 * SintraPrime Subscription Products
 * 
 * These are the product definitions for Stripe checkout.
 * Products and prices are created dynamically on first use.
 */

export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    priceMonthly: 0,
    features: [
      "Up to 2 active cases",
      "Basic document templates (4)",
      "AI Companion (10 messages/day)",
      "Deadline calculator",
      "Evidence management (50MB storage)",
    ],
  },
  pro: {
    name: "Pro",
    priceMonthly: 2900, // $29.00 in cents
    features: [
      "Unlimited active cases",
      "All document templates",
      "AI Companion (unlimited)",
      "Deadline calculator",
      "Evidence management (5GB storage)",
      "File uploads (PDF, DOC, images)",
      "Quantum Workspace",
      "7-Front Warfare Strategy Planner",
      "Legal Alerts (10/month)",
      "Email support",
    ],
  },
  coalition: {
    name: "Coalition",
    priceMonthly: 7900, // $79.00 in cents
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "Coalition workspace",
      "Shared case management",
      "Evidence management (25GB storage)",
      "Real-time collaboration",
      "Unlimited Legal Alerts",
      "Task assignment & tracking",
      "Priority support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    priceMonthly: 19900, // $199.00 in cents
    features: [
      "Everything in Coalition",
      "Unlimited team members",
      "Custom branding",
      "API access",
      "Evidence management (100GB storage)",
      "Advanced analytics & reporting",
      "Dedicated account manager",
      "Custom document templates",
      "SSO / SAML authentication",
      "Audit logs",
      "24/7 phone support",
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
