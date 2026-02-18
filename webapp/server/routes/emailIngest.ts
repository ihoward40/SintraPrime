import { Router } from 'express';
import { getDb } from '../db';
import { emailMessages, emailAttachments, cases, workflowTriggers, triggerExecutions, workflowExecutions, workflows } from '../../drizzle/schema';
import { storagePut } from '../storage';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Email Ingest Webhook
 * 
 * Receives emails from Make.com Gmail integration
 * Expected payload format:
 * {
 *   messageId: string,
 *   from: string,
 *   to: string[], 
 *   cc?: string[],
 *   subject: string,
 *   body: string,
 *   htmlBody?: string,
 *   receivedAt: string (ISO timestamp),
 *   attachments?: Array<{
 *     filename: string,
 *     contentType: string,
 *     size: number,
 *     content: string (base64)
 *   }>
 * }
 */
router.post('/ingest', async (req, res) => {
  try {
    const {
      messageId,
      from,
      to,
      cc,
      subject,
      body,
      htmlBody,
      receivedAt,
      attachments = [],
    } = req.body;

    // Validate required fields
    if (!messageId || !from || !to || !receivedAt) {
      return res.status(400).json({
        error: 'Missing required fields: messageId, from, to, receivedAt'
      });
    }

    // Check if email already exists (deduplication)
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database connection failed' });
    }
    const [existingRows] = await db.select().from(emailMessages).where(eq(emailMessages.messageId, messageId)).limit(1);
    const existing = existingRows;

    if (existing) {
      return res.status(200).json({
        message: 'Email already processed',
        emailId: existing.id,
        duplicate: true
      });
    }

    // Process attachments - upload to S3
    const processedAttachments = [];
    for (const attachment of attachments) {
      if (attachment.content) {
        // Decode base64 content
        const buffer = Buffer.from(attachment.content, 'base64');
        
        // Generate S3 key
        const timestamp = Date.now();
        const randomSuffix = crypto.randomBytes(8).toString('hex');
        const s3Key = `email-attachments/${timestamp}-${randomSuffix}-${attachment.filename}`;
        
        // Upload to S3
        const { url: s3Url } = await storagePut(
          s3Key,
          buffer,
          attachment.contentType || 'application/octet-stream'
        );

        processedAttachments.push({
          filename: attachment.filename,
          contentType: attachment.contentType,
          size: attachment.size || buffer.length,
          s3Key,
          s3Url
        });
      }
    }

    // Insert email message
    const insertResult: any = await db.insert(emailMessages).values({
      messageId,
      from,
      to: JSON.stringify(to),
      cc: cc ? JSON.stringify(cc) : null,
      subject,
      body,
      htmlBody,
      attachments: processedAttachments.length > 0 ? processedAttachments : null,
      receivedAt: new Date(receivedAt),
      processed: false,
      metadata: {
        source: 'make.com',
        ingestedAt: new Date().toISOString()
      }
    });

    // Auto-create case from legal emails (if subject contains legal keywords)
    const legalKeywords = ['case', 'lawsuit', 'complaint', 'motion', 'discovery', 'fdcpa', 'fcra', 'tcpa', 'debt', 'court', 'litigation'];
    const subjectLower = subject.toLowerCase();
    const isLegalEmail = legalKeywords.some(keyword => subjectLower.includes(keyword));
    
    let caseId = null;
    if (isLegalEmail) {
      // Extract case number if present (pattern: Case #XXXXX or No. XXXXX)
      const caseNumberMatch = subject.match(/(?:case|no\.?)\s*#?\s*([A-Z0-9-]+)/i);
      const extractedCaseNumber = caseNumberMatch ? caseNumberMatch[1] : null;
      
      // Create new case
      const caseResult: any = await db.insert(cases).values({
        userId: 1, // Default to first user - should be updated based on email routing
        title: subject,
        caseNumber: extractedCaseNumber,
        description: `Auto-created from email: ${from}\n\n${body.substring(0, 500)}...`,
        status: 'draft',
        caseType: 'General',
        metadata: {
          source: 'email_ingest',
          originalEmailId: messageId,
          autoCreated: true,
          createdAt: new Date().toISOString()
        }
      });
      
      caseId = caseResult.insertId || caseResult[0]?.insertId || null;
    }

    // Insert attachment records
    const emailId = insertResult.insertId || insertResult[0]?.insertId || 0;
    if (processedAttachments.length > 0 && emailId) {
      await db.insert(emailAttachments).values(
        processedAttachments.map(att => ({
          emailId,
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          s3Key: att.s3Key,
          s3Url: att.s3Url
        }))
      );
    }

    // Check for workflow triggers
    const triggersToFire = await checkEmailTriggers(db, subject, body, from, emailId);
    
    res.status(200).json({
      message: 'Email ingested successfully',
      emailId,
      attachmentCount: processedAttachments.length,
      caseCreated: !!caseId,
      caseId,
      triggersExecuted: triggersToFire.length
    });

  } catch (error: any) {
    console.error('[Email Ingest] Error:', error);
    res.status(500).json({
      error: 'Failed to ingest email',
      details: error.message
    });
  }
});

