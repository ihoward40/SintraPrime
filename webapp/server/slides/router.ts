import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  generatePresentationOutline,
  generateCaseSummarySlides,
  enhanceSlideContent,
  outlineToMarkdown,
  type SlideGenerationRequest,
  type PresentationOutline,
} from "../lib/slide-generator";
import { TRPCError } from "@trpc/server";
import PptxGenJS from "pptxgenjs";

export const slidesRouter = router({
  /**
   * Generate presentation outline from topic
   */
  generateOutline: protectedProcedure
    .input(
      z.object({
        topic: z.string().min(1),
        purpose: z.enum(["case_summary", "legal_brief", "client_presentation", "training", "general"]),
        targetAudience: z.enum(["legal_professionals", "clients", "judges", "general_public"]),
        slideCount: z.number().min(3).max(50).optional(),
        tone: z.enum(["formal", "conversational", "persuasive", "educational"]).optional(),
        includeVisuals: z.boolean().optional(),
        keyPoints: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }: { input: SlideGenerationRequest }) => {
      try {
        const outline = await generatePresentationOutline(input);

        return {
          success: true,
          outline,
          markdown: outlineToMarkdown(outline),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate outline",
        });
      }
    }),

  /**
   * Generate slides from case data
   */
  generateFromCase: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }: { input: { caseId: number }; ctx: any }) => {
      try {
        // Get case data
        const { getCaseById } = await import("../db");
        const caseData = await getCaseById(input.caseId);

        if (!caseData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Case not found",
          });
        }

        // Generate slides
        const outline = await generateCaseSummarySlides({
          title: caseData.title,
          caseNumber: caseData.caseNumber || undefined,
          description: caseData.description || undefined,
          caseType: caseData.caseType || undefined,
          status: caseData.status,
        });

        return {
          success: true,
          outline,
          markdown: outlineToMarkdown(outline),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate case slides",
        });
      }
    }),

  /**
   * Enhance existing slide content
   */
  enhanceSlide: protectedProcedure
    .input(
      z.object({
        slide: z.object({
          title: z.string(),
          subtitle: z.string().optional(),
          content: z.array(z.string()),
          notes: z.string().optional(),
          layout: z.enum(["title", "content", "two-column", "image-text", "quote", "conclusion"]),
          visualStyle: z.enum(["professional", "creative", "minimal", "bold"]).optional(),
        }),
        context: z.object({
          topic: z.string(),
          audience: z.string(),
        }),
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      try {
        const enhanced = await enhanceSlideContent(input.slide, input.context);

        return {
          success: true,
          slide: enhanced,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to enhance slide",
        });
      }
    }),

  /**
   * Export presentation to markdown
   */
  exportToMarkdown: protectedProcedure
    .input(
      z.object({
        outline: z.object({
          title: z.string(),
          subtitle: z.string().optional(),
          author: z.string().optional(),
          theme: z.enum(["legal", "business", "academic", "creative"]),
          slides: z.array(
            z.object({
              title: z.string(),
              subtitle: z.string().optional(),
              content: z.array(z.string()),
              notes: z.string().optional(),
              layout: z.enum(["title", "content", "two-column", "image-text", "quote", "conclusion"]),
              visualStyle: z.enum(["professional", "creative", "minimal", "bold"]).optional(),
            })
          ),
          totalSlides: z.number(),
        }),
      })
    )
    .query(({ input }: { input: { outline: PresentationOutline } }) => {
      const markdown = outlineToMarkdown(input.outline);

      return {
        markdown,
        filename: `${input.outline.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`,
      };
    }),

  /**
   * Export slides to PowerPoint format
   */
  exportToPowerPoint: protectedProcedure
    .input(
      z.object({
        slides: z.array(
          z.object({
            title: z.string(),
            content: z.string(),
            notes: z.string().optional(),
          })
        ),
        title: z.string(),
        author: z.string().optional(),
        theme: z.enum(["default", "dark", "light", "professional"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: { slides: Array<{ title: string; content: string; notes?: string }>; title: string; author?: string; theme?: string } }) => {
      try {
        const pptx = new PptxGenJS();
        
        // Set presentation properties
        pptx.author = input.author || ctx.user.name || "SintraPrime";
        pptx.title = input.title;
        pptx.subject = "Generated by SintraPrime";
        
        // Apply theme
        const theme = input.theme || "professional";
        let bgColor = "FFFFFF";
        let textColor = "000000";
        let accentColor = "3B82F6";
        
        if (theme === "dark") {
          bgColor = "1E293B";
          textColor = "F1F5F9";
          accentColor = "60A5FA";
        } else if (theme === "professional") {
          bgColor = "F8FAFC";
          textColor = "1E293B";
          accentColor = "2563EB";
        }
        
        // Add title slide
        const titleSlide = pptx.addSlide();
        titleSlide.background = { color: bgColor };
        titleSlide.addText(input.title, {
          x: 0.5,
          y: 2.5,
          w: 9,
          h: 1.5,
          fontSize: 44,
          bold: true,
          color: accentColor,
          align: "center",
        });
        titleSlide.addText(input.author || ctx.user.name || "SintraPrime", {
          x: 0.5,
          y: 4.5,
          w: 9,
          h: 0.5,
          fontSize: 20,
          color: textColor,
          align: "center",
        });
        
        // Add content slides
        for (const slideData of input.slides) {
          const slide = pptx.addSlide();
          slide.background = { color: bgColor };
          
          // Add title
          slide.addText(slideData.title, {
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 0.8,
            fontSize: 32,
            bold: true,
            color: accentColor,
          });
          
          // Parse and add content
          const contentLines = slideData.content.split("\n").filter(line => line.trim());
          let yPos = 1.5;
          
          for (const line of contentLines.slice(0, 8)) { // Limit to 8 lines per slide
            const isBullet = line.trim().startsWith("-") || line.trim().startsWith("•");
            const text = isBullet ? line.trim().substring(1).trim() : line.trim();
            
            slide.addText(text, {
              x: isBullet ? 1.0 : 0.5,
              y: yPos,
              w: 8.5,
              h: 0.5,
              fontSize: 18,
              color: textColor,
              bullet: isBullet,
            });
            
            yPos += 0.6;
          }
          
          // Add notes if provided
          if (slideData.notes) {
            slide.addNotes(slideData.notes);
          }
        }
        
        // Generate PowerPoint file
        const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
        
        // Upload to S3
        const { storagePut } = await import("../storage");
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `presentations/${ctx.user.id}/${timestamp}-${randomSuffix}.pptx`;
        
        const { url } = await storagePut(
          fileKey,
          buffer,
          "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        );
        
        return {
          success: true,
          url,
          fileKey,
          slideCount: input.slides.length + 1, // +1 for title slide
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "PowerPoint export failed",
        });
      }
    }),
});
