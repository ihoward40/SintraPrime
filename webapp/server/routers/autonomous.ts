import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const autonomousRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        objective: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        status: z.enum(["pending", "running", "completed", "failed"]).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create autonomous task record
      const result = await db.createAutonomousTask({
        userId: ctx.user.id,
        title: input.title,
        description: input.description,
        objective: input.objective,
        priority: input.priority || "medium",
        status: input.status || "pending",
        tags: input.tags,
        createdAt: new Date(),
      });

      return result;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return await db.getAutonomousTasksByUserId(ctx.user.id);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getAutonomousTaskById(input.id);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        objective: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        status: z.enum(["pending", "running", "completed", "failed"]).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return await db.updateAutonomousTask(id, updates);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await db.deleteAutonomousTask(input.id);
    }),
});
