import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { aiMemory } from "../drizzle/schema-ai-memory";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { invokeLLM, type InvokeResult } from "./_core/llm";

const memoryCategorySchema = z.enum([
  "user_preference",
  "case_fact",
  "legal_strategy",
  "general_context",
]);

const extractedMemoryArraySchema = z.array(
  z.object({
    category: memoryCategorySchema,
    key: z.string().min(1),
    value: z.string().min(1),
    importance: z.number().int().min(1).max(5).optional(),
  })
);

type ExtractedMemory = z.infer<typeof extractedMemoryArraySchema>[number];
type LlmMessageContent = InvokeResult["choices"][number]["message"]["content"];

type MemoryParseResult =
  | {
      ok: true;
      memories: ExtractedMemory[];
    }
  | {
      ok: false;
      reason: "missing_content" | "invalid_json" | "invalid_shape";
      logContext: {
        contentLength: number;
        hasJsonArray: boolean;
        startsWithCodeFence: boolean;
      };
    };

export function coerceMemoryExtractionContent(
  content: LlmMessageContent | undefined
): string | null {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const textContent = content
    .filter((part): part is Extract<LlmMessageContent[number], { type: "text" }> => part.type === "text")
    .map(part => part.text.trim())
    .filter(Boolean);

  return textContent.length > 0 ? textContent.join("\n") : null;
}

export function summarizeMemoryExtractionContent(content: string | null) {
  return {
    contentLength: content?.length ?? 0,
    hasJsonArray: typeof content === "string" && /\[[\s\S]*\]/.test(content),
    startsWithCodeFence: typeof content === "string" && content.trimStart().startsWith("```"),
  };
}

export function parseExtractedMemories(content: string | null): MemoryParseResult {
  const logContext = summarizeMemoryExtractionContent(content);

  if (!content) {
    return {
      ok: false,
      reason: "missing_content",
      logContext,
    };
  }

  const candidate = content.match(/\[[\s\S]*\]/)?.[0] ?? content;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(candidate);
  } catch {
    return {
      ok: false,
      reason: "invalid_json",
      logContext,
    };
  }

  const parsed = extractedMemoryArraySchema.safeParse(parsedJson);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid_shape",
      logContext,
    };
  }

  return {
    ok: true,
    memories: parsed.data,
  };
}

export const aiMemoryRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          caseId: z.number().optional(),
          category: memoryCategorySchema.optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const conditions = [eq(aiMemory.userId, ctx.user.id)];

      if (input?.caseId) {
        conditions.push(eq(aiMemory.caseId, input.caseId));
      }

      if (input?.category) {
        conditions.push(eq(aiMemory.category, input.category));
      }

      return await db
        .select()
        .from(aiMemory)
        .where(and(...conditions))
        .orderBy(desc(aiMemory.importance), desc(aiMemory.updatedAt));
    }),

  add: protectedProcedure
    .input(
      z.object({
        caseId: z.number().optional(),
        category: memoryCategorySchema,
        key: z.string().min(1),
        value: z.string().min(1),
        importance: z.number().min(1).max(5).default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const [result] = await db.insert(aiMemory).values({
        userId: ctx.user.id,
        caseId: input.caseId,
        category: input.category,
        key: input.key,
        value: input.value,
        importance: input.importance,
        source: "manual",
      });

      return { success: true, id: result.insertId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        category: memoryCategorySchema.optional(),
        key: z.string().optional(),
        value: z.string().optional(),
        importance: z.number().min(1).max(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const [memory] = await db
        .select()
        .from(aiMemory)
        .where(and(eq(aiMemory.id, input.id), eq(aiMemory.userId, ctx.user.id)));

      if (!memory) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Memory not found" });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (input.category) updateData.category = input.category;
      if (input.key) updateData.key = input.key;
      if (input.value) updateData.value = input.value;
      if (input.importance !== undefined) updateData.importance = input.importance;

      await db
        .update(aiMemory)
        .set(updateData)
        .where(eq(aiMemory.id, input.id));

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      await db
        .delete(aiMemory)
        .where(and(eq(aiMemory.id, input.id), eq(aiMemory.userId, ctx.user.id)));

      return { success: true };
    }),

  extractFromMessage: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        caseId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const systemPrompt = `You are an AI Memory Extraction system. Your job is to analyze the user's message and determine if there are any important facts, preferences, or context that should be remembered for future interactions.
      
If there is nothing worth remembering, return an empty array.
If there is something worth remembering, extract it into a structured format.

Categories:
- user_preference: How the user likes things done (e.g., "always be concise", "use bullet points")
- case_fact: Important facts about a case (e.g., "the defendant is John Doe", "the incident happened on Jan 1")
- legal_strategy: The approach being taken (e.g., "we are focusing on FDCPA violations")
- general_context: Other useful context (e.g., "user is a pro se litigant")

Return a JSON array of objects with the following schema:
[
  {
    "category": "user_preference" | "case_fact" | "legal_strategy" | "general_context",
    "key": "A short, descriptive key (e.g., 'preferred_format', 'defendant_name')",
    "value": "The actual fact or preference to remember",
    "importance": 1-5 (1=minor detail, 5=critical fact)
  }
]`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.message },
          ],
        });

        const parsed = parseExtractedMemories(
          coerceMemoryExtractionContent(response.choices[0]?.message?.content)
        );

        if (!parsed.ok) {
          console.error("Failed to parse memory extraction payload", {
            reason: parsed.reason,
            ...parsed.logContext,
          });
          return { success: false, extracted: 0 };
        }

        if (parsed.memories.length === 0) {
          return { success: true, extracted: 0 };
        }

        let insertedCount = 0;
        for (const memory of parsed.memories) {
          await db.insert(aiMemory).values({
            userId: ctx.user.id,
            caseId: input.caseId,
            category: memory.category,
            key: memory.key,
            value: memory.value,
            importance: memory.importance ?? 3,
            source: "chat_extraction",
          });
          insertedCount++;
        }

        return { success: true, extracted: insertedCount };
      } catch (error) {
        console.error("Memory extraction error", {
          errorType: error instanceof Error ? error.name : typeof error,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to extract memory",
        });
      }
    }),
});
