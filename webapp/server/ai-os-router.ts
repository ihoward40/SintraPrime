/**
 * SintraPrime AI Operating System Router
 * 
 * Unified router for:
 * - Intelligence Database (AI Tools Tracking)
 * - Stack Builder (Project Stack Recommendations)
 * - AI Roles (Head of Innovation, Ghostwriter, Prompt Engineer)
 * - Master Prompt Library
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { stackBuilderService } from "./lib/stack-builder-service";
import { aiRolesService } from "./lib/ai-roles-service";
import { recommendationEngine } from "./lib/recommendation-engine";
import { storagePut } from "./storage";

export const aiOSRouter = router({
  // ============================================================================
  // INTELLIGENCE DATABASE - AI TOOLS TRACKING
  // ============================================================================

  tools: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllAITools();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getAIToolById(input.id);
      }),

    search: protectedProcedure
      .input(
        z.object({
          category: z.string().optional(),
          skillLevel: z.string().optional(),
          budgetTier: z.string().optional(),
          minReliability: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return await db.searchAITools(input);
      }),

    submitReview: protectedProcedure
      .input(
        z.object({
          toolId: z.number(),
          rating: z.number().min(1).max(5),
          reviewText: z.string().max(1000),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const review = await db.createToolReview({
          toolId: input.toolId,
          userId: ctx.user.id,
          rating: input.rating,
          review: input.reviewText,
        });
        return review;
      }),

    getReviews: protectedProcedure
      .input(z.object({ toolId: z.number() }))
      .query(async ({ input }) => {
        return await db.getToolReviewsByToolId(input.toolId);
      }),
      
    flagReview: protectedProcedure
      .input(z.object({
        reviewId: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createReviewFlag({
          reviewId: input.reviewId,
          flaggedBy: ctx.user.id,
          reason: input.reason,
          status: "pending",
        });
      }),
      
    getFlaggedReviews: protectedProcedure
      .query(async () => {
        return await db.getFlaggedReviews();
      }),
      
    moderateReview: protectedProcedure
      .input(z.object({
        flagId: z.number(),
        action: z.enum(["approve", "remove"]),
        moderatorNotes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const flag = await db.getReviewFlagById(input.flagId);
        if (!flag) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Flag not found",
          });
        }
        
        // Update flag status
        await db.updateReviewFlag(input.flagId, {
          status: input.action === "approve" ? "approved" : "removed",
          moderatedBy: ctx.user.id,
          moderatorNotes: input.moderatorNotes,
          moderatedAt: new Date(),
        });
        
        // If removing, delete the review
        if (input.action === "remove") {
          await db.deleteToolReview(flag.reviewId);
        }
        
        return { success: true };
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          category: z.string(),
          skillLevel: z.string(),
          budgetTier: z.string(),
          reliabilityScore: z.number().optional(),
          officialDocs: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createAITool(input);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          category: z.string().optional(),
          skillLevel: z.string().optional(),
          budgetTier: z.string().optional(),
          reliabilityScore: z.number().optional(),
          officialDocs: z.string().optional(),
          notes: z.string().optional(),
          deprecated: z.boolean().optional(),
          deprecationReason: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateAITool(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteAITool(input.id);
      }),

    uploadDocumentation: protectedProcedure
      .input(
        z.object({
          toolId: z.number(),
          fileContent: z.string(), // Base64 PDF
          fileName: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Upload PDF to S3
        const fileBuffer = Buffer.from(input.fileContent, "base64");
        const fileKey = `tool-docs/${input.toolId}/${Date.now()}-${input.fileName}`;
        const { url: pdfUrl } = await storagePut(
          fileKey,
          fileBuffer,
          "application/pdf"
        );

        // Update tool record
        await db.updateAITool(input.toolId, {
          pdfStored: true,
          pdfPath: pdfUrl,
        });

        return { success: true, pdfUrl };
      }),
  }),

  // ============================================================================
  // STACK BUILDER - PROJECT STACK RECOMMENDATIONS
  // ============================================================================

  stacks: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getProjectStacksByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const stack = await db.getProjectStackById(input.id);
        if (!stack || stack.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Stack not found",
          });
        }
        const tools = await db.getStackToolsByStackId(input.id);
        return { ...stack, tools };
      }),

    create: protectedProcedure
      .input(
        z.object({
          projectName: z.string(),
          outputType: z.string(),
          budget: z.enum(["low", "medium", "high"]),
          skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
          timeline: z.string().optional(),
          decisionNotes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createProjectStack({
          ...input,
          userId: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          projectName: z.string().optional(),
          status: z.string().optional(),
          decisionNotes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const stack = await db.getProjectStackById(input.id);
        if (!stack || stack.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Stack not found",
          });
        }
        const { id, ...data } = input;
        return await db.updateProjectStack(id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const stack = await db.getProjectStackById(input.id);
        if (!stack || stack.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Stack not found",
          });
        }
        return await db.deleteProjectStack(input.id);
      }),

    recommend: protectedProcedure
      .input(
        z.object({
          projectName: z.string(),
          outputType: z.string(),
          budget: z.enum(["low", "medium", "high"]),
          skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
          timeline: z.string().optional(),
          specificNeeds: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await stackBuilderService.recommendStack(input);
      }),

    addTool: protectedProcedure
      .input(
        z.object({
          stackId: z.number(),
          toolId: z.number(),
          toolRole: z.string(),
          reasoning: z.string().optional(),
          isBackup: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const stack = await db.getProjectStackById(input.stackId);
        if (!stack || stack.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Stack not found",
          });
        }
        return await db.addToolToStack(input);
      }),
  }),

  // ============================================================================
  // AI ROLES - SPECIALIZED AI CONFIGURATIONS
  // ============================================================================

  roles: router({
    headOfInnovation: protectedProcedure
      .input(
        z.object({
          projectType: z.string(),
          budget: z.string(),
          skillLevel: z.string(),
          timeline: z.string().optional(),
          specificRequirements: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await aiRolesService.headOfInnovation(input);
      }),

    ghostwriter: protectedProcedure
      .input(
        z.object({
          topic: z.string(),
          targetAudience: z.string().optional(),
          contentType: z.string(),
          styleReference: z.string().optional(),
          length: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await aiRolesService.ghostwriter(input);
      }),

    promptEngineer: protectedProcedure
      .input(
        z.object({
          tool: z.string(),
          goal: z.string(),
          parameters: z.record(z.string(), z.any()).optional(),
          documentation: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await aiRolesService.promptEngineer(input);
      }),
  }),

  // ============================================================================
  // MASTER PROMPT LIBRARY
  // ============================================================================

  prompts: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllPrompts();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPromptById(input.id);
      }),

    getByCategory: protectedProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => {
        return await db.getPromptsByCategory(input.category);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          category: z.string(),
          systemPrompt: z.string(),
          userPromptTemplate: z.string().optional(),
          variables: z.string().optional(), // JSON string
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createPrompt(input);
      }),

    execute: protectedProcedure
      .input(
        z.object({
          promptId: z.number(),
          variables: z.record(z.string(), z.string()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const prompt = await db.getPromptById(input.promptId);
        if (!prompt) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Prompt not found",
          });
        }

        const result = await aiRolesService.executePrompt(
          prompt.systemPrompt,
          prompt.userPromptTemplate || "",
          input.variables as Record<string, string>
        );

        // Save execution history
        await db.createPromptExecution({
          promptId: input.promptId,
          userId: ctx.user.id,
          input: JSON.stringify(input.variables),
          output: result,
          executedAt: new Date(),
        });

        return { output: result };
      }),
  }),
  
  // ============================================================================
  // RECOMMENDATIONS - AI-POWERED TOOL SUGGESTIONS
  // ============================================================================
  
  recommendations: router({    
    // Get AI-powered tool recommendations
    generate: protectedProcedure
      .input(z.object({
        projectDescription: z.string(),
        limit: z.number().min(1).max(20).default(10),
      }))
      .mutation(async ({ ctx, input }) => {
        const recommendations = await recommendationEngine.generateRecommendations(
          ctx.user.id,
          input.projectDescription,
          input.limit
        );
        return recommendations;
      }),
  }),
});
