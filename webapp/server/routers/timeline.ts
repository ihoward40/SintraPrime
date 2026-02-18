import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { timelineEvents, narratives } from '../../drizzle/schema-timeline';
import { eq, and } from 'drizzle-orm';
import { invokeLLM } from '../_core/llm';

export const timelineRouter = router({
  /**
   * List timeline events for a case
   */
  listEvents: protectedProcedure
    .input(z.object({
      caseId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const events = await db
        .select()
        .from(timelineEvents)
        .where(and(
          eq(timelineEvents.caseId, input.caseId),
          eq(timelineEvents.userId, ctx.user.id)
        ));
      return events;
    }),

  /**
   * Create a new timeline event
   */
  createEvent: protectedProcedure
    .input(z.object({
      caseId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      eventDate: z.string(), // YYYY-MM-DD format
      eventTime: z.string().optional(),
      eventType: z.string(),
      importance: z.string().default('medium'),
      location: z.string().optional(),
      outcome: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const result = await db.insert(timelineEvents).values({
        ...input,
        userId: ctx.user.id,
      });
      return { success: true, id: result[0].insertId };
    }),

  /**
   * Update a timeline event
   */
  updateEvent: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      eventDate: z.string().optional(),
      eventTime: z.string().optional(),
      eventType: z.string().optional(),
      importance: z.string().optional(),
      location: z.string().optional(),
      outcome: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...updates } = input;
      await db
        .update(timelineEvents)
        .set(updates)
        .where(and(
          eq(timelineEvents.id, id),
          eq(timelineEvents.userId, ctx.user.id)
        ));
      return { success: true };
    }),

  /**
   * Delete a timeline event
   */
  deleteEvent: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db
        .delete(timelineEvents)
        .where(and(
          eq(timelineEvents.id, input.id),
          eq(timelineEvents.userId, ctx.user.id)
        ));
      return { success: true };
    }),

  /**
   * Generate AI narrative from timeline events
   */
  generateNarrative: protectedProcedure
    .input(z.object({
      caseId: z.number(),
      narrativeType: z.enum(['chronological', 'thematic', 'legal_argument']),
      template: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      
      // Get all events for the case
      const events = await db
        .select()
        .from(timelineEvents)
        .where(and(
          eq(timelineEvents.caseId, input.caseId),
          eq(timelineEvents.userId, ctx.user.id)
        ));

      if (events.length === 0) {
        throw new Error('No timeline events found for this case');
      }

      // Sort events by date
      const sortedEvents = events.sort((a, b) => 
        new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      );

      // Generate narrative using LLM
      const eventsText = sortedEvents.map(e => 
        `- ${e.eventDate}: ${e.title}${e.description ? ` - ${e.description}` : ''}`
      ).join('\n');

      const prompt = input.narrativeType === 'chronological'
        ? `Generate a chronological narrative from these case events:\n\n${eventsText}\n\nWrite a clear, professional narrative that tells the story of this case in chronological order.`
        : input.narrativeType === 'thematic'
        ? `Generate a thematic narrative from these case events:\n\n${eventsText}\n\nOrganize the narrative by themes and key issues rather than strict chronology.`
        : `Generate a legal argument narrative from these case events:\n\n${eventsText}\n\nStructure the narrative to support a legal argument, emphasizing key facts and their legal significance.`;

      const response = await invokeLLM({
        messages: [
          { role: 'system', content: 'You are a legal writing assistant helping to create case narratives.' },
          { role: 'user', content: prompt }
        ],
      });

      const narrativeContent = response.choices[0].message.content || '';

      // Save narrative to database
      const result = await db.insert(narratives).values({
        caseId: input.caseId,
        userId: ctx.user.id,
        title: `${input.narrativeType} Narrative - Case #${input.caseId}`,
        content: narrativeContent,
        narrativeType: input.narrativeType,
        template: input.template,
        timelineEventIds: sortedEvents.map(e => e.id),
        generatedBy: 'ai',
      });

      return {
        success: true,
        id: result[0].insertId,
        content: narrativeContent,
      };
    }),

  /**
   * List narratives for a case
   */
  listNarratives: protectedProcedure
    .input(z.object({
      caseId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      const results = await db
        .select()
        .from(narratives)
        .where(and(
          eq(narratives.caseId, input.caseId),
          eq(narratives.userId, ctx.user.id)
        ));
      return results;
    }),
});
