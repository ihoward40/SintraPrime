import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  generateVideo,
  generateVideoFromTemplate,
  getVideoTemplates,
  checkVideoStatus,
  VIDEO_SCRIPT_TEMPLATES
} from "./invideo-service";

export const videoGenerationRouter = router({
  /**
   * Generate a video from a custom script
   */
  generateVideo: protectedProcedure
    .input(
      z.object({
        script: z.string().min(10, "Script must be at least 10 characters"),
        templateId: z.string().optional(),
        aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional(),
        duration: z.number().optional(),
        voiceOver: z.boolean().optional(),
        music: z.boolean().optional()
      })
    )
    .mutation(async ({ input }) => {
      return await generateVideo(input);
    }),

  /**
   * Generate a video from a pre-built template
   */
  generateFromTemplate: protectedProcedure
    .input(
      z.object({
        templateKey: z.enum([
          "fdcpaViolation",
          "creditReportDispute",
          "consumerProtection",
          "caseSuccess",
          "serviceOverview"
        ]),
        aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional(),
        duration: z.number().optional()
      })
    )
    .mutation(async ({ input }) => {
      return await generateVideoFromTemplate(input.templateKey, {
        aspectRatio: input.aspectRatio,
        duration: input.duration
      });
    }),

  /**
   * Get available video templates
   */
  getTemplates: protectedProcedure.query(async () => {
    return Object.entries(VIDEO_SCRIPT_TEMPLATES).map(([key, template]) => ({
      key,
      title: template.title,
      description: template.description,
      scriptPreview: template.script.substring(0, 200) + "..."
    }));
  }),

  /**
   * Get InVideo platform templates
   */
  getInVideoTemplates: protectedProcedure.query(async () => {
    return await getVideoTemplates();
  }),

  /**
   * Check video generation status
   */
  checkStatus: protectedProcedure
    .input(
      z.object({
        videoId: z.string()
      })
    )
    .query(async ({ input }) => {
      return await checkVideoStatus(input.videoId);
    }),

  /**
   * Get full script for a template
   */
  getTemplateScript: protectedProcedure
    .input(
      z.object({
        templateKey: z.enum([
          "fdcpaViolation",
          "creditReportDispute",
          "consumerProtection",
          "caseSuccess",
          "serviceOverview"
        ])
      })
    )
    .query(({ input }) => {
      const template = VIDEO_SCRIPT_TEMPLATES[input.templateKey];
      return {
        title: template.title,
        description: template.description,
        script: template.script
      };
    })
});
