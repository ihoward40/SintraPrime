import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { emailMessages, audioRecordings } from '../../drizzle/schema';
import { desc, gte, eq, and, sql } from 'drizzle-orm';

export const ingestRouter = router({
  /**
   * Get email ingest statistics
   */
  getEmailStats: protectedProcedure
    .input(z.object({
      days: z.number().default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.days);

      // Get total emails
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(emailMessages)
        .where(gte(emailMessages.receivedAt, cutoffDate));

      // Get emails with attachments
      const withAttachmentsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(emailMessages)
        .where(
          and(
            gte(emailMessages.receivedAt, cutoffDate),
            sql`JSON_LENGTH(${emailMessages.attachments}) > 0`
          )
        );

      // Get cases created from emails (check metadata)
      const casesCreatedResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(emailMessages)
        .where(
          and(
            gte(emailMessages.receivedAt, cutoffDate),
            sql`JSON_EXTRACT(${emailMessages.metadata}, '$.caseCreated') = true`
          )
        );

      return {
        total: Number(totalResult[0]?.count || 0),
        withAttachments: Number(withAttachmentsResult[0]?.count || 0),
        casesCreated: Number(casesCreatedResult[0]?.count || 0),
      };
    }),

  /**
   * Get audio ingest statistics
   */
  getAudioStats: protectedProcedure
    .input(z.object({
      days: z.number().default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.days);

      // Get total audio recordings
      const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(audioRecordings)
        .where(gte(audioRecordings.createdAt, cutoffDate));

      // Get transcribed audio
      const transcribedResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(audioRecordings)
        .where(
          and(
            gte(audioRecordings.createdAt, cutoffDate),
            eq(audioRecordings.transcriptionStatus, 'completed')
          )
        );

      return {
        total: Number(totalResult[0]?.count || 0),
        transcribed: Number(transcribedResult[0]?.count || 0),
      };
    }),

  /**
   * Get recent email ingests
   */
  getRecentEmails: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      processed: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const conditions = [];
      if (input.processed !== undefined) {
        conditions.push(eq(emailMessages.processed, input.processed));
      }

      const results = await db
        .select({
          id: emailMessages.id,
          from: emailMessages.from,
          subject: emailMessages.subject,
          receivedAt: emailMessages.receivedAt,
          processed: emailMessages.processed,
          attachments: emailMessages.attachments,
          metadata: emailMessages.metadata,
        })
        .from(emailMessages)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(emailMessages.receivedAt))
        .limit(input.limit);

      return results.map(email => ({
        id: email.id,
        from: email.from,
        subject: email.subject,
        receivedAt: email.receivedAt,
        processed: email.processed,
        attachmentCount: email.attachments ? (Array.isArray(email.attachments) ? email.attachments.length : 0) : 0,
        caseId: email.metadata && typeof email.metadata === 'object' && 'caseId' in email.metadata 
          ? (email.metadata as any).caseId 
          : null,
      }));
    }),

  /**
   * Get recent audio ingests
   */
  getRecentAudio: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const conditions = [];
      if (input.status) {
        conditions.push(eq(audioRecordings.transcriptionStatus, input.status));
      }

      const results = await db
        .select({
          id: audioRecordings.id,
          title: audioRecordings.title,
          fileName: audioRecordings.fileName,
          duration: audioRecordings.duration,
          transcriptionStatus: audioRecordings.transcriptionStatus,
          caseId: audioRecordings.caseId,
          createdAt: audioRecordings.createdAt,
        })
        .from(audioRecordings)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(audioRecordings.createdAt))
        .limit(input.limit);

      return results;
    }),
});
