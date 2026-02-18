import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import {
  createBeneficiary,
  updateBeneficiary,
  getTrustBeneficiaries,
  recordDistribution,
  getBeneficiaryDistributions,
  getDistributionSummary,
  calculateDistributionAllocation,
  prepareK1Data,
  getBeneficiaryReport,
} from '../lib/beneficiaryOps';

export const beneficiaryRouter = router({
  /**
   * Create new beneficiary
   */
  create: protectedProcedure
    .input(z.object({
      trustId: z.number(),
      name: z.string(),
      relationship: z.string(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      taxId: z.string().optional(),
      distributionPercentage: z.number().min(0).max(100),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const beneficiaryId = await createBeneficiary(input);
      return { beneficiaryId };
    }),
  
  /**
   * Update beneficiary
   */
  update: protectedProcedure
    .input(z.object({
      beneficiaryId: z.number(),
      name: z.string().optional(),
      relationship: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      taxId: z.string().optional(),
      distributionPercentage: z.number().min(0).max(100).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { beneficiaryId, ...updates } = input;
      await updateBeneficiary(beneficiaryId, updates);
      return { success: true };
    }),
  
  /**
   * Get beneficiaries for a trust
   */
  getByTrust: protectedProcedure
    .input(z.object({
      trustId: z.number(),
    }))
    .query(async ({ input }) => {
      return await getTrustBeneficiaries(input.trustId);
    }),
  
  /**
   * Record distribution
   */
  recordDistribution: protectedProcedure
    .input(z.object({
      beneficiaryId: z.number(),
      trustId: z.number(),
      amount: z.number().min(0),
      distributionDate: z.string().datetime(),
      distributionType: z.enum(['income', 'principal', 'required_minimum', 'discretionary']),
      taxYear: z.number(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const distributionId = await recordDistribution({
        ...input,
        distributionDate: new Date(input.distributionDate),
        performedBy: ctx.user.id,
      });
      return { distributionId };
    }),
  
  /**
   * Get distributions for beneficiary
   */
  getDistributions: protectedProcedure
    .input(z.object({
      beneficiaryId: z.number(),
      taxYear: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return await getBeneficiaryDistributions(input.beneficiaryId, input.taxYear);
    }),
  
  /**
   * Get distribution summary
   */
  getDistributionSummary: protectedProcedure
    .input(z.object({
      beneficiaryId: z.number(),
      taxYear: z.number(),
    }))
    .query(async ({ input }) => {
      return await getDistributionSummary(input.beneficiaryId, input.taxYear);
    }),
  
  /**
   * Calculate distribution allocation
   */
  calculateAllocation: protectedProcedure
    .input(z.object({
      trustId: z.number(),
      totalAmount: z.number().min(0),
    }))
    .query(async ({ input }) => {
      return await calculateDistributionAllocation(input.trustId, input.totalAmount);
    }),
  
  /**
   * Prepare K-1 data
   */
  prepareK1: protectedProcedure
    .input(z.object({
      beneficiaryId: z.number(),
      taxYear: z.number(),
    }))
    .query(async ({ input }) => {
      return await prepareK1Data(input.beneficiaryId, input.taxYear);
    }),
  
  /**
   * Get beneficiary report
   */
  getReport: protectedProcedure
    .input(z.object({
      beneficiaryId: z.number(),
      startYear: z.number(),
      endYear: z.number(),
    }))
    .query(async ({ input }) => {
      return await getBeneficiaryReport(
        input.beneficiaryId,
        input.startYear,
        input.endYear
      );
    }),
});
