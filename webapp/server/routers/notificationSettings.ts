import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { notificationSettings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { createReceipt } from '../lib/receiptLedger';

export const notificationSettingsRouter = router({
  /**
   * Get notification settings for current user
   */
  get: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const settings = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, ctx.user.id))
        .limit(1);
      
      if (settings.length === 0) {
        // Return default settings if none exist
        return {
          userId: ctx.user.id,
          slackEnabled: false,
          slackWebhookUrl: null,
          slackChannel: null,
          emailEnabled: false,
          emailRecipients: null,
          notifyHighSeverity: true,
          notifyPolicyViolations: true,
          notifySpendingThresholds: true,
          notifyApprovalRequests: true,
          notifyComplianceIssues: true,
          spendingThresholdPercent: 80,
        };
      }
      
      return settings[0];
    }),
  
  /**
   * Save notification settings
   */
  save: protectedProcedure
    .input(z.object({
      slackEnabled: z.boolean(),
      slackWebhookUrl: z.string().optional(),
      slackChannel: z.string().optional(),
      emailEnabled: z.boolean(),
      emailRecipients: z.string().optional(),
      notifyHighSeverity: z.boolean(),
      notifyPolicyViolations: z.boolean(),
      notifySpendingThresholds: z.boolean(),
      notifyApprovalRequests: z.boolean(),
      notifyComplianceIssues: z.boolean(),
      spendingThresholdPercent: z.number().min(1).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      // Check if settings exist
      const existing = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, ctx.user.id))
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing settings
        await db
          .update(notificationSettings)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(notificationSettings.userId, ctx.user.id));
      } else {
        // Insert new settings
        await db.insert(notificationSettings).values({
          userId: ctx.user.id,
          ...input,
        });
      }
      
      return { success: true };
    }),
  
  /**
   * Send test notification
   */
  sendTest: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const settings = await db
        .select()
        .from(notificationSettings)
        .where(eq(notificationSettings.userId, ctx.user.id))
        .limit(1);
      
      if (settings.length === 0) {
        throw new Error('No notification settings found. Please save your settings first.');
      }
      
      const config = settings[0];
      const results = {
        slack: false,
        email: false,
      };
      
      // Send test Slack notification
      if (config.slackEnabled && config.slackWebhookUrl) {
        try {
          const payload = {
            channel: config.slackChannel,
            username: 'SintraPrime Governance',
            icon_emoji: ':test_tube:',
            text: '🧪 Test Notification',
            attachments: [{
              color: '#36a64f',
              title: 'Test Notification',
              text: 'This is a test notification from SintraPrime Governance System.',
              footer: 'SintraPrime',
              ts: Math.floor(Date.now() / 1000),
            }],
          };
          
          const response = await fetch(config.slackWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          
          if (response.ok) {
            results.slack = true;
            await createReceipt({
              action: 'test_notification_slack',
              actor: `user:${ctx.user.id}`,
              details: { channel: config.slackChannel || 'default' },
              outcome: 'success',
            });
          }
        } catch (error) {
          console.error('Failed to send Slack test notification:', error);
        }
      }
      
      // Send test email notification (log only for now)
      if (config.emailEnabled && config.emailRecipients) {
        try {
          const recipients = config.emailRecipients.split(',').map((e: string) => e.trim());
          console.log(`[Test Email] Would send to: ${recipients.join(', ')}`);
          results.email = true;
          
          await createReceipt({
            action: 'test_notification_email',
            actor: `user:${ctx.user.id}`,
            details: { recipients },
            outcome: 'success',
          });
        } catch (error) {
          console.error('Failed to send email test notification:', error);
        }
      }
      
      return results;
    }),
});
