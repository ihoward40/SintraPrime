import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  deepReasoning,
  generateCode,
  generateVisualDesign,
  multiModelConsensus,
  explainCode,
} from "../lib/advanced-ai-features";
import { TRPCError } from "@trpc/server";

export const advancedAIRouter = router({
  /**
   * Deep reasoning mode for complex problem solving
   */
  deepReasoning: protectedProcedure
    .input(
      z.object({
        question: z.string().min(1),
        context: z.string().optional(),
        thinkingSteps: z.number().min(3).max(10).optional(),
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      try {
        const result = await deepReasoning(input);

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Deep reasoning failed",
        });
      }
    }),

  /**
   * Generate code with explanation
   */
  generateCode: protectedProcedure
    .input(
      z.object({
        task: z.string().min(1),
        language: z.enum(["python", "javascript", "typescript"]),
        requirements: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      try {
        const result = await generateCode(input);

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Code generation failed",
        });
      }
    }),

  /**
   * Generate visual design (SVG diagrams, UI mockups)
   */
  generateVisualDesign: protectedProcedure
    .input(
      z.object({
        designType: z.enum(["ui_mockup", "diagram", "flowchart", "wireframe"]),
        description: z.string().min(1),
        style: z.string().optional(),
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      try {
        const result = await generateVisualDesign(input);

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Visual design generation failed",
        });
      }
    }),

  /**
   * Multi-model consensus for critical decisions
   */
  multiModelConsensus: protectedProcedure
    .input(
      z.object({
        question: z.string().min(1),
      })
    )
    .mutation(async ({ input }: { input: { question: string } }) => {
      try {
        const result = await multiModelConsensus(input.question);

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Multi-model consensus failed",
        });
      }
    }),

  /**
   * Explain existing code
   */
  explainCode: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1),
        language: z.string(),
      })
    )
    .mutation(async ({ input }: { input: { code: string; language: string } }) => {
      try {
        const result = await explainCode(input.code, input.language);

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Code explanation failed",
        });
      }
    }),
});
