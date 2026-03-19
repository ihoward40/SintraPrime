/**
 * SintraPrime LLM Router Configuration
 * Allows users to configure which AI model is used for each task type.
 * Supports auto-routing, cost optimization, and privacy mode.
 */
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { llmRouterConfig } from "../drizzle/schema-comprehensive-features";
import { eq } from "drizzle-orm";

const AVAILABLE_MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", strengths: ["reasoning", "coding", "analysis"], costTier: "high" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", strengths: ["speed", "simple tasks"], costTier: "low" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI", strengths: ["long documents", "analysis"], costTier: "high" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "Anthropic", strengths: ["long documents", "writing", "nuance"], costTier: "high" },
  { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", provider: "Anthropic", strengths: ["speed", "cost"], costTier: "low" },
  { id: "gpt-5", name: "GPT-5", provider: "OpenAI", strengths: ["advanced reasoning", "complex tasks"], costTier: "premium" },
];

const TASK_TYPES = [
  { id: "reasoning", label: "Complex Reasoning & Analysis", description: "Case strategy, legal arguments, complex analysis" },
  { id: "longDoc", label: "Long Document Processing", description: "Contracts, briefs, discovery documents" },
  { id: "fast", label: "Quick Responses", description: "Simple Q&A, formatting, summaries" },
  { id: "default", label: "General Purpose", description: "All other tasks" },
];

export const llmRouterConfigRouter = router({
  /** Get current LLM router config */
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const [config] = await db
      .select()
      .from(llmRouterConfig)
      .where(eq(llmRouterConfig.userId, ctx.user.id))
      .limit(1);

    return config ?? {
      defaultModel: "gpt-4o",
      reasoningModel: "gpt-4o",
      longDocModel: "gpt-4o",
      fastModel: "gpt-4o-mini",
      costOptimize: false,
      privacyMode: false,
      autoRoute: true,
    };
  }),

  /** Update LLM router config */
  updateConfig: protectedProcedure
    .input(z.object({
      defaultModel: z.string().optional(),
      reasoningModel: z.string().optional(),
      longDocModel: z.string().optional(),
      fastModel: z.string().optional(),
      costOptimize: z.boolean().optional(),
      privacyMode: z.boolean().optional(),
      autoRoute: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db
        .insert(llmRouterConfig)
        .values({
          userId: ctx.user.id,
          defaultModel: input.defaultModel ?? "gpt-4o",
          reasoningModel: input.reasoningModel ?? "gpt-4o",
          longDocModel: input.longDocModel ?? "gpt-4o",
          fastModel: input.fastModel ?? "gpt-4o-mini",
          costOptimize: input.costOptimize ?? false,
          privacyMode: input.privacyMode ?? false,
          autoRoute: input.autoRoute ?? true,
        })
        .onDuplicateKeyUpdate({
          set: {
            ...(input.defaultModel && { defaultModel: input.defaultModel }),
            ...(input.reasoningModel && { reasoningModel: input.reasoningModel }),
            ...(input.longDocModel && { longDocModel: input.longDocModel }),
            ...(input.fastModel && { fastModel: input.fastModel }),
            ...(input.costOptimize !== undefined && { costOptimize: input.costOptimize }),
            ...(input.privacyMode !== undefined && { privacyMode: input.privacyMode }),
            ...(input.autoRoute !== undefined && { autoRoute: input.autoRoute }),
          },
        });
      return { success: true };
    }),

  /** Get available models list */
  getAvailableModels: protectedProcedure.query(async () => {
    return AVAILABLE_MODELS;
  }),

  /** Get task types */
  getTaskTypes: protectedProcedure.query(async () => {
    return TASK_TYPES;
  }),

  /** Test a model with a sample prompt */
  testModel: protectedProcedure
    .input(z.object({
      modelId: z.string(),
      prompt: z.string().min(1).max(500).default("Summarize the key elements of a valid contract in 3 bullet points."),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import("./_core/llm");
      const start = Date.now();
      try {
        const response = await invokeLLM({
          model: input.modelId,
          messages: [
            { role: "system", content: "You are a helpful legal AI assistant." },
            { role: "user", content: input.prompt },
          ],
        });
        const latencyMs = Date.now() - start;
        return {
          success: true,
          response: response.content as string,
          latencyMs,
          model: input.modelId,
        };
      } catch (err: any) {
        return {
          success: false,
          error: err.message,
          latencyMs: Date.now() - start,
          model: input.modelId,
        };
      }
    }),
});
