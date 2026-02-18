import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { auditTrail } from "../../drizzle/schema";
import { getDb } from "../db";
const db = getDb();
import { eq, and, gte, lte, desc } from "drizzle-orm";

export const auditTrailRouter = router({
  // Get audit trail with filtering
  getAuditTrail: protectedProcedure
    .input(
      z.object({
        eventType: z.string().optional(),
        entityType: z.string().optional(),
        entityId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(100),
      })
    )
    .query(async ({ input, ctx }) => {
      const dbInstance = await db;
      if (!dbInstance) throw new Error("Database not available");
      const conditions = [];

      if (input.eventType) {
        conditions.push(eq(auditTrail.eventType, input.eventType as any));
      }

      if (input.entityType) {
        conditions.push(eq(auditTrail.entityType, input.entityType));
      }

      if (input.entityId) {
        conditions.push(eq(auditTrail.entityId, input.entityId));
      }

      if (input.startDate) {
        conditions.push(gte(auditTrail.createdAt, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(auditTrail.createdAt, new Date(input.endDate)));
      }

      const entries = await dbInstance
        .select()
        .from(auditTrail)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(auditTrail.createdAt))
        .limit(input.limit);

      return entries;
    }),

  // Create audit trail entry
  createAuditEntry: protectedProcedure
    .input(
      z.object({
        eventType: z.enum([
          "document_upload",
          "document_processing",
          "document_verification",
          "journal_entry_create",
          "journal_entry_update",
          "journal_entry_delete",
          "trust_account_create",
          "trust_account_update",
          "dni_calculation",
          "k1_generation",
          "form1041_generation",
          "efile_submission",
        ]),
        entityType: z.string(),
        entityId: z.number(),
        action: z.string(),
        beforeData: z.any().optional(),
        afterData: z.any().optional(),
        changes: z.any().optional(),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db;
      if (!dbInstance) throw new Error("Database not available");
      const [entry] = await dbInstance.insert(auditTrail).values({
        userId: ctx.user.id,
        eventType: input.eventType,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        beforeData: input.beforeData,
        afterData: input.afterData,
        changes: input.changes,
        metadata: input.metadata,
      });

      return { success: true, entryId: entry.insertId };
    }),

  // Get audit trail for specific entity
  getEntityAuditTrail: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const dbInstance = await db;
      if (!dbInstance) throw new Error("Database not available");
      const entries = await dbInstance
        .select()
        .from(auditTrail)
        .where(
          and(
            eq(auditTrail.entityType, input.entityType),
            eq(auditTrail.entityId, input.entityId)
          )
        )
        .orderBy(desc(auditTrail.createdAt));

      return entries;
    }),
});
