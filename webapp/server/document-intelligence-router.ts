/**
 * SintraPrime Document Intelligence Router
 * AI-powered document analysis: OCR, clause extraction, entity recognition,
 * key date detection, party identification, and contradiction detection.
 */
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { documentIntelligence } from "../drizzle/schema-comprehensive-features";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";

const EXTRACTION_SYSTEM_PROMPT = `You are an expert legal document analyst. Analyze the provided document text and extract the following in valid JSON format:

{
  "summary": "2-3 sentence executive summary of the document",
  "entities": [
    { "type": "person|organization|court|agency", "name": "...", "role": "..." }
  ],
  "clauses": [
    { "type": "payment|liability|termination|confidentiality|indemnification|governing_law|other", "title": "...", "text": "...", "riskLevel": "low|medium|high" }
  ],
  "keyDates": [
    { "label": "...", "date": "YYYY-MM-DD or description", "importance": "critical|important|informational" }
  ],
  "keyParties": [
    { "name": "...", "role": "plaintiff|defendant|creditor|debtor|attorney|other", "contactInfo": "..." }
  ],
  "risks": [
    { "category": "...", "description": "...", "severity": "low|medium|high|critical" }
  ],
  "contradictions": [
    { "description": "...", "location1": "...", "location2": "..." }
  ]
}

Be thorough and precise. Focus on legally significant information.`;

export const documentIntelligenceRouter = router({
  /** List all analyzed documents for the current user */
  list: protectedProcedure
    .input(z.object({
      caseId: z.number().optional(),
      status: z.enum(["pending", "processing", "complete", "failed"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const conditions = [eq(documentIntelligence.userId, ctx.user.id)];
      if (input.caseId) conditions.push(eq(documentIntelligence.caseId, input.caseId));
      if (input.status) conditions.push(eq(documentIntelligence.processingStatus, input.status));
      return db
        .select()
        .from(documentIntelligence)
        .where(and(...conditions))
        .orderBy(desc(documentIntelligence.createdAt));
    }),

  /** Get a single analysis result */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const [record] = await db
        .select()
        .from(documentIntelligence)
        .where(and(eq(documentIntelligence.id, input.id), eq(documentIntelligence.userId, ctx.user.id)))
        .limit(1);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found." });
      return record;
    }),

  /** Analyze a document from text content */
  analyzeText: protectedProcedure
    .input(z.object({
      fileName: z.string().min(1),
      textContent: z.string().min(10).max(100000),
      caseId: z.number().optional(),
      documentId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Create a pending record
      const [insertResult] = await db.insert(documentIntelligence).values({
        userId: ctx.user.id,
        caseId: input.caseId,
        documentId: input.documentId,
        fileName: input.fileName,
        extractedText: input.textContent,
        processingStatus: "processing",
      });
      const recordId = insertResult.insertId;

      try {
        // Truncate to 80k chars for LLM context
        const truncated = input.textContent.slice(0, 80000);

        const response = await invokeLLM({
          messages: [
            { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
            { role: "user", content: `Analyze this document:\n\n---\n${truncated}\n---\n\nReturn ONLY valid JSON.` },
          ],
        });

        const content = response.content as string;
        let parsed: any = {};
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = { summary: content.slice(0, 500) };
        }

        await db
          .update(documentIntelligence)
          .set({
            summary: parsed.summary ?? null,
            entities: parsed.entities ?? [],
            clauses: parsed.clauses ?? [],
            keyDates: parsed.keyDates ?? [],
            keyParties: parsed.keyParties ?? [],
            risks: parsed.risks ?? [],
            contradictions: parsed.contradictions ?? [],
            processingStatus: "complete",
          })
          .where(eq(documentIntelligence.id, recordId));

        return { id: recordId, status: "complete", summary: parsed.summary };
      } catch (err) {
        await db
          .update(documentIntelligence)
          .set({ processingStatus: "failed" })
          .where(eq(documentIntelligence.id, recordId));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Document analysis failed." });
      }
    }),

  /** Quick summarize — returns just a summary without storing */
  quickSummarize: protectedProcedure
    .input(z.object({
      textContent: z.string().min(10).max(50000),
      focusArea: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const focus = input.focusArea ? ` Focus especially on: ${input.focusArea}.` : "";
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a legal document summarizer. Provide a concise, structured summary of the document.${focus} Include: key parties, main purpose, critical dates, important obligations, and any red flags.`,
          },
          { role: "user", content: input.textContent.slice(0, 50000) },
        ],
      });
      return { summary: response.content as string };
    }),

  /** Extract entities only (fast) */
  extractEntities: protectedProcedure
    .input(z.object({ textContent: z.string().min(10).max(50000) }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `Extract all named entities from this legal document. Return JSON array: [{"type":"person|organization|court|agency","name":"...","role":"..."}]. Return ONLY the JSON array.`,
          },
          { role: "user", content: input.textContent.slice(0, 50000) },
        ],
      });
      try {
        const content = response.content as string;
        const match = content.match(/\[[\s\S]*\]/);
        return { entities: match ? JSON.parse(match[0]) : [] };
      } catch {
        return { entities: [] };
      }
    }),

  /** Delete an analysis record */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db
        .delete(documentIntelligence)
        .where(and(eq(documentIntelligence.id, input.id), eq(documentIntelligence.userId, ctx.user.id)));
      return { success: true };
    }),
});
