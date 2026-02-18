import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import {
  generateReceiptLedgerAuditReport,
  generateComplianceReport,
  generateBeneficiaryDistributionReport,
  exportReportAsPDF,
} from '../lib/governanceReports';

export const governanceReportsRouter = router({
  /**
   * Generate receipt ledger audit report
   */
  generateReceiptLedgerAudit: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      includeVerification: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const report = await generateReceiptLedgerAuditReport({
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        includeVerification: input.includeVerification,
      });
      const pdfBuffer = await exportReportAsPDF(report);

      // Convert buffer to base64 for transmission
      const base64 = pdfBuffer.toString('base64');
      return {
        pdf: base64,
        filename: `receipt-ledger-audit-${input.startDate}-to-${input.endDate}.pdf`,
      };
    }),

  /**
   * Generate compliance report
   */
  generateComplianceReport: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const report = await generateComplianceReport({
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      });
      const pdfBuffer = await exportReportAsPDF(report);

      const base64 = pdfBuffer.toString('base64');
      return {
        pdf: base64,
        filename: `compliance-report-${input.startDate}-to-${input.endDate}.pdf`,
      };
    }),

  /**
   * Generate beneficiary distribution summary
   */
  generateBeneficiaryDistributionSummary: protectedProcedure
    .input(z.object({
      trustId: z.number(),
      year: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const report = await generateBeneficiaryDistributionReport(input.trustId, {
        startDate: new Date(`${input.year}-01-01`),
        endDate: new Date(`${input.year}-12-31`),
      });
      const pdfBuffer = await exportReportAsPDF(report);

      const base64 = pdfBuffer.toString('base64');
      return {
        pdf: base64,
        filename: `beneficiary-distribution-summary-trust-${input.trustId}-${input.year}.pdf`,
      };
    }),
});
