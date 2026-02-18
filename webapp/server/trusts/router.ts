import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as trustDb from "../db/trust-helpers";
import { TRPCError } from "@trpc/server";

// ============================================================================
// TRUST ROUTER
// ============================================================================

export const trustRouter = router({
  // List all trusts for current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return trustDb.getTrustsByUserId(ctx.user.id);
  }),

  // Get trust by ID with full details
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const trust = await trustDb.getTrustWithDetails(input.id);
      if (!trust) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Trust not found" });
      }
      // Verify ownership
      if (trust.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return trust;
    }),

  // Get trusts by case ID
  getByCaseId: protectedProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ input }) => {
      return trustDb.getTrustsByCaseId(input.caseId);
    }),

  // Create new trust
  create: protectedProcedure
    .input(
      z.object({
        trustName: z.string().min(1),
        trustType: z.enum([
          "revocable_living",
          "irrevocable",
          "testamentary",
          "charitable",
          "special_needs",
          "spendthrift",
          "asset_protection",
        ]),
        settlor: z.string().min(1),
        purpose: z.string().optional(),
        terms: z.string().min(1),
        caseId: z.number().optional(),
        establishedDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await trustDb.createTrust({
        ...input,
        userId: ctx.user.id,
        status: "draft",
      });
      return result;
    }),

  // Update trust
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        trustName: z.string().optional(),
        trustType: z
          .enum([
            "revocable_living",
            "irrevocable",
            "testamentary",
            "charitable",
            "special_needs",
            "spendthrift",
            "asset_protection",
          ])
          .optional(),
        settlor: z.string().optional(),
        purpose: z.string().optional(),
        terms: z.string().optional(),
        status: z.enum(["draft", "active", "amended", "terminated"]).optional(),
        establishedDate: z.date().optional(),
        terminationDate: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      // Verify ownership
      const trust = await trustDb.getTrustById(id);
      if (!trust || trust.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return trustDb.updateTrust(id, data);
    }),

  // Delete trust
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const trust = await trustDb.getTrustById(input.id);
      if (!trust || trust.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      await trustDb.deleteTrust(input.id);
      return { success: true };
    }),

  // ============================================================================
  // TRUSTEE OPERATIONS
  // ============================================================================

  addTrustee: protectedProcedure
    .input(
      z.object({
        trustId: z.number(),
        name: z.string().min(1),
        role: z.enum(["primary", "successor", "co_trustee"]),
        contactInfo: z
          .object({
            email: z.string().optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
          })
          .optional(),
        appointedDate: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify trust ownership
      const trust = await trustDb.getTrustById(input.trustId);
      if (!trust || trust.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return trustDb.addTrustee(input);
    }),

  updateTrustee: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        role: z.enum(["primary", "successor", "co_trustee"]).optional(),
        contactInfo: z
          .object({
            email: z.string().optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
          })
          .optional(),
        status: z.enum(["active", "removed", "deceased"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await trustDb.updateTrustee(id, data);
      return { success: true };
    }),

  removeTrustee: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await trustDb.removeTrustee(input.id);
      return { success: true };
    }),

  // ============================================================================
  // BENEFICIARY OPERATIONS
  // ============================================================================

  addBeneficiary: protectedProcedure
    .input(
      z.object({
        trustId: z.number(),
        name: z.string().min(1),
        relationship: z.string().optional(),
        beneficiaryType: z.enum(["primary", "contingent", "remainder"]),
        distributionShare: z.string().optional(),
        distributionConditions: z.string().optional(),
        contactInfo: z
          .object({
            email: z.string().optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
            taxId: z.string().optional(),
          })
          .optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify trust ownership
      const trust = await trustDb.getTrustById(input.trustId);
      if (!trust || trust.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return trustDb.addBeneficiary(input);
    }),

  updateBeneficiary: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        relationship: z.string().optional(),
        beneficiaryType: z.enum(["primary", "contingent", "remainder"]).optional(),
        distributionShare: z.string().optional(),
        distributionConditions: z.string().optional(),
        contactInfo: z
          .object({
            email: z.string().optional(),
            phone: z.string().optional(),
            address: z.string().optional(),
            taxId: z.string().optional(),
          })
          .optional(),
        status: z.enum(["active", "removed", "deceased"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await trustDb.updateBeneficiary(id, data);
      return { success: true };
    }),

  removeBeneficiary: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await trustDb.removeBeneficiary(input.id);
      return { success: true };
    }),

  // ============================================================================
  // TRUST ASSET OPERATIONS
  // ============================================================================

  addAsset: protectedProcedure
    .input(
      z.object({
        trustId: z.number(),
        assetType: z.enum([
          "real_estate",
          "cash",
          "securities",
          "business_interest",
          "personal_property",
          "intellectual_property",
          "other",
        ]),
        description: z.string().min(1),
        estimatedValue: z.number().optional(),
        acquisitionDate: z.date().optional(),
        location: z.string().optional(),
        documentation: z
          .array(
            z.object({
              title: z.string(),
              fileUrl: z.string(),
              fileType: z.string(),
            })
          )
          .optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify trust ownership
      const trust = await trustDb.getTrustById(input.trustId);
      if (!trust || trust.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return trustDb.addTrustAsset(input);
    }),

  updateAsset: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        assetType: z
          .enum([
            "real_estate",
            "cash",
            "securities",
            "business_interest",
            "personal_property",
            "intellectual_property",
            "other",
          ])
          .optional(),
        description: z.string().optional(),
        estimatedValue: z.number().optional(),
        acquisitionDate: z.date().optional(),
        location: z.string().optional(),
        status: z.enum(["active", "sold", "distributed", "transferred"]).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await trustDb.updateTrustAsset(id, data);
      return { success: true };
    }),

  deleteAsset: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await trustDb.deleteTrustAsset(input.id);
      return { success: true };
    }),

  // ============================================================================
  // DISTRIBUTION OPERATIONS
  // ============================================================================

  createDistribution: protectedProcedure
    .input(
      z.object({
        trustId: z.number(),
        beneficiaryId: z.number(),
        amount: z.number(),
        distributionType: z.enum(["income", "principal", "discretionary"]),
        purpose: z.string().optional(),
        distributionDate: z.date(),
        method: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify trust ownership
      const trust = await trustDb.getTrustById(input.trustId);
      if (!trust || trust.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return trustDb.createDistribution(input);
    }),

  getDistributions: protectedProcedure
    .input(z.object({ trustId: z.number() }))
    .query(async ({ input }) => {
      return trustDb.getDistributionsByTrustId(input.trustId);
    }),

  // ============================================================================
  // FIDUCIARY DUTY OPERATIONS
  // ============================================================================

  createFiduciaryDuty: protectedProcedure
    .input(
      z.object({
        trustId: z.number(),
        dutyType: z.string(),
        description: z.string(),
        dueDate: z.date().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify trust ownership
      const trust = await trustDb.getTrustById(input.trustId);
      if (!trust || trust.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return trustDb.createFiduciaryDuty({
        trustId: input.trustId,
        dutyType: input.dutyType,
        description: input.description,
        dueDate: input.dueDate,
        notes: input.notes,
      });
    }),

  getFiduciaryDuties: protectedProcedure
    .input(z.object({ trustId: z.number() }))
    .query(async ({ input }) => {
      return trustDb.getFiduciaryDutiesByTrustId(input.trustId);
    }),

  completeFiduciaryDuty: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        evidence: z
          .array(
            z.object({
              title: z.string(),
              fileUrl: z.string(),
              uploadedAt: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      await trustDb.completeFiduciaryDuty(input.id, input.evidence);
      return { success: true };
    }),
});
