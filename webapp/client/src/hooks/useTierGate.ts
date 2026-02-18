import { trpc } from "@/lib/trpc";
import { getTierLimits, canAccessFeature, getRequiredTier, type TierKey } from "@shared/tierLimits";

export function useTierGate() {
  const { data: tierData, isLoading } = trpc.subscription.tierLimits.useQuery(undefined, {
    staleTime: 30000, // Cache for 30 seconds
  });

  const tier = (tierData?.tier || "free") as TierKey;
  const limits = tierData?.limits || getTierLimits("free");
  const usage = tierData?.usage || { cases: 0, aiMessagesToday: 0 };

  return {
    tier,
    limits,
    usage,
    isLoading,
    canAccess: (feature: keyof typeof limits.features) => canAccessFeature(tier, feature),
    requiredTier: (feature: keyof typeof limits.features) => getRequiredTier(feature),
    canCreateCase: usage.cases < limits.maxCases,
    canSendAiMessage: usage.aiMessagesToday < limits.maxAiMessagesPerDay,
    casesRemaining: Math.max(0, limits.maxCases - usage.cases),
    aiMessagesRemaining: limits.maxAiMessagesPerDay === Infinity ? Infinity : Math.max(0, limits.maxAiMessagesPerDay - usage.aiMessagesToday),
  };
}
