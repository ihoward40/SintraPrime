import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createCPAReview,
  getCPAReviewById,
  getTrustCPAReviews,
  getCPAReviewsByStatus,
  updateCPAReview,
  createCPAReviewComment,
  getCPAReviewCommentById,
  getReviewComments,
  updateCPAReviewComment,
  deleteCPAReviewComment,
} from "../db";

/**
 * CPA Collaboration Router
 * 
 * Handles CPA review workflow for tax returns:
 * - Submitting returns for CPA review
 * - Adding review comments and suggestions
 * - Approving or rejecting returns
 * - Real-time collaboration between preparers and CPAs
 */
export const cpaCollaborationRouter = router({
  /**
   * Submit a trust return for CPA review
   */
  submitForReview: protectedProcedure
    .input(
      z.object({
        trustAccountId: z.number(),
        reviewType: z.enum([
          "k1_review",
          "form1041_review",
          "full_return_review",
          "quarterly_review",
        ]),
        taxYear: z.number(),
        submissionNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const review = await createCPAReview({
        trustAccountId: input.trustAccountId,
        submittedBy: ctx.user.id,
        reviewedBy: null,
        status: "pending",
        reviewType: input.reviewType,
        taxYear: input.taxYear,
        submissionNotes: input.submissionNotes || null,
        reviewNotes: null,
        changesRequested: null,
        approvalSignature: null,
        approvedAt: null,
        reviewStartedAt: null,
        completedAt: null,
        metadata: {},
      });

      return review;
    }),

  /**
   * Get all reviews for a trust account
   */
  getTrustReviews: protectedProcedure
    .input(
      z.object({
        trustAccountId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const reviews = await getTrustCPAReviews(input.trustAccountId);
      return reviews;
    }),

  /**
   * Get reviews by status (for CPA dashboard)
   */
  getReviewsByStatus: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "in_review", "changes_requested", "approved", "rejected"]),
      })
    )
    .query(async ({ input }) => {
      const reviews = await getCPAReviewsByStatus(input.status);
      return reviews;
    }),

  /**
   * Get a specific review by ID
   */
  getReviewById: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ input }) => {
      const review = await getCPAReviewById(input.id);
      if (!review) {
        throw new Error("Review not found");
      }
      return review;
    }),

  /**
   * Start reviewing a submission (CPA claims the review)
   */
  startReview: protectedProcedure
    .input(
      z.object({
        reviewId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const review = await updateCPAReview(input.reviewId, {
        status: "in_review",
        reviewedBy: ctx.user.id,
        reviewStartedAt: new Date(),
      });

      return review;
    }),

  /**
   * Request changes to a submission
   */
  requestChanges: protectedProcedure
    .input(
      z.object({
        reviewId: z.number(),
        reviewNotes: z.string(),
        changesRequested: z.array(
          z.object({
            field: z.string(),
            issue: z.string(),
            suggestion: z.string(),
            priority: z.enum(["low", "medium", "high"]),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const review = await updateCPAReview(input.reviewId, {
        status: "changes_requested",
        reviewNotes: input.reviewNotes,
        changesRequested: input.changesRequested,
      });

      return review;
    }),

  /**
   * Approve a submission with digital signature
   */
  approveReview: protectedProcedure
    .input(
      z.object({
        reviewId: z.number(),
        reviewNotes: z.string().optional(),
        approvalSignature: z.string(), // Base64 encoded signature image or digital signature data
      })
    )
    .mutation(async ({ input, ctx }) => {
      const review = await updateCPAReview(input.reviewId, {
        status: "approved",
        reviewNotes: input.reviewNotes || null,
        approvalSignature: input.approvalSignature,
        approvedAt: new Date(),
        completedAt: new Date(),
      });

      return review;
    }),

  /**
   * Reject a submission
   */
  rejectReview: protectedProcedure
    .input(
      z.object({
        reviewId: z.number(),
        reviewNotes: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const review = await updateCPAReview(input.reviewId, {
        status: "rejected",
        reviewNotes: input.reviewNotes,
        completedAt: new Date(),
      });

      return review;
    }),

  /**
   * Add a comment to a review
   */
  addComment: protectedProcedure
    .input(
      z.object({
        reviewId: z.number(),
        commentText: z.string(),
        commentType: z.enum(["question", "suggestion", "issue", "approval", "general"]).default("general"),
        referenceType: z.string().optional(),
        referenceId: z.number().optional(),
        parentCommentId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const comment = await createCPAReviewComment({
        reviewId: input.reviewId,
        userId: ctx.user.id,
        commentText: input.commentText,
        commentType: input.commentType,
        referenceType: input.referenceType || null,
        referenceId: input.referenceId || null,
        parentCommentId: input.parentCommentId || null,
        isResolved: false,
        resolvedBy: null,
        resolvedAt: null,
      });

      return comment;
    }),

  /**
   * Get all comments for a review
   */
  getComments: protectedProcedure
    .input(
      z.object({
        reviewId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const comments = await getReviewComments(input.reviewId);
      return comments;
    }),

  /**
   * Resolve a comment
   */
  resolveComment: protectedProcedure
    .input(
      z.object({
        commentId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const comment = await updateCPAReviewComment(input.commentId, {
        isResolved: true,
        resolvedBy: ctx.user.id,
        resolvedAt: new Date(),
      });

      return comment;
    }),

  /**
   * Delete a comment
   */
  deleteComment: protectedProcedure
    .input(
      z.object({
        commentId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const comment = await getCPAReviewCommentById(input.commentId);
      if (!comment) {
        throw new Error("Comment not found");
      }

      // Only allow deletion by comment author
      if (comment.userId !== ctx.user.id) {
        throw new Error("Unauthorized to delete this comment");
      }

      await deleteCPAReviewComment(input.commentId);
      return { success: true };
    }),

  /**
   * Get review statistics for dashboard
   */
  getReviewStats: protectedProcedure.query(async ({ ctx }) => {
    const pending = await getCPAReviewsByStatus("pending");
    const inReview = await getCPAReviewsByStatus("in_review");
    const changesRequested = await getCPAReviewsByStatus("changes_requested");
    const approved = await getCPAReviewsByStatus("approved");
    const rejected = await getCPAReviewsByStatus("rejected");

    return {
      pending: pending.length,
      inReview: inReview.length,
      changesRequested: changesRequested.length,
      approved: approved.length,
      rejected: rejected.length,
      total: pending.length + inReview.length + changesRequested.length + approved.length + rejected.length,
    };
  }),
});
