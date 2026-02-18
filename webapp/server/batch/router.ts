/**
 * Batch Processing tRPC Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { batchProcessor, batchScrape, batchGenerateVideos } from "./processor";

export const batchRouter = router({
  /**
   * Start batch scraping job
   */
  startScraping: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        url: z.string(),
        template: z.string(),
        params: z.record(z.string(), z.any())
      })),
      concurrency: z.number().optional().default(3)
    }))
    .mutation(async ({ ctx, input }) => {
      const results = await batchScrape(input.items, input.concurrency);

      return {
        success: true,
        results
      };
    }),

  /**
   * Start batch video generation job
   */
  startVideoGeneration: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        templateKey: z.string(),
        customizations: z.record(z.string(), z.any())
      })),
      concurrency: z.number().optional().default(2)
    }))
    .mutation(async ({ ctx, input }) => {
      const results = await batchGenerateVideos(input.items, input.concurrency);

      return {
        success: true,
        results
      };
    }),

  /**
   * Get batch job status
   */
  getJobStatus: protectedProcedure
    .input(z.object({
      jobId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const status = batchProcessor.getJobStatus(input.jobId);

      return {
        status
      };
    }),

  /**
   * Cancel batch job
   */
  cancelJob: protectedProcedure
    .input(z.object({
      jobId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const cancelled = batchProcessor.cancelJob(input.jobId);

      return {
        success: cancelled
      };
    }),

  /**
   * Get all active jobs
   */
  getActiveJobs: protectedProcedure
    .query(async ({ ctx }) => {
      const jobs = batchProcessor.getActiveJobs();

      return {
        jobs
      };
    })
});
