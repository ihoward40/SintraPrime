import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sendK1Email } from "../emailService";
const db = getDb();

export const k1DistributionRouter = router({
  // Send K-1 emails to all beneficiaries
  sendK1Email: protectedProcedure
    .input(
      z.object({
        trustAccountId: z.number(),
        subject: z.string(),
        body: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const dbInstance = await db;
      if (!dbInstance) throw new Error("Database not available");

      // Get trust account with beneficiaries
      const { getTrustAccountById } = await import("../db");
      const trustAccount = await getTrustAccountById(input.trustAccountId);

      if (!trustAccount) {
        throw new Error("Trust account not found");
      }

      const beneficiaries = (trustAccount.metadata as any)?.beneficiaries || [];

      if (beneficiaries.length === 0) {
        throw new Error("No beneficiaries found for this trust account");
      }

      // Send K-1 emails to all beneficiaries with email addresses
      const results = [];
      
      for (const beneficiary of beneficiaries) {
        if (!beneficiary.email) {
          results.push({
            beneficiary: beneficiary.name,
            success: false,
            error: "No email address",
          });
          continue;
        }

        try {
          // TODO: Generate actual K-1 PDF for this beneficiary
          // For now, we'll send without PDF attachment
          const result = await sendK1Email(
            beneficiary.email,
            beneficiary.name,
            trustAccount.trustName,
            trustAccount.taxYear,
            Buffer.from("PDF placeholder"), // TODO: Replace with actual PDF
            input.body
          );

          results.push({
            beneficiary: beneficiary.name,
            email: beneficiary.email,
            success: result.success,
            messageId: result.messageId,
            error: result.error,
          });
        } catch (error) {
          results.push({
            beneficiary: beneficiary.name,
            email: beneficiary.email,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;

      return {
        success: successCount > 0,
        sentCount: successCount,
        totalCount: beneficiaries.length,
        results,
      };
    }),
});
