import { describe, it, expect } from "vitest";
import { getTierLimits, canAccessFeature, getRequiredTier, TIER_LIMITS, type TierKey } from "../shared/tierLimits";

describe("Tier Limits System", () => {
  describe("getTierLimits", () => {
    it("returns free tier limits for unknown tier", () => {
      const limits = getTierLimits("unknown");
      expect(limits).toEqual(TIER_LIMITS.free);
    });

    it("returns correct limits for each tier", () => {
      const tiers: TierKey[] = ["free", "pro", "coalition", "enterprise"];
      for (const tier of tiers) {
        const limits = getTierLimits(tier);
        expect(limits).toEqual(TIER_LIMITS[tier]);
      }
    });

    it("free tier has correct case limit", () => {
      const limits = getTierLimits("free");
      expect(limits.maxCases).toBe(2);
    });

    it("free tier has correct AI message limit", () => {
      const limits = getTierLimits("free");
      expect(limits.maxAiMessagesPerDay).toBe(10);
    });

    it("pro tier has unlimited cases", () => {
      const limits = getTierLimits("pro");
      expect(limits.maxCases).toBe(Infinity);
    });

    it("pro tier has unlimited AI messages", () => {
      const limits = getTierLimits("pro");
      expect(limits.maxAiMessagesPerDay).toBe(Infinity);
    });

    it("coalition tier allows 10 coalition members", () => {
      const limits = getTierLimits("coalition");
      expect(limits.maxCoalitionMembers).toBe(10);
    });

    it("enterprise tier has 100GB storage", () => {
      const limits = getTierLimits("enterprise");
      expect(limits.maxStorageMB).toBe(102400);
    });
  });

  describe("canAccessFeature", () => {
    it("free tier cannot access file uploads", () => {
      expect(canAccessFeature("free", "fileUploads")).toBe(false);
    });

    it("free tier cannot access quantum workspace", () => {
      expect(canAccessFeature("free", "quantumWorkspace")).toBe(false);
    });

    it("free tier cannot access warfare strategies", () => {
      expect(canAccessFeature("free", "warfareStrategies")).toBe(false);
    });

    it("free tier cannot access coalitions", () => {
      expect(canAccessFeature("free", "coalitions")).toBe(false);
    });

    it("free tier CAN access deadline calculator", () => {
      expect(canAccessFeature("free", "deadlineCalculator")).toBe(true);
    });

    it("pro tier can access file uploads", () => {
      expect(canAccessFeature("pro", "fileUploads")).toBe(true);
    });

    it("pro tier can access quantum workspace", () => {
      expect(canAccessFeature("pro", "quantumWorkspace")).toBe(true);
    });

    it("pro tier can access warfare strategies", () => {
      expect(canAccessFeature("pro", "warfareStrategies")).toBe(true);
    });

    it("pro tier cannot access coalitions", () => {
      expect(canAccessFeature("pro", "coalitions")).toBe(false);
    });

    it("coalition tier can access coalitions", () => {
      expect(canAccessFeature("coalition", "coalitions")).toBe(true);
    });

    it("enterprise tier can access everything", () => {
      const features = Object.keys(TIER_LIMITS.enterprise.features) as Array<keyof typeof TIER_LIMITS.enterprise.features>;
      for (const feature of features) {
        if (feature === "maxAlertsPerMonth") continue; // numeric, not boolean
        expect(canAccessFeature("enterprise", feature)).toBe(true);
      }
    });

    it("unknown tier defaults to free tier access", () => {
      expect(canAccessFeature("unknown", "fileUploads")).toBe(false);
      expect(canAccessFeature("unknown", "deadlineCalculator")).toBe(true);
    });
  });

  describe("getRequiredTier", () => {
    it("deadline calculator requires free tier", () => {
      expect(getRequiredTier("deadlineCalculator")).toBe("free");
    });

    it("file uploads require pro tier", () => {
      expect(getRequiredTier("fileUploads")).toBe("pro");
    });

    it("quantum workspace requires pro tier", () => {
      expect(getRequiredTier("quantumWorkspace")).toBe("pro");
    });

    it("warfare strategies require pro tier", () => {
      expect(getRequiredTier("warfareStrategies")).toBe("pro");
    });

    it("coalitions require coalition tier", () => {
      expect(getRequiredTier("coalitions")).toBe("coalition");
    });

    it("legal alerts require pro tier", () => {
      expect(getRequiredTier("legalAlerts")).toBe("pro");
    });

    it("payment history requires pro tier", () => {
      expect(getRequiredTier("paymentHistory")).toBe("pro");
    });

    it("customer portal requires pro tier", () => {
      expect(getRequiredTier("customerPortal")).toBe("pro");
    });
  });

  describe("Tier Hierarchy", () => {
    it("each higher tier has at least as many features as the lower tier", () => {
      const tiers: TierKey[] = ["free", "pro", "coalition", "enterprise"];
      for (let i = 1; i < tiers.length; i++) {
        const lower = TIER_LIMITS[tiers[i - 1]];
        const higher = TIER_LIMITS[tiers[i]];
        
        // Higher tier should have >= cases
        expect(higher.maxCases).toBeGreaterThanOrEqual(lower.maxCases);
        // Higher tier should have >= AI messages
        expect(higher.maxAiMessagesPerDay).toBeGreaterThanOrEqual(lower.maxAiMessagesPerDay);
        // Higher tier should have >= storage
        expect(higher.maxStorageMB).toBeGreaterThanOrEqual(lower.maxStorageMB);
      }
    });

    it("no feature available in lower tier is locked in higher tier", () => {
      const tiers: TierKey[] = ["free", "pro", "coalition", "enterprise"];
      const booleanFeatures = ["fileUploads", "quantumWorkspace", "warfareStrategies", "coalitions", "legalAlerts", "documentTemplatesAll", "deadlineCalculator", "paymentHistory", "customerPortal"] as const;

      for (let i = 1; i < tiers.length; i++) {
        const lower = TIER_LIMITS[tiers[i - 1]];
        const higher = TIER_LIMITS[tiers[i]];
        
        for (const feature of booleanFeatures) {
          if (lower.features[feature] === true) {
            expect(higher.features[feature]).toBe(true);
          }
        }
      }
    });
  });

  describe("Pricing Consistency", () => {
    it("free tier has 50MB storage", () => {
      expect(TIER_LIMITS.free.maxStorageMB).toBe(50);
    });

    it("pro tier has 5GB storage", () => {
      expect(TIER_LIMITS.pro.maxStorageMB).toBe(5120);
    });

    it("coalition tier has 25GB storage", () => {
      expect(TIER_LIMITS.coalition.maxStorageMB).toBe(25600);
    });

    it("enterprise tier has 100GB storage", () => {
      expect(TIER_LIMITS.enterprise.maxStorageMB).toBe(102400);
    });

    it("free tier has 0 coalition members", () => {
      expect(TIER_LIMITS.free.maxCoalitionMembers).toBe(0);
    });

    it("pro tier has 0 coalition members", () => {
      expect(TIER_LIMITS.pro.maxCoalitionMembers).toBe(0);
    });

    it("coalition tier has 10 coalition members", () => {
      expect(TIER_LIMITS.coalition.maxCoalitionMembers).toBe(10);
    });

    it("enterprise tier has unlimited coalition members", () => {
      expect(TIER_LIMITS.enterprise.maxCoalitionMembers).toBe(Infinity);
    });
  });
});
