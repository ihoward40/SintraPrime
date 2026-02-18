import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey && stripeSecretKey.trim().length > 0
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2026-01-28.clover",
    })
  : null;

function getStripe(): Stripe {
  if (!stripe) {
    throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY)");
  }
  return stripe;
}

export const disputeManagementRouter = router({
  /**
   * Get all disputes for the current user
   */
  getDisputes: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { getUserDisputes } = await import("../db");
      const disputes = await getUserDisputes(ctx.user.id);
      return disputes;
    } catch (error: any) {
      console.error("Error fetching disputes:", error);
      throw new Error(`Failed to fetch disputes: ${error.message}`);
    }
  }),

  /**
   * Get a single dispute by ID
   */
  getDisputeById: protectedProcedure
    .input(z.object({ disputeId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        const { getDisputeById } = await import("../db");
        const dispute = await getDisputeById(input.disputeId);

        if (!dispute || dispute.userId !== ctx.user.id) {
          throw new Error("Dispute not found or access denied");
        }

        // Fetch latest dispute details from Stripe
        const stripeDispute = await getStripe().disputes.retrieve(dispute.stripeDisputeId);

        return {
          ...dispute,
          stripeDetails: stripeDispute,
        };
      } catch (error: any) {
        console.error("Error fetching dispute:", error);
        throw new Error(`Failed to fetch dispute: ${error.message}`);
      }
    }),

  /**
   * Submit evidence for a dispute
   */
  submitEvidence: protectedProcedure
    .input(
      z.object({
        disputeId: z.number(),
        evidence: z.object({
          customerName: z.string().optional(),
          customerEmailAddress: z.string().optional(),
          customerPurchaseIp: z.string().optional(),
          billingAddress: z.string().optional(),
          receipt: z.string().optional(), // File URL
          customerCommunication: z.string().optional(), // File URL
          serviceDocumentation: z.string().optional(), // File URL
          shippingDocumentation: z.string().optional(), // File URL
          refundPolicy: z.string().optional(),
          refundPolicyDisclosure: z.string().optional(),
          cancellationPolicy: z.string().optional(),
          cancellationPolicyDisclosure: z.string().optional(),
          productDescription: z.string().optional(),
          customerSignature: z.string().optional(), // File URL
          uncategorizedText: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { getDisputeById, updateDispute } = await import("../db");
        const dispute = await getDisputeById(input.disputeId);

        if (!dispute || dispute.userId !== ctx.user.id) {
          throw new Error("Dispute not found or access denied");
        }

        // Submit evidence to Stripe
        const updatedDispute = await getStripe().disputes.update(dispute.stripeDisputeId, {
          evidence: input.evidence as any,
        });

        // Update local database
        await updateDispute(input.disputeId, {
          evidenceDetails: input.evidence,
          evidenceSubmitted: true,
          status: "under_review",
        });

        // Audit trail: Evidence submitted for dispute
        console.log(`[Dispute] Evidence submitted for dispute ${input.disputeId} by user ${ctx.user.id}`);

        return {
          success: true,
          dispute: updatedDispute,
        };
      } catch (error: any) {
        console.error("Error submitting dispute evidence:", error);
        throw new Error(`Failed to submit evidence: ${error.message}`);
      }
    }),

  /**
   * Upload evidence file for a dispute
   */
  uploadEvidenceFile: protectedProcedure
    .input(
      z.object({
        disputeId: z.number(),
        fileUrl: z.string(),
        fileKey: z.string(),
        fileName: z.string(),
        fileType: z.string(), // customer_communication, receipt, shipping_documentation, etc.
        mimeType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { getDisputeById, createDisputeEvidence } = await import("../db");
        const dispute = await getDisputeById(input.disputeId);

        if (!dispute || dispute.userId !== ctx.user.id) {
          throw new Error("Dispute not found or access denied");
        }

        // Create evidence record
        const evidence = await createDisputeEvidence({
          disputeId: input.disputeId,
          fileUrl: input.fileUrl,
          fileKey: input.fileKey,
          fileName: input.fileName,
          fileType: input.fileType,
          mimeType: input.mimeType,
        });

        return {
          success: true,
          evidence,
        };
      } catch (error: any) {
        console.error("Error uploading evidence file:", error);
        throw new Error(`Failed to upload evidence file: ${error.message}`);
      }
    }),

  /**
   * Get evidence files for a dispute
   */
  getDisputeEvidence: protectedProcedure
    .input(z.object({ disputeId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        const { getDisputeById, getDisputeEvidence } = await import("../db");
        const dispute = await getDisputeById(input.disputeId);

        if (!dispute || dispute.userId !== ctx.user.id) {
          throw new Error("Dispute not found or access denied");
        }

        const evidence = await getDisputeEvidence(input.disputeId);
        return evidence;
      } catch (error: any) {
        console.error("Error fetching dispute evidence:", error);
        throw new Error(`Failed to fetch evidence: ${error.message}`);
      }
    }),

  /**
   * Get dispute statistics
   */
  getDisputeStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const { getUserDisputes } = await import("../db");
      const disputes = await getUserDisputes(ctx.user.id);

      const totalDisputes = disputes.length;
      const wonDisputes = disputes.filter((d: any) => d.status === "won").length;
      const lostDisputes = disputes.filter((d: any) => d.status === "lost").length;
      const pendingDisputes = disputes.filter(
        (d: any) =>
          d.status === "needs_response" ||
          d.status === "under_review" ||
          d.status === "warning_needs_response"
      ).length;

      const totalDisputedAmount = disputes.reduce((sum: number, d: any) => sum + d.amount, 0);
      const wonAmount = disputes
        .filter((d: any) => d.status === "won")
        .reduce((sum: number, d: any) => sum + d.amount, 0);
      const lostAmount = disputes
        .filter((d: any) => d.status === "lost")
        .reduce((sum: number, d: any) => sum + d.amount, 0);

      const winRate = totalDisputes > 0 ? (wonDisputes / totalDisputes) * 100 : 0;

      return {
        totalDisputes,
        wonDisputes,
        lostDisputes,
        pendingDisputes,
        totalDisputedAmount,
        wonAmount,
        lostAmount,
        winRate: Math.round(winRate * 100) / 100,
      };
    } catch (error: any) {
      console.error("Error fetching dispute stats:", error);
      throw new Error(`Failed to fetch dispute stats: ${error.message}`);
    }
  }),
});
