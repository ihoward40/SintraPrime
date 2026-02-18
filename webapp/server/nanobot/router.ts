import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as nanobotDb from "../db/nanobot-helpers";
import { diagnosisEngine } from "./diagnosis-engine";
import { approvalWorkflow } from "./approval-workflow";
import { repairSystem } from "./repair-system";

export const nanobotRouter = router({
  // Get system health status
  getHealthStatus: protectedProcedure.query(async () => {
    return await nanobotDb.getSystemHealthStatus();
  }),

  // Get recent health checks
  getHealthChecks: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      return await nanobotDb.getRecentHealthChecks(input.limit);
    }),

  // Get error statistics
  getErrorStats: protectedProcedure.query(async () => {
    return await nanobotDb.getErrorStats();
  }),

  // Get unresolved errors
  getUnresolvedErrors: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      return await nanobotDb.getUnresolvedErrors(input.limit);
    }),

  // Get repair history
  getRepairHistory: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      return await nanobotDb.getRepairHistory(input.limit);
    }),

  // Get repair statistics
  getRepairStats: protectedProcedure.query(async () => {
    return await nanobotDb.getRepairStats();
  }),

  // Get learning entries
  getLearningEntries: protectedProcedure.query(async () => {
    return await nanobotDb.getLearningEntries();
  }),

  // Manually trigger diagnosis for an error
  diagnoseError: protectedProcedure
    .input(z.object({
      errorId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const error = await nanobotDb.getErrorById(input.errorId);
      if (!error) {
        throw new Error("Error not found");
      }
      return await diagnosisEngine.diagnose(error);
    }),

  // Manually trigger repair for an error
  repairError: protectedProcedure
    .input(z.object({
      errorId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const error = await nanobotDb.getErrorById(input.errorId);
      if (!error) {
        throw new Error("Error not found");
      }
      return await repairSystem.repair(error);
    }),

  // Get system metrics summary
  getMetricsSummary: protectedProcedure.query(async () => {
    return await nanobotDb.getMetricsSummary();
  }),

  // Get dashboard overview
  getDashboardOverview: protectedProcedure.query(async () => {
    const [healthStatus, errorStats, repairStats, metricsSummary] = await Promise.all([
      nanobotDb.getSystemHealthStatus(),
      nanobotDb.getErrorStats(),
      nanobotDb.getRepairStats(),
      nanobotDb.getMetricsSummary(),
    ]);

    return {
      health: healthStatus,
      errors: errorStats,
      repairs: repairStats,
      metrics: metricsSummary,
      uptime: process.uptime(),
      lastChecked: new Date(),
    };
  }),

  // Repair approval workflow
  getPendingApprovals: protectedProcedure.query(async () => {
    return await approvalWorkflow.getPendingApprovals();
  }),

  approveRepair: protectedProcedure
    .input(
      z.object({
        repairId: z.number(),
        approvedBy: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await approvalWorkflow.approveRepair(input.repairId, input.approvedBy);
    }),

  rejectRepair: protectedProcedure
    .input(
      z.object({
        repairId: z.number(),
        rejectedBy: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await approvalWorkflow.rejectRepair(input.repairId, input.rejectedBy, input.reason);
    }),
});
