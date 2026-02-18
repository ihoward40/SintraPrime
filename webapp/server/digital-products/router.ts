import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  generateLegalDocument,
  generateDemandLetter,
  generateInfographic,
  generateBrandAsset,
  generateContract,
  markdownToHTML,
} from "../lib/digital-product-creator";
import { TRPCError } from "@trpc/server";

export const digitalProductsRouter = router({
  /**
   * Generate legal document
   */
  generateLegalDocument: protectedProcedure
    .input(
      z.object({
        documentType: z.enum(["demand_letter", "contract", "motion", "brief"]),
        parties: z.object({
          plaintiff: z.string().optional(),
          defendant: z.string().optional(),
          client: z.string().optional(),
        }),
        facts: z.array(z.string()),
        legalBasis: z.array(z.string()),
        demands: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      try {
        const product = await generateLegalDocument(input);
        const html = markdownToHTML(product.content, product.title);

        return {
          success: true,
          product,
          html,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate document",
        });
      }
    }),

  /**
   * Generate demand letter
   */
  generateDemandLetter: protectedProcedure
    .input(
      z.object({
        creditorName: z.string(),
        debtorName: z.string(),
        debtAmount: z.number(),
        violations: z.array(z.string()),
        demands: z.array(z.string()),
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      try {
        const product = await generateDemandLetter(input);
        const html = markdownToHTML(product.content, product.title);

        return {
          success: true,
          product,
          html,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate demand letter",
        });
      }
    }),

  /**
   * Generate infographic structure
   */
  generateInfographic: protectedProcedure
    .input(
      z.object({
        topic: z.string(),
        dataPoints: z.array(
          z.object({
            label: z.string(),
            value: z.union([z.string(), z.number()]),
          })
        ),
        style: z.enum(["professional", "modern", "creative"]),
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      try {
        const product = await generateInfographic(input);

        return {
          success: true,
          product,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate infographic",
        });
      }
    }),

  /**
   * Generate brand asset specification
   */
  generateBrandAsset: protectedProcedure
    .input(
      z.object({
        assetType: z.enum(["logo", "letterhead", "business_card"]),
        brandName: z.string(),
        industry: z.string(),
        style: z.enum(["professional", "modern", "classic", "creative"]),
        colors: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      try {
        const product = await generateBrandAsset(input);

        return {
          success: true,
          product,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate brand asset",
        });
      }
    }),

  /**
   * Generate contract
   */
  generateContract: protectedProcedure
    .input(
      z.object({
        contractType: z.enum(["service_agreement", "nda", "employment", "settlement"]),
        parties: z.array(z.string()),
        terms: z.array(z.string()),
        jurisdiction: z.string(),
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      try {
        const product = await generateContract(input);
        const html = markdownToHTML(product.content, product.title);

        return {
          success: true,
          product,
          html,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to generate contract",
        });
      }
    }),
});
