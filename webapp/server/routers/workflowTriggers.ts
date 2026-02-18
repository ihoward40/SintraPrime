import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { workflowTriggers, triggerExecutions, workflows } from '../../drizzle/schema';
import { desc, eq, and } from 'drizzle-orm';

export const workflowTriggersRouter = router({
  /**
   * List all workflow triggers for the current user
   */
  list: protectedProcedure
    .input(z.object({
      workflowId: z.number().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const conditions = [eq(workflowTriggers.userId, ctx.user.id)];
      if (input?.workflowId) {
        conditions.push(eq(workflowTriggers.workflowId, input.workflowId));
      }

      const results = await db
        .select()
        .from(workflowTriggers)
        .where(conditions.length > 1 ? and(conditions[0], conditions[1]) : conditions[0])
        .orderBy(desc(workflowTriggers.createdAt));

      return results;
    }),

  /**
   * Create a new workflow trigger
   */
  create: protectedProcedure
    .input(z.object({
      workflowId: z.number(),
      name: z.string(),
      description: z.string().optional(),
      triggerType: z.enum(['email_received', 'audio_transcribed', 'web_change_detected', 'manual']),
      conditions: z.object({
        keywords: z.array(z.string()).optional(),
        patterns: z.array(z.string()).optional(),
        senderEmail: z.array(z.string()).optional(),
        siteId: z.number().optional(),
        severity: z.array(z.string()).optional(),
        caseId: z.number().optional(),
      }).optional(),
      executionParams: z.object({
        autoStart: z.boolean().optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        variables: z.record(z.any()).optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Verify workflow ownership
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, input.workflowId))
        .limit(1);

      if (!workflow) {
        throw new Error('Workflow not found or access denied');
      }

      const result: any = await db.insert(workflowTriggers).values({
        workflowId: input.workflowId,
        userId: ctx.user.id,
        name: input.name,
        description: input.description || null,
        triggerType: input.triggerType,
        conditions: input.conditions || null,
        executionParams: input.executionParams || null,
        isActive: true,
        triggerCount: 0,
      });

      return {
        id: result.insertId || result[0]?.insertId,
        success: true,
      };
    }),

  /**
   * Update a workflow trigger
   */
  update: protectedProcedure
    .input(z.object({
      triggerId: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      conditions: z.object({
        keywords: z.array(z.string()).optional(),
        patterns: z.array(z.string()).optional(),
        senderEmail: z.array(z.string()).optional(),
        siteId: z.number().optional(),
        severity: z.array(z.string()).optional(),
        caseId: z.number().optional(),
      }).optional(),
      executionParams: z.object({
        autoStart: z.boolean().optional(),
        priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        variables: z.record(z.any()).optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const updateData: any = {};
      if (input.name) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.conditions) updateData.conditions = input.conditions;
      if (input.executionParams) updateData.executionParams = input.executionParams;

      await db
        .update(workflowTriggers)
        .set(updateData)
        .where(eq(workflowTriggers.id, input.triggerId));

      return { success: true };
    }),

  /**
   * Toggle trigger active status
   */
  toggle: protectedProcedure
    .input(z.object({
      triggerId: z.number(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      await db
        .update(workflowTriggers)
        .set({ isActive: input.isActive })
        .where(eq(workflowTriggers.id, input.triggerId));

      return { success: true };
    }),

  /**
   * Delete a workflow trigger
   */
  delete: protectedProcedure
    .input(z.object({
      triggerId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      await db
        .delete(workflowTriggers)
        .where(eq(workflowTriggers.id, input.triggerId));

      return { success: true };
    }),

  /**
   * Get trigger execution history
   */
  getExecutionHistory: protectedProcedure
    .input(z.object({
      triggerId: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Get user's triggers
      const userTriggers = await db
        .select({ id: workflowTriggers.id })
        .from(workflowTriggers)
        .where(eq(workflowTriggers.userId, ctx.user.id));

      const triggerIds = userTriggers.map(t => t.id);
      if (triggerIds.length === 0) {
        return [];
      }

      const results = await db
        .select()
        .from(triggerExecutions)
        .where(input.triggerId ? eq(triggerExecutions.triggerId, input.triggerId) : undefined)
        .orderBy(desc(triggerExecutions.triggeredAt))
        .limit(input.limit);

      // Filter to only user's triggers
      return results.filter(exec => triggerIds.includes(exec.triggerId));
    }),
});
