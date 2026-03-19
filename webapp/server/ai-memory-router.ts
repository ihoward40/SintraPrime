import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { aiMemory } from "../drizzle/schema-ai-memory";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";

export const aiMemoryRouter = router({
  // List all memories for the current user
  list: protectedProcedure
    .input(
      z.object({
        caseId: z.number().optional(),
        category: z.enum(["user_preference", "case_fact", "legal_strategy", "general_context"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      let conditions = [eq(aiMemory.userId, ctx.user.id)];
      
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

  // Add a new memory manually
  add: protectedProcedure
    .input(
      z.object({
        caseId: z.number().optional(),
        category: z.enum(["user_preference", "case_fact", "legal_strategy", "general_context"]),
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

  // Update an existing memory
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        category: z.enum(["user_preference", "case_fact", "legal_strategy", "general_context"]).optional(),
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

      // Verify ownership
      const [memory] = await db
        .select()
        .from(aiMemory)
        .where(and(eq(aiMemory.id, input.id), eq(aiMemory.userId, ctx.user.id)));

      if (!memory) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Memory not found" });
      }

      const updateData: any = { updatedAt: new Date() };
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

  // Delete a memory
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      // Verify ownership and delete
      await db
        .delete(aiMemory)
        .where(and(eq(aiMemory.id, input.id), eq(aiMemory.userId, ctx.user.id)));

      return { success: true };
    }),

  // Extract memory from chat message using LLM
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
            { role: "user", content: input.message }
          ]
        });

        const content = response.choices[0]?.message?.content || "[]";
        
        // Try to parse the JSON response
        let extractedMemories = [];
        try {
          // Find JSON array in the response (in case the LLM added markdown formatting)
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            extractedMemories = JSON.parse(jsonMatch[0]);
          } else {
            extractedMemories = JSON.parse(content);
          }
        } catch (e) {
          console.error("Failed to parse memory extraction JSON:", content);
          return { success: false, extracted: 0 };
        }

        if (!Array.isArray(extractedMemories) || extractedMemories.length === 0) {
          return { success: true, extracted: 0 };
        }

        // Insert the extracted memories
        let insertedCount = 0;
        for (const memory of extractedMemories) {
          if (memory.category && memory.key && memory.value) {
            await db.insert(aiMemory).values({
              userId: ctx.user.id,
              caseId: input.caseId,
              category: memory.category,
              key: memory.key,
              value: memory.value,
              importance: memory.importance || 3,
              source: "chat_extraction",
            });
            insertedCount++;
          }
        }

        return { success: true, extracted: insertedCount };
      } catch (error) {
        console.error("Memory extraction error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to extract memory",
        });
      }
    }),
});
