import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import {
  detectCaseType,
  generateCaseWorkflow,
  suggestCaseDocuments,
} from '../lib/case-type-detector';

export const caseTemplatesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // For now, return empty array - in production, fetch from database
    // return await db.getCaseTemplatesByUserId(ctx.user.id);
    return [];
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        caseType: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        documents: z.array(z.string()).optional(),
        workflow: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // In production: await db.createCaseTemplate({ ...input, userId: ctx.user.id });
      return { id: Date.now(), ...input, userId: ctx.user.id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        caseType: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        documents: z.array(z.string()).optional(),
        workflow: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // In production: await db.updateCaseTemplate(input.id, input);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // In production: await db.deleteCaseTemplate(input.id);
      return { success: true };
    }),

  createCaseFromTemplate: protectedProcedure
    .input(z.object({ templateId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // In production:
      // const template = await db.getCaseTemplateById(input.templateId);
      // const caseId = await db.createCase({ ...template, userId: ctx.user.id });
      const caseId = Date.now();
      return { caseId };
    }),

  detectCaseType: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        documents: z.array(z.string()).optional(),
        parties: z.array(z.string()).optional(),
        jurisdiction: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await detectCaseType(input);
      return result;
    }),

  generateWorkflow: protectedProcedure
    .input(
      z.object({
        caseType: z.string(),
        customRequirements: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const workflow = await generateCaseWorkflow(
        input.caseType,
        input.customRequirements
      );
      return { workflow };
    }),

  suggestDocuments: protectedProcedure
    .input(
      z.object({
        caseType: z.string(),
        currentDocuments: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const suggestions = await suggestCaseDocuments(
        input.caseType,
        input.currentDocuments
      );
      return suggestions;
    }),
});
