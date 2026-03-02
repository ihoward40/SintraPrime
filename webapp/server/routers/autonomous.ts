import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

/**
 * Autonomous Tasks tRPC Router
 * Provides create, read, update, delete operations for autonomous tasks
 * with comprehensive error logging and validation.
 */
export const autonomousRouter = router({
  /**
   * Create a new autonomous task
   * POST /api/trpc/autonomous.create
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        objective: z.string().optional(),
        priority: z
          .enum(["low", "medium", "high", "critical"])
          .optional()
          .default("medium"),
        status: z
          .enum(["pending", "running", "completed", "failed"])
          .optional()
          .default("pending"),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const requestId = `${Date.now()}-${Math.random()}`;
      const userId = ctx.user.id;

      try {
        console.log("[Autonomous.create] Request received:", {
          requestId,
          userId,
          title: input.title,
          timestamp: new Date().toISOString(),
        });

        // Validate authentication context
        if (!userId) {
          const error = "User ID not found in context";
          console.error("[Autonomous.create] Authentication error:", {
            requestId,
            error,
          });
          throw new Error(error);
        }

        // Prepare task data
        const taskData = {
          userId,
          title: input.title,
          description: input.description,
          objective: input.objective,
          priority: input.priority || "medium",
          status: input.status || "pending",
          tags: input.tags,
          createdAt: new Date(),
        };

        console.log("[Autonomous.create] Creating task:", {
          requestId,
          userId,
          title: input.title,
          priority: input.priority,
        });

        // Create task in database
        const result = await db.createAutonomousTask(taskData);

        if (!result) {
          throw new Error("Database returned null result");
        }

        console.log("[Autonomous.create] Success:", {
          requestId,
          taskId: result.id,
          userId,
          title: result.title,
          timestamp: new Date().toISOString(),
        });

        return result;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        console.error("[Autonomous.create] Failed:", {
          requestId,
          userId,
          error: errorMsg,
          stack: errorStack,
          title: input.title,
          timestamp: new Date().toISOString(),
        });

        // Return user-friendly error message
        throw new Error(
          `Failed to create autonomous task: ${errorMsg.substring(0, 200)}`
        );
      }
    }),

  /**
   * List all autonomous tasks for the current user
   * GET /api/trpc/autonomous.list
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    try {
      console.log("[Autonomous.list] Fetching tasks for user:", {
        userId,
        timestamp: new Date().toISOString(),
      });

      const tasks = await db.getAutonomousTasksByUserId(userId);

      console.log("[Autonomous.list] Success:", {
        userId,
        count: tasks.length,
        timestamp: new Date().toISOString(),
      });

      return tasks;
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);

      console.error("[Autonomous.list] Failed:", {
        userId,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });

      // Return empty list on error to prevent UI breakage
      return [];
    }
  }),

  /**
   * Get a specific autonomous task by ID
   * GET /api/trpc/autonomous.get?id=123
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      try {
        console.log("[Autonomous.get] Fetching task:", {
          taskId: input.id,
          userId,
        });

        const task = await db.getAutonomousTaskById(input.id);

        if (!task) {
          console.warn("[Autonomous.get] Task not found:", {
            taskId: input.id,
            userId,
          });
          return null;
        }

        // Verify ownership
        if (task.userId !== String(userId)) {
          console.warn("[Autonomous.get] Unauthorized access attempt:", {
            taskId: input.id,
            requestingUser: userId,
            taskOwner: task.userId,
          });
          throw new Error("Unauthorized: You do not own this task");
        }

        console.log("[Autonomous.get] Success:", {
          taskId: input.id,
          userId,
        });

        return task;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);

        console.error("[Autonomous.get] Failed:", {
          taskId: input.id,
          userId,
          error: errorMsg,
        });

        throw new Error(`Failed to fetch task: ${errorMsg}`);
      }
    }),

  /**
   * Update an autonomous task
   * PATCH /api/trpc/autonomous.update
   */
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
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { id, ...updates } = input;
      const requestId = `${Date.now()}-${Math.random()}`;

      try {
        console.log("[Autonomous.update] Request received:", {
          requestId,
          taskId: id,
          userId,
          updatedFields: Object.keys(updates),
        });

        // Verify task exists and belongs to user
        const existingTask = await db.getAutonomousTaskById(id);
        if (!existingTask) {
          throw new Error(`Task not found: ${id}`);
        }

        if (existingTask.userId !== String(userId)) {
          throw new Error("Unauthorized: You do not own this task");
        }

        // Perform update
        const result = await db.updateAutonomousTask(id, updates);

        if (!result) {
          throw new Error("Update returned no result");
        }

        console.log("[Autonomous.update] Success:", {
          requestId,
          taskId: id,
          userId,
          updatedFields: Object.keys(updates),
        });

        return result;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);

        console.error("[Autonomous.update] Failed:", {
          requestId,
          taskId: id,
          userId,
          error: errorMsg,
        });

        throw new Error(`Failed to update task: ${errorMsg}`);
      }
    }),

  /**
   * Delete an autonomous task
   * DELETE /api/trpc/autonomous.delete?id=123
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const requestId = `${Date.now()}-${Math.random()}`;

      try {
        console.log("[Autonomous.delete] Request received:", {
          requestId,
          taskId: input.id,
          userId,
        });

        // Verify task exists and belongs to user
        const existingTask = await db.getAutonomousTaskById(input.id);
        if (!existingTask) {
          throw new Error(`Task not found: ${input.id}`);
        }

        if (existingTask.userId !== String(userId)) {
          throw new Error("Unauthorized: You do not own this task");
        }

        // Perform deletion
        await db.deleteAutonomousTask(input.id);

        console.log("[Autonomous.delete] Success:", {
          requestId,
          taskId: input.id,
          userId,
        });

        return { success: true, id: input.id };
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : String(error);

        console.error("[Autonomous.delete] Failed:", {
          requestId,
          taskId: input.id,
          userId,
          error: errorMsg,
        });

        throw new Error(`Failed to delete task: ${errorMsg}`);
      }
    }),
});
