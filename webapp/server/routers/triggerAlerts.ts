import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { triggerPerformanceAlerts, triggerAlertConfig, workflowTriggers, triggerExecutions } from '../../drizzle/schema';
import { z } from 'zod';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';

export const triggerAlertsRouter = router({
  // Get all active alerts
  getActiveAlerts: protectedProcedure
    .input(z.object({
      triggerId: z.number().optional(),
      severity: z.enum(['info', 'warning', 'critical']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const conditions = [
        eq(triggerPerformanceAlerts.isResolved, false),
      ];

      if (input.triggerId) {
        conditions.push(eq(triggerPerformanceAlerts.triggerId, input.triggerId));
      }

      if (input.severity) {
        conditions.push(eq(triggerPerformanceAlerts.severity, input.severity));
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');
      return await db
        .select()
        .from(triggerPerformanceAlerts)
        .where(and(...conditions))
        .orderBy(desc(triggerPerformanceAlerts.createdAt));
    }),

  // Get alert history
  getAlertHistory: protectedProcedure
    .input(z.object({
      triggerId: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const conditions = [];

      if (input.triggerId) {
        conditions.push(eq(triggerPerformanceAlerts.triggerId, input.triggerId));
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const query = db
        .select()
        .from(triggerPerformanceAlerts)
        .orderBy(desc(triggerPerformanceAlerts.createdAt))
        .limit(input.limit);

      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }

      return await query;
    }),

  // Get alert configuration
  getAlertConfig: protectedProcedure
    .input(z.object({
      triggerId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const conditions = [eq(triggerAlertConfig.userId, ctx.user.id)];

      if (input.triggerId) {
        conditions.push(eq(triggerAlertConfig.triggerId, input.triggerId));
      }

      const db = await getDb();
      if (!db) throw new Error('Database not available');
      return await db
        .select()
        .from(triggerAlertConfig)
        .where(and(...conditions));
    }),

  // Update alert configuration
  updateAlertConfig: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      triggerId: z.number().optional(),
      alertType: z.string(),
      enabled: z.boolean(),
      threshold: z.number(),
      checkInterval: z.number(),
      notifyOwner: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      if (input.id) {
        // Update existing config
        await db
          .update(triggerAlertConfig)
          .set({
            enabled: input.enabled,
            threshold: input.threshold.toString(),
            checkInterval: input.checkInterval,
            notifyOwner: input.notifyOwner,
          })
          .where(eq(triggerAlertConfig.id, input.id));

        return { success: true, id: input.id };
      } else {
        // Create new config
        const [result] = await db
          .insert(triggerAlertConfig)
          .values({
            userId: ctx.user.id,
            triggerId: input.triggerId || null,
            alertType: input.alertType,
            enabled: input.enabled,
            threshold: input.threshold.toString(),
            checkInterval: input.checkInterval,
            notifyOwner: input.notifyOwner,
          });

        return { success: true, id: result.insertId };
      }
    }),

  // Resolve alert
  resolveAlert: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      await db
        .update(triggerPerformanceAlerts)
        .set({
          isResolved: true,
          resolvedAt: new Date(),
        })
        .where(eq(triggerPerformanceAlerts.id, input.id));

      return { success: true };
    }),

  // Check trigger performance and create alerts
  checkTriggerPerformance: protectedProcedure
    .input(z.object({
      triggerId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      // Get trigger details
      const [trigger] = await db
        .select()
        .from(workflowTriggers)
        .where(eq(workflowTriggers.id, input.triggerId));

      if (!trigger) {
        throw new Error('Trigger not found');
      }

      // Get executions from last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const executions = await db
        .select()
        .from(triggerExecutions)
        .where(
          and(
            eq(triggerExecutions.triggerId, input.triggerId),
            gte(triggerExecutions.triggeredAt, oneDayAgo)
          )
        );

      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter((e: any) => e.status === 'executed').length;
      const failedExecutions = executions.filter((e: any) => e.status === 'failed').length;

      const alerts = [];

      // Check success rate
      if (totalExecutions > 0) {
        const successRate = (successfulExecutions / totalExecutions) * 100;
        if (successRate < 80) {
          const [alert] = await db
            .insert(triggerPerformanceAlerts)
            .values({
              triggerId: input.triggerId,
              alertType: 'low_success_rate',
              threshold: '80.00',
              currentValue: successRate.toFixed(2),
              message: `Trigger "${trigger.name}" success rate (${successRate.toFixed(1)}%) is below 80%`,
              severity: successRate < 50 ? 'critical' : 'warning',
              isResolved: false,
              notificationSent: false,
            });

          alerts.push({ id: alert.insertId, type: 'low_success_rate', value: successRate });

          // Send notification
          await notifyOwner({
            title: `⚠️ Low Trigger Success Rate`,
            content: `Trigger "${trigger.name}" has a ${successRate.toFixed(1)}% success rate (${successfulExecutions}/${totalExecutions} executions in last 24h)`,
          });
        }
      }

      // Check for no matches in 24 hours
      if (totalExecutions === 0) {
        const [alert] = await db
          .insert(triggerPerformanceAlerts)
          .values({
            triggerId: input.triggerId,
            alertType: 'no_matches',
            threshold: '1.00',
            currentValue: '0.00',
            message: `Trigger "${trigger.name}" has had no matches in the last 24 hours`,
            severity: 'info',
            isResolved: false,
            notificationSent: false,
          });

        alerts.push({ id: alert.insertId, type: 'no_matches', value: 0 });
      }

      return { success: true, alerts };
    }),

  // Get trigger performance metrics
  getTriggerMetrics: protectedProcedure
    .input(z.object({
      triggerId: z.number(),
      days: z.number().default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const daysAgo = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      
      const executions = await db
        .select()
        .from(triggerExecutions)
        .where(
          and(
            eq(triggerExecutions.triggerId, input.triggerId),
            gte(triggerExecutions.triggeredAt, daysAgo)
          )
        );

      const total = executions.length;
      const successful = executions.filter((e: any) => e.status === 'executed').length;
      const failed = executions.filter((e: any) => e.status === 'failed').length;
      const pending = executions.filter((e: any) => e.status === 'pending').length;

      return {
        total,
        successful,
        failed,
        pending,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        failureRate: total > 0 ? (failed / total) * 100 : 0,
      };
    }),
});
