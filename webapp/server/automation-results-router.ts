import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import {
  createAutomationResult,
  updateAutomationResult,
  getUserAutomationResults,
  getAutomationResultsByType,
  trackDemoUsage,
  getUserDemoMetrics
} from "./automation-results-db";

export const automationResultsRouter = router({
  /**
   * Create a new automation result
   */
  create: protectedProcedure
    .input(z.object({
      demoType: z.string(),
      sessionId: z.string(),
      resultData: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await createAutomationResult({
        userId: ctx.user.id,
        demoType: input.demoType,
        sessionId: input.sessionId,
        status: "running",
        startedAt: new Date(),
        resultData: input.resultData || "",
      });
    }),

  /**
   * Update automation result (mark complete/failed)
   */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["running", "completed", "failed"]).optional(),
      errorMessage: z.string().optional(),
      recordingUrl: z.string().optional(),
      resultData: z.string().optional(),
      duration: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return await updateAutomationResult(id, {
        ...updates,
        completedAt: updates.status === "completed" || updates.status === "failed" ? new Date() : undefined,
      });
    }),

  /**
   * Get user's automation results
   */
  list: protectedProcedure
    .input(z.object({
      demoType: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return await getUserAutomationResults(ctx.user.id, input);
    }),

  /**
   * Get results by demo type
   */
  byType: protectedProcedure
    .input(z.object({
      demoType: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      return await getAutomationResultsByType(ctx.user.id, input.demoType);
    }),

  /**
   * Delete automation result
   */
  deleteResult: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Note: In production, add user ownership check
      return await updateAutomationResult(input.id, { status: "failed" as const });
    }),

  /**
   * Track demo usage metrics
   */
  trackUsage: protectedProcedure
    .input(z.object({
      demoType: z.string(),
      duration: z.number(),
      success: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      await trackDemoUsage(ctx.user.id, input.demoType, input.duration, input.success);
      return { success: true };
    }),

  /**
   * Get user's demo usage metrics
   */
  metrics: protectedProcedure
    .query(async ({ ctx }) => {
      return await getUserDemoMetrics(ctx.user.id);
    }),
});