export default router;


/**
 * Check if email matches any workflow triggers
 */
async function checkEmailTriggers(db: any, subject: string, body: string, from: string, emailId: number) {
  // Get all active email triggers
  const triggers = await db
    .select()
    .from(workflowTriggers)
    .where(eq(workflowTriggers.triggerType, 'email_received'))
    .where(eq(workflowTriggers.isActive, true));

  const firedTriggers = [];

  for (const trigger of triggers) {
    const conditions = trigger.conditions || {};
    let matched = false;
    const matchedConditions: any = {};

    // Check keyword matching
    if (conditions.keywords && conditions.keywords.length > 0) {
      const text = `${subject} ${body}`.toLowerCase();
      const matchedKeywords = conditions.keywords.filter((keyword: string) => 
        text.includes(keyword.toLowerCase())
      );
      
      if (matchedKeywords.length > 0) {
        matched = true;
        matchedConditions.keywords = matchedKeywords;
        matchedConditions.field = 'subject/body';
      }
    }

    // Check sender email matching
    if (conditions.senderEmail && conditions.senderEmail.length > 0) {
      const matchedSenders = conditions.senderEmail.filter((email: string) =>
        from.toLowerCase().includes(email.toLowerCase())
      );
      
      if (matchedSenders.length > 0) {
        matched = true;
        matchedConditions.senderEmail = matchedSenders;
      }
    }

    // If trigger matched, execute workflow
    if (matched) {
      try {
        // Create trigger execution record
        const triggerExecResult: any = await db.insert(triggerExecutions).values({
          triggerId: trigger.id,
          eventType: 'email_received',
          eventId: emailId,
          eventData: {
            subject,
            from,
            bodyPreview: body.substring(0, 500)
          },
          matchedConditions,
          status: 'pending'
        });

        const triggerExecId = triggerExecResult.insertId || triggerExecResult[0]?.insertId;

        // Get workflow definition
        const [workflow] = await db
          .select()
          .from(workflows)
          .where(eq(workflows.id, trigger.workflowId))
          .limit(1);

        if (workflow) {
          const executionParams = trigger.executionParams || {};
          
          // Create workflow execution
          const workflowExecResult: any = await db.insert(workflowExecutions).values({
            workflowId: workflow.id,
            userId: trigger.userId,
            status: executionParams.autoStart ? 'running' : 'pending',
            currentStep: 0,
            totalSteps: workflow.definition?.steps?.length || 0,
            variables: {
              ...executionParams.variables,
              emailId,
              emailSubject: subject,
              emailFrom: from,
              emailBody: body
            },
            metadata: {
              triggeredBy: 'email_ingest',
              triggerId: trigger.id,
              triggerExecId
            }
          });

          const workflowExecId = workflowExecResult.insertId || workflowExecResult[0]?.insertId;

          // Update trigger execution with workflow execution ID
          await db
            .update(triggerExecutions)
            .set({
              workflowExecutionId: workflowExecId,
              status: 'executed',
              executedAt: new Date()
            })
            .where(eq(triggerExecutions.id, triggerExecId));

          // Update trigger last triggered
          await db
            .update(workflowTriggers)
            .set({
              lastTriggered: new Date(),
              triggerCount: trigger.triggerCount + 1
            })
            .where(eq(workflowTriggers.id, trigger.id));

          firedTriggers.push({
            triggerId: trigger.id,
            workflowId: workflow.id,
            workflowExecId
          });
        }
      } catch (error) {
        console.error(`[Email Ingest] Trigger execution failed for trigger ${trigger.id}:`, error);
      }
    }
  }

  return firedTriggers;
}
