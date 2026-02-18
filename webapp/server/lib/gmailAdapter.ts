import { getDb } from '../db';
import { adapterConnections, adapterRequests } from '../../drizzle/schema-adapters';
import { eq, and } from 'drizzle-orm';

/**
 * Gmail Adapter - Governed email operations
 * MVP: Basic send email functionality with approval workflow
 */

export interface GmailSendParams {
  to: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded
    mimeType: string;
  }>;
}

/**
 * Request to send email (requires approval)
 */
export async function requestSendEmail(
  userId: number,
  connectionId: number,
  params: GmailSendParams
): Promise<{ requestId: number; status: string }> {
  const db = await getDb();
  
  // Create approval request
  const result = await db.insert(adapterRequests).values({
    userId,
    connectionId,
    requestType: 'send_email',
    params: params as any,
    status: 'pending',
    approvalStatus: 'pending',
  });

  return {
    requestId: result[0].insertId,
    status: 'pending_approval',
  };
}

/**
 * Execute approved email send
 */
export async function executeSendEmail(
  requestId: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const db = await getDb();
  
  // Get request
  const requests = await db
    .select()
    .from(adapterRequests)
    .where(eq(adapterRequests.id, requestId));
  
  if (requests.length === 0) {
    return { success: false, error: 'Request not found' };
  }

  const request = requests[0];

  if (request.approvalStatus !== 'approved') {
    return { success: false, error: 'Request not approved' };
  }

  // Get connection
  const connections = await db
    .select()
    .from(adapterConnections)
    .where(eq(adapterConnections.id, request.connectionId));

  if (connections.length === 0) {
    return { success: false, error: 'Connection not found' };
  }

  const connection = connections[0];

  // MVP: Simulate email send (in production, use Gmail API)
  console.log('[Gmail Adapter] Sending email:', {
    connection: connection.connectionName,
    to: (request.params as any).to,
    subject: (request.params as any).subject,
  });

  // Update request status
  await db
    .update(adapterRequests)
    .set({
      status: 'executed',
      executedAt: new Date(),
      executionResult: {
        messageId: `msg_${Date.now()}`,
        success: true,
      },
    })
    .where(eq(adapterRequests.id, requestId));

  return {
    success: true,
    messageId: `msg_${Date.now()}`,
  };
}

/**
 * Approve adapter request
 */
export async function approveAdapterRequest(
  requestId: number,
  approverId: number
): Promise<void> {
  const db = await getDb();
  
  await db
    .update(adapterRequests)
    .set({
      approvalStatus: 'approved',
      approvedBy: approverId,
      approvedAt: new Date(),
    })
    .where(eq(adapterRequests.id, requestId));

  // Auto-execute after approval (in production, this might be queued)
  await executeSendEmail(requestId);
}

/**
 * Reject adapter request
 */
export async function rejectAdapterRequest(
  requestId: number,
  approverId: number,
  reason: string
): Promise<void> {
  const db = await getDb();
  
  await db
    .update(adapterRequests)
    .set({
      approvalStatus: 'rejected',
      approvedBy: approverId,
      approvedAt: new Date(),
      rejectionReason: reason,
      status: 'rejected',
    })
    .where(eq(adapterRequests.id, requestId));
}
