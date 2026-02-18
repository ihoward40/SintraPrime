import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { approvalRequests } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createReceipt } from '../lib/receiptLedger';
import { sendNotification } from '../lib/notifications';

export const approvalsRouter = router({
  /**
   * List approval requests with optional status filter
   */
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const conditions = input.status 
        ? [eq(approvalRequests.status, input.status)]
        : [];

      const requests = await db
        .select()
        .from(approvalRequests)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(approvalRequests.createdAt));

      return requests;
    }),

  /**
   * Get single approval request by ID
   */
  get: protectedProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const [request] = await db
        .select()
        .from(approvalRequests)
        .where(eq(approvalRequests.id, input.requestId))
        .limit(1);

      return request || null;
    }),

  /**
   * Create new approval request
   */
  create: protectedProcedure
    .input(z.object({
      requestType: z.string(),
      action: z.string(),
      justification: z.string(),
      estimatedCost: z.number().optional(),
      priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
      metadata: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const result = await db
        .insert(approvalRequests)
        .values({
          requestType: input.requestType,
          requestedBy: ctx.user.id,
          action: input.action,
          justification: input.justification,
          estimatedCost: input.estimatedCost,
          priority: input.priority,
          status: 'pending',
          metadata: input.metadata,
        });

      const requestId = (result as any)[0]?.insertId || (result as any).insertId;
      if (!requestId) throw new Error('Failed to create approval request');

      // Create receipt
      await createReceipt({
        action: 'approval_request_created',
        actor: `user:${ctx.user.id}`,
        outcome: 'success',
        details: {
          requestId,
          requestType: input.requestType,
          action: input.action,
          priority: input.priority,
        },
        severity: input.priority === 'critical' || input.priority === 'high' ? 'high' : 'medium',
      });

      // Send notification to admins
      await sendNotification({
        type: 'approval_request',
        title: `New Approval Request: ${input.action}`,
        message: `Priority: ${input.priority}\nJustification: ${input.justification}`,
        severity: input.priority === 'critical' || input.priority === 'high' ? 'high' : 'medium',
        details: {
          requestId,
          requestType: input.requestType,
        },
      });

      return { id: requestId };
    }),

  /**
   * Approve an approval request
   */
  approve: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Update request status
      await db
        .update(approvalRequests)
        .set({
          status: 'approved',
          reviewedBy: ctx.user.id,
          reviewComment: input.comment,
          reviewedAt: new Date(),
        })
        .where(eq(approvalRequests.id, input.requestId));

      // Get request details
      const [request] = await db
        .select()
        .from(approvalRequests)
        .where(eq(approvalRequests.id, input.requestId))
        .limit(1);

      // Create receipt
      await createReceipt({
        action: 'approval_request_approved',
        actor: `user:${ctx.user.id}`,
        outcome: 'success',
        details: {
          requestId: input.requestId,
          requestType: request?.requestType,
          action: request?.action,
          comment: input.comment,
        },
        severity: 'medium',
      });

      // Notify requester
      if (request) {
        await sendNotification({
          type: 'approval_request',
          title: `Approval Request Approved: ${request.action}`,
          message: `Your request has been approved${input.comment ? `\n\nComment: ${input.comment}` : ''}`,
          severity: 'low',
          details: {
            requestId: input.requestId,
            decision: 'approved',
          },
          userId: request.requestedBy,
        });
      }

      return { success: true };
    }),

  /**
   * Reject an approval request
   */
  reject: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      comment: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Update request status
      await db
        .update(approvalRequests)
        .set({
          status: 'rejected',
          reviewedBy: ctx.user.id,
          reviewComment: input.comment,
          reviewedAt: new Date(),
        })
        .where(eq(approvalRequests.id, input.requestId));

      // Get request details
      const [request] = await db
        .select()
        .from(approvalRequests)
        .where(eq(approvalRequests.id, input.requestId))
        .limit(1);

      // Create receipt
      await createReceipt({
        action: 'approval_request_rejected',
        actor: `user:${ctx.user.id}`,
        outcome: 'success',
        details: {
          requestId: input.requestId,
          requestType: request?.requestType,
          action: request?.action,
          comment: input.comment,
        },
        severity: 'medium',
      });

      // Notify requester
      if (request) {
        await sendNotification({
          type: 'approval_request',
          title: `Approval Request Rejected: ${request.action}`,
          message: `Your request has been rejected.\n\nReason: ${input.comment}`,
          severity: 'medium',
          details: {
            requestId: input.requestId,
            decision: 'rejected',
          },
          userId: request.requestedBy,
        });
      }

      return { success: true };
    }),

  /**
   * Cancel an approval request (by requester)
   */
  cancel: protectedProcedure
    .input(z.object({
      requestId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Verify requester owns this request
      const [request] = await db
        .select()
        .from(approvalRequests)
        .where(
          and(
            eq(approvalRequests.id, input.requestId),
            eq(approvalRequests.requestedBy, ctx.user.id)
          )
        )
        .limit(1);

      if (!request) {
        throw new Error('Request not found or you do not have permission to cancel it');
      }

      if (request.status !== 'pending') {
        throw new Error('Only pending requests can be cancelled');
      }

      // Update status
      await db
        .update(approvalRequests)
        .set({
          status: 'cancelled',
        })
        .where(eq(approvalRequests.id, input.requestId));

      // Create receipt
      await createReceipt({
        action: 'approval_request_cancelled',
        actor: `user:${ctx.user.id}`,
        outcome: 'success',
        details: {
          requestId: input.requestId,
          requestType: request.requestType,
          action: request.action,
        },
        severity: 'low',
      });

      return { success: true };
    }),

  /**
   * Bulk approve multiple approval requests
   */
  bulkApprove: protectedProcedure
    .input(z.object({
      requestIds: z.array(z.number()).min(1),
      comment: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      let successCount = 0;
      let failureCount = 0;

      for (const requestId of input.requestIds) {
        try {
          // Update request status
          await db
            .update(approvalRequests)
            .set({
              status: 'approved',
              reviewedBy: ctx.user.id,
              reviewComment: input.comment,
              reviewedAt: new Date(),
            })
            .where(eq(approvalRequests.id, requestId));

          // Get request details
          const [request] = await db
            .select()
            .from(approvalRequests)
            .where(eq(approvalRequests.id, requestId))
            .limit(1);

          // Create receipt
          await createReceipt({
            action: 'approval_request_approved',
            actor: `user:${ctx.user.id}`,
            outcome: 'success',
            details: {
              requestId,
              requestType: request?.requestType,
              action: request?.action,
              comment: input.comment,
              bulkOperation: true,
            },
            severity: 'medium',
          });

          // Notify requester
          if (request) {
            await sendNotification({
              type: 'approval_request',
              title: `Approval Request Approved: ${request.action}`,
              message: `Your request has been approved${input.comment ? `\n\nComment: ${input.comment}` : ''}`,
              severity: 'low',
              details: {
                requestId,
                decision: 'approved',
              },
              userId: request.requestedBy,
            });
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to approve request ${requestId}:`, error);
          failureCount++;
        }
      }

      return { successCount, failureCount, total: input.requestIds.length };
    }),

  /**
   * Bulk reject multiple approval requests
   */
  bulkReject: protectedProcedure
    .input(z.object({
      requestIds: z.array(z.number()).min(1),
      comment: z.string().min(1, 'Rejection reason is required'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      let successCount = 0;
      let failureCount = 0;

      for (const requestId of input.requestIds) {
        try {
          // Update request status
          await db
            .update(approvalRequests)
            .set({
              status: 'rejected',
              reviewedBy: ctx.user.id,
              reviewComment: input.comment,
              reviewedAt: new Date(),
            })
            .where(eq(approvalRequests.id, requestId));

          // Get request details
          const [request] = await db
            .select()
            .from(approvalRequests)
            .where(eq(approvalRequests.id, requestId))
            .limit(1);

          // Create receipt
          await createReceipt({
            action: 'approval_request_rejected',
            actor: `user:${ctx.user.id}`,
            outcome: 'success',
            details: {
              requestId,
              requestType: request?.requestType,
              action: request?.action,
              comment: input.comment,
              bulkOperation: true,
            },
            severity: 'medium',
          });

          // Notify requester
          if (request) {
            await sendNotification({
              type: 'approval_request',
              title: `Approval Request Rejected: ${request.action}`,
              message: `Your request has been rejected.\n\nReason: ${input.comment}`,
              severity: 'medium',
              details: {
                requestId,
                decision: 'rejected',
              },
              userId: request.requestedBy,
            });
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to reject request ${requestId}:`, error);
          failureCount++;
        }
      }

      return { successCount, failureCount, total: input.requestIds.length };
    }),
});
