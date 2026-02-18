import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { monitoredSites, siteSnapshots, policyChanges } from '../../drizzle/schema-web-monitoring';
import { desc, eq, and, gte } from 'drizzle-orm';

export const webMonitoringRouter = router({
  /**
   * List all monitored sites for the current user
   */
  listSites: protectedProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const results = await db
        .select()
        .from(monitoredSites)
        .where(eq(monitoredSites.userId, ctx.user.id))
        .orderBy(desc(monitoredSites.createdAt));

      return results;
    }),

  /**
   * Create a new monitored site
   */
  createSite: protectedProcedure
    .input(z.object({
      name: z.string(),
      url: z.string().url(),
      description: z.string().optional(),
      siteType: z.string(),
      checkFrequency: z.string(),
      caseId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const result: any = await db.insert(monitoredSites).values({
        userId: ctx.user.id,
        caseId: input.caseId || null,
        name: input.name,
        url: input.url,
        description: input.description || null,
        siteType: input.siteType,
        checkFrequency: input.checkFrequency,
        isActive: true,
      });

      return {
        id: result.insertId || result[0]?.insertId,
        success: true,
      };
    }),

  /**
   * Delete a monitored site
   */
  deleteSite: protectedProcedure
    .input(z.object({
      siteId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      await db
        .delete(monitoredSites)
        .where(
          and(
            eq(monitoredSites.id, input.siteId),
            eq(monitoredSites.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  /**
   * Toggle site active status
   */
  toggleSite: protectedProcedure
    .input(z.object({
      siteId: z.number(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      await db
        .update(monitoredSites)
        .set({ isActive: input.isActive })
        .where(
          and(
            eq(monitoredSites.id, input.siteId),
            eq(monitoredSites.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  /**
   * Trigger immediate check for a site
   */
  checkNow: protectedProcedure
    .input(z.object({
      siteId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Verify ownership
      const [site] = await db
        .select()
        .from(monitoredSites)
        .where(
          and(
            eq(monitoredSites.id, input.siteId),
            eq(monitoredSites.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!site) {
        throw new Error('Site not found or access denied');
      }

      // Manual check - web monitoring service runs on schedule
      // For now, just update lastChecked timestamp
      await db
        .update(monitoredSites)
        .set({ lastChecked: new Date() })
        .where(eq(monitoredSites.id, input.siteId));

      return { success: true };
    }),

  /**
   * Get recent policy changes
   */
  getRecentChanges: protectedProcedure
    .input(z.object({
      limit: z.number().default(20),
      days: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Get user's monitored sites
      const userSites = await db
        .select({ id: monitoredSites.id })
        .from(monitoredSites)
        .where(eq(monitoredSites.userId, ctx.user.id));

      const siteIds = userSites.map(s => s.id);
      if (siteIds.length === 0) {
        return [];
      }

      const conditions = [];
      if (input.days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - input.days);
        conditions.push(gte(policyChanges.detectedAt, cutoffDate));
      }

      // Get changes for user's sites
      const results = await db
        .select()
        .from(policyChanges)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(policyChanges.detectedAt))
        .limit(input.limit);

      // Filter to only user's sites
      return results.filter(change => siteIds.includes(change.monitoredSiteId));
    }),

  /**
   * Get snapshots for a site
   */
  getSiteSnapshots: protectedProcedure
    .input(z.object({
      siteId: z.number(),
      limit: z.number().default(10),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Verify ownership
      const [site] = await db
        .select()
        .from(monitoredSites)
        .where(
          and(
            eq(monitoredSites.id, input.siteId),
            eq(monitoredSites.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!site) {
        throw new Error('Site not found or access denied');
      }

      const results = await db
        .select()
        .from(siteSnapshots)
        .where(eq(siteSnapshots.monitoredSiteId, input.siteId))
        .orderBy(desc(siteSnapshots.capturedAt))
        .limit(input.limit);

      return results;
    }),
});
