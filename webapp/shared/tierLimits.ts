/**
 * SintraPrime Tier Limits & Feature Gates
 * 
 * Defines what each subscription tier can access.
 * Used by both server (enforcement) and client (UI gating).
 */

export type TierKey = "free" | "pro" | "coalition" | "enterprise";

export interface TierLimits {
  maxCases: number;
  maxAiMessagesPerDay: number;
  maxStorageMB: number;
  maxCoalitionMembers: number;
  features: {
    fileUploads: boolean;
    quantumWorkspace: boolean;
    warfareStrategies: boolean;
    coalitions: boolean;
    legalAlerts: boolean;
    maxAlertsPerMonth: number;
    documentTemplatesAll: boolean;
    deadlineCalculator: boolean;
    paymentHistory: boolean;
    customerPortal: boolean;
  };
}

export const TIER_LIMITS: Record<TierKey, TierLimits> = {
  free: {
    maxCases: 2,
    maxAiMessagesPerDay: 10,
    maxStorageMB: 50,
    maxCoalitionMembers: 0,
    features: {
      fileUploads: false,
      quantumWorkspace: false,
      warfareStrategies: false,
      coalitions: false,
      legalAlerts: false,
      maxAlertsPerMonth: 0,
      documentTemplatesAll: false,
      deadlineCalculator: true,
      paymentHistory: false,
      customerPortal: false,
    },
  },
  pro: {
    maxCases: Infinity,
    maxAiMessagesPerDay: Infinity,
    maxStorageMB: 5120, // 5GB
    maxCoalitionMembers: 0,
    features: {
      fileUploads: true,
      quantumWorkspace: true,
      warfareStrategies: true,
      coalitions: false,
      legalAlerts: true,
      maxAlertsPerMonth: 10,
      documentTemplatesAll: true,
      deadlineCalculator: true,
      paymentHistory: true,
      customerPortal: true,
    },
  },
  coalition: {
    maxCases: Infinity,
    maxAiMessagesPerDay: Infinity,
    maxStorageMB: 25600, // 25GB
    maxCoalitionMembers: 10,
    features: {
      fileUploads: true,
      quantumWorkspace: true,
      warfareStrategies: true,
      coalitions: true,
      legalAlerts: true,
      maxAlertsPerMonth: Infinity,
      documentTemplatesAll: true,
      deadlineCalculator: true,
      paymentHistory: true,
      customerPortal: true,
    },
  },
  enterprise: {
    maxCases: Infinity,
    maxAiMessagesPerDay: Infinity,
    maxStorageMB: 102400, // 100GB
    maxCoalitionMembers: Infinity,
    features: {
      fileUploads: true,
      quantumWorkspace: true,
      warfareStrategies: true,
      coalitions: true,
      legalAlerts: true,
      maxAlertsPerMonth: Infinity,
      documentTemplatesAll: true,
      deadlineCalculator: true,
      paymentHistory: true,
      customerPortal: true,
    },
  },
};

export function getTierLimits(tier: string): TierLimits {
  return TIER_LIMITS[(tier as TierKey)] || TIER_LIMITS.free;
}

export function canAccessFeature(tier: string, feature: keyof TierLimits["features"]): boolean {
  const limits = getTierLimits(tier);
  return !!limits.features[feature];
}

export function getRequiredTier(feature: keyof TierLimits["features"]): TierKey {
  const tiers: TierKey[] = ["free", "pro", "coalition", "enterprise"];
  for (const tier of tiers) {
    if (TIER_LIMITS[tier].features[feature]) return tier;
  }
  return "enterprise";
}
