/**
 * Subscription Plans for SintraPrime Tax Preparation Services
 * 
 * These plans provide recurring access to tax preparation services
 * with automatic invoice generation and payment processing.
 */

export const SUBSCRIPTION_PLANS = {
  monthly: {
    name: "Monthly Tax Prep Plan",
    priceInCents: 9900, // $99/month
    interval: "month" as const,
    description: "Monthly subscription for ongoing tax preparation services",
    features: [
      "Unlimited Form 1041 filings",
      "CPA collaboration access",
      "Priority support",
      "Monthly tax strategy consultation",
    ],
  },
  quarterly: {
    name: "Quarterly Tax Prep Plan",
    priceInCents: 24900, // $249/quarter (save $48/year)
    interval: "month" as const,
    intervalCount: 3,
    description: "Quarterly subscription with 16% savings",
    features: [
      "Unlimited Form 1041 filings",
      "CPA collaboration access",
      "Priority support",
      "Quarterly tax strategy consultation",
      "16% savings vs monthly",
    ],
  },
  annual: {
    name: "Annual Tax Prep Plan",
    priceInCents: 89900, // $899/year (save $289/year)
    interval: "year" as const,
    description: "Annual subscription with 24% savings",
    features: [
      "Unlimited Form 1041 filings",
      "CPA collaboration access",
      "Priority support",
      "Quarterly tax strategy consultations",
      "Annual tax planning session",
      "24% savings vs monthly",
    ],
  },
} as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;
