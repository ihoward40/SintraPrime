/**
 * SintraPrime Daily Digest & Voice Command Router
 * Daily activity email digest settings and voice command configuration.
 */
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { digestSettings } from "../drizzle/schema-comprehensive-features";
import { eq } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

export const digestVoiceRouter = router({
  // ── Daily Digest ──────────────────────────────────────────────────────────

  /** Get digest settings for the current user */
  getDigestSettings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const [settings] = await db
      .select()
      .from(digestSettings)
      .where(eq(digestSettings.userId, ctx.user.id))
      .limit(1);
    return settings ?? {
      enabled: true,
      frequency: "daily",
      sendTime: "08:00",
      timezone: "America/New_York",
      includeDeadlines: true,
      includeCaseUpdates: true,
      includeAIInsights: true,
      includeTimeTracking: true,
    };
  }),

  /** Update digest settings */
  updateDigestSettings: protectedProcedure
    .input(z.object({
      enabled: z.boolean().optional(),
      frequency: z.enum(["daily", "weekly", "never"]).optional(),
      sendTime: z.string().optional(),
      timezone: z.string().optional(),
      includeDeadlines: z.boolean().optional(),
      includeCaseUpdates: z.boolean().optional(),
      includeAIInsights: z.boolean().optional(),
      includeTimeTracking: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db
        .insert(digestSettings)
        .values({
          userId: ctx.user.id,
          enabled: input.enabled ?? true,
          frequency: input.frequency ?? "daily",
          sendTime: input.sendTime ?? "08:00",
          timezone: input.timezone ?? "America/New_York",
          includeDeadlines: input.includeDeadlines ?? true,
          includeCaseUpdates: input.includeCaseUpdates ?? true,
          includeAIInsights: input.includeAIInsights ?? true,
          includeTimeTracking: input.includeTimeTracking ?? true,
        })
        .onDuplicateKeyUpdate({
          set: {
            ...(input.enabled !== undefined && { enabled: input.enabled }),
            ...(input.frequency && { frequency: input.frequency }),
            ...(input.sendTime && { sendTime: input.sendTime }),
            ...(input.timezone && { timezone: input.timezone }),
            ...(input.includeDeadlines !== undefined && { includeDeadlines: input.includeDeadlines }),
            ...(input.includeCaseUpdates !== undefined && { includeCaseUpdates: input.includeCaseUpdates }),
            ...(input.includeAIInsights !== undefined && { includeAIInsights: input.includeAIInsights }),
            ...(input.includeTimeTracking !== undefined && { includeTimeTracking: input.includeTimeTracking }),
          },
        });
      return { success: true };
    }),

  /** Generate a preview of the daily digest */
  previewDigest: protectedProcedure
    .input(z.object({
      userName: z.string().optional(),
      caseCount: z.number().default(3),
      upcomingDeadlines: z.array(z.object({
        title: z.string(),
        date: z.string(),
        caseTitle: z.string(),
      })).default([]),
    }))
    .mutation(async ({ input, ctx }) => {
      const name = input.userName ?? ctx.user.name ?? "Counselor";
      const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

      const deadlineText = input.upcomingDeadlines.length > 0
        ? input.upcomingDeadlines.map(d => `• ${d.title} — ${d.caseTitle} (${d.date})`).join("\n")
        : "No upcoming deadlines in the next 7 days.";

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are SintraPrime AI. Generate a professional, concise daily digest email for a legal professional. Include a motivational opening, case activity summary, and strategic tip. Keep it under 300 words.",
          },
          {
            role: "user",
            content: `Generate a daily digest for ${name} on ${today}.\n\nActive cases: ${input.caseCount}\nUpcoming deadlines:\n${deadlineText}\n\nMake it professional, actionable, and encouraging.`,
          },
        ],
      });

      return {
        subject: `SintraPrime Daily Digest — ${today}`,
        body: response.content as string,
        generatedAt: new Date().toISOString(),
      };
    }),

  // ── Voice Commands ─────────────────────────────────────────────────────────

  /** Get available voice commands */
  getVoiceCommands: protectedProcedure.query(async () => {
    return [
      { command: "Hey SintraPrime, open [page name]", description: "Navigate to any page", example: "Hey SintraPrime, open AI Memory" },
      { command: "Hey SintraPrime, summarize case [case name]", description: "Get an AI summary of a case", example: "Hey SintraPrime, summarize case Smith v. Creditor" },
      { command: "Hey SintraPrime, what's my next deadline", description: "Read out upcoming deadlines", example: "Hey SintraPrime, what's my next deadline" },
      { command: "Hey SintraPrime, start timer for [description]", description: "Start a time tracking entry", example: "Hey SintraPrime, start timer for research" },
      { command: "Hey SintraPrime, stop timer", description: "Stop the current time tracking entry", example: "Hey SintraPrime, stop timer" },
      { command: "Hey SintraPrime, add memory [fact]", description: "Add a fact to AI memory", example: "Hey SintraPrime, add memory defendant is represented by counsel" },
      { command: "Hey SintraPrime, search [query]", description: "Search across all cases and documents", example: "Hey SintraPrime, search FDCPA violations" },
      { command: "Hey SintraPrime, read back [last response]", description: "Have the AI read back its last response", example: "Hey SintraPrime, read that back" },
    ];
  }),

  /** Process a voice command text and route it */
  processVoiceCommand: protectedProcedure
    .input(z.object({
      command: z.string().min(1).max(500),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are SintraPrime's voice command processor. Parse the user's voice command and return a JSON action object.

Available actions:
- navigate: { action: "navigate", path: "/page-path" }
- search: { action: "search", query: "..." }
- startTimer: { action: "startTimer", description: "..." }
- stopTimer: { action: "stopTimer" }
- addMemory: { action: "addMemory", key: "...", value: "..." }
- summarizeCase: { action: "summarizeCase", caseName: "..." }
- getDeadlines: { action: "getDeadlines" }
- speak: { action: "speak", text: "..." }
- unknown: { action: "unknown", message: "I didn't understand that command" }

Return ONLY valid JSON.`,
          },
          { role: "user", content: input.command },
        ],
      });

      try {
        const content = response.content as string;
        const match = content.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : { action: "unknown", message: "Could not parse command" };
      } catch {
        return { action: "unknown", message: "Could not parse command" };
      }
    }),
});
