/**
 * SintraPrime Rate Limiting Router
 * In-memory rate limiting for AI endpoints with configurable limits per tier.
 * Also exposes a status endpoint for monitoring.
 */
import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";

// In-memory rate limit store (per userId per endpoint per window)
const rateLimitStore = new Map<string, { count: number; windowStart: number; blocked: boolean }>();

const RATE_LIMITS: Record<string, { windowMs: number; maxRequests: number; tier?: string }> = {
  "ai.sendMessage": { windowMs: 60_000, maxRequests: 30 }, // 30 AI messages per minute
  "ai.chat": { windowMs: 60_000, maxRequests: 30 },
  "documentIntelligence.analyzeText": { windowMs: 60_000, maxRequests: 5 }, // 5 doc analyses per minute
  "documentIntelligence.quickSummarize": { windowMs: 60_000, maxRequests: 10 },
  "aiMemory.extractFromMessage": { windowMs: 60_000, maxRequests: 10 },
  "llmRouterConfig.testModel": { windowMs: 60_000, maxRequests: 5 },
  "slides.generate": { windowMs: 300_000, maxRequests: 3 }, // 3 slide generations per 5 minutes
  "videoGeneration.generate": { windowMs: 3_600_000, maxRequests: 5 }, // 5 video generations per hour
  "default": { windowMs: 60_000, maxRequests: 100 },
};

export function checkRateLimit(userId: number, endpoint: string): { allowed: boolean; remaining: number; resetIn: number } {
  const limit = RATE_LIMITS[endpoint] ?? RATE_LIMITS["default"];
  const key = `${userId}:${endpoint}`;
  const now = Date.now();

  const existing = rateLimitStore.get(key);
  if (!existing || now - existing.windowStart > limit.windowMs) {
    // New window
    rateLimitStore.set(key, { count: 1, windowStart: now, blocked: false });
    return { allowed: true, remaining: limit.maxRequests - 1, resetIn: limit.windowMs };
  }

  if (existing.count >= limit.maxRequests) {
    existing.blocked = true;
    const resetIn = limit.windowMs - (now - existing.windowStart);
    return { allowed: false, remaining: 0, resetIn };
  }

  existing.count++;
  return { allowed: true, remaining: limit.maxRequests - existing.count, resetIn: limit.windowMs - (now - existing.windowStart) };
}

export const rateLimitRouter = router({
  /** Get rate limit status for the current user */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const status: Record<string, { count: number; limit: number; remaining: number; windowMs: number }> = {};

    for (const [endpoint, limit] of Object.entries(RATE_LIMITS)) {
      if (endpoint === "default") continue;
      const key = `${userId}:${endpoint}`;
      const existing = rateLimitStore.get(key);
      const now = Date.now();
      const isExpired = !existing || now - existing.windowStart > limit.windowMs;
      const count = isExpired ? 0 : existing.count;
      status[endpoint] = {
        count,
        limit: limit.maxRequests,
        remaining: Math.max(0, limit.maxRequests - count),
        windowMs: limit.windowMs,
      };
    }

    return status;
  }),

  /** Get all rate limit configurations (admin only) */
  getConfig: adminProcedure.query(async () => {
    return Object.entries(RATE_LIMITS).map(([endpoint, config]) => ({
      endpoint,
      ...config,
    }));
  }),

  /** Reset rate limits for a user (admin only) */
  resetForUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      let cleared = 0;
      for (const key of rateLimitStore.keys()) {
        if (key.startsWith(`${input.userId}:`)) {
          rateLimitStore.delete(key);
          cleared++;
        }
      }
      return { success: true, cleared };
    }),

  /** Get global rate limit stats (admin only) */
  getGlobalStats: adminProcedure.query(async () => {
    const now = Date.now();
    let totalActive = 0;
    let totalBlocked = 0;
    const endpointStats: Record<string, { activeUsers: number; blockedUsers: number }> = {};

    for (const [key, value] of rateLimitStore.entries()) {
      const [, endpoint] = key.split(":");
      const limit = RATE_LIMITS[endpoint] ?? RATE_LIMITS["default"];
      const isExpired = now - value.windowStart > limit.windowMs;
      if (isExpired) continue;

      totalActive++;
      if (!endpointStats[endpoint]) endpointStats[endpoint] = { activeUsers: 0, blockedUsers: 0 };
      endpointStats[endpoint].activeUsers++;

      if (value.blocked) {
        totalBlocked++;
        endpointStats[endpoint].blockedUsers++;
      }
    }

    return { totalActive, totalBlocked, endpointStats };
  }),
});
