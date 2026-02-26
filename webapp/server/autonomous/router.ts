import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const autonomousRouter = router({
  // Create a new autonomous task
  createTask: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        objective: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        context: z.string().optional(),
        assignedAgentId: z.string().optional(),
        executionPlan: z.any().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.createAutonomousTask({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        objective: input.objective,
        priority: input.priority || "medium",
        status: "queued",
        context: input.context,
        assignedAgentId: input.assignedAgentId,
        executionPlan: input.executionPlan,
        tags: input.tags,
      });
    }),

  // Get task by ID
  getTask: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getAutonomousTaskById(input.id);
    }),

  // Get all tasks for current user
  getUserTasks: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "running", "completed", "failed", "queued"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const tasks = await db.getAutonomousTasksByUserId(ctx.user.id);
      
      if (input.status) {
        return tasks.filter(t => t.status === input.status);
      }
      return tasks;
    }),

  // Update task
  updateTask: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        objective: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        status: z.enum(["pending", "running", "completed", "failed", "queued"]).optional(),
        context: z.string().optional(),
        assignedAgentId: z.string().optional(),
        executionPlan: z.any().optional(),
        result: z.any().optional(),
        aiTokensUsed: z.number().optional(),
        executionTimeMs: z.number().optional(),
        startedAt: z.date().optional(),
        completedAt: z.date().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await db.updateAutonomousTask(input.id, {
        title: input.title,
        description: input.description,
        objective: input.objective,
        priority: input.priority,
        status: input.status,
        context: input.context,
        assignedAgentId: input.assignedAgentId,
        executionPlan: input.executionPlan,
        result: input.result,
        aiTokensUsed: input.aiTokensUsed,
        executionTimeMs: input.executionTimeMs,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
        tags: input.tags,
      });
    }),

  // Delete task
  deleteTask: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.deleteAutonomousTask(input.id);
    }),

  // Get task stats
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const tasks = await db.getAutonomousTasksByUserId(ctx.user.id);
      
      const stats = {
        total: tasks.length,
        queued: tasks.filter(t => t.status === "queued").length,
        running: tasks.filter(t => t.status === "running").length,
        completed: tasks.filter(t => t.status === "completed").length,
        failed: tasks.filter(t => t.status === "failed").length,
        pending: tasks.filter(t => t.status === "pending").length,
      };
      
      return stats;
    }),
});
