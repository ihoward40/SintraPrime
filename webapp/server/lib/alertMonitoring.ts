/**
 * Real-time Alert Monitoring Service
 * Checks compliance thresholds and sends notifications
 */

import { getDb } from '../db';
import { receiptLedger } from '../../drizzle/schema';
import { desc, gte, sql } from 'drizzle-orm';
import { sendAlertEmail, sendSlackAlert } from './alertService';

interface AlertConfig {
  id: number;
  userId: number;
  complianceMinScore: string;
  violationCountThreshold: number;
  emailEnabled: boolean;
  emailAddress: string | null;
  slackEnabled: boolean;
  slackWebhookUrl: string | null;
  enabled: boolean;
  cooldownMinutes: number;
  lastAlertSent: Date | null;
}

interface AlertHistory {
  id: number;
  userId: number;
  alertType: string;
  message: string;
  sentAt: Date;
}

/**
 * Check if enough time has passed since last alert (cooldown period)
 */
function shouldSendAlert(lastAlertSent: Date | null, cooldownMinutes: number): boolean {
  if (!lastAlertSent) return true;
  
  const now = new Date();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  const timeSinceLastAlert = now.getTime() - lastAlertSent.getTime();
  
  return timeSinceLastAlert >= cooldownMs;
}

/**
 * Calculate current compliance score
 */
async function calculateComplianceScore(): Promise<number> {
  const db = await getDb();
  if (!db) return 100;

  // Get receipts from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const receipts = await db
    .select()
    .from(receiptLedger)
    .where(gte(receiptLedger.timestamp, sevenDaysAgo))
    .orderBy(desc(receiptLedger.timestamp));

  if (receipts.length === 0) return 100;

  const failures = receipts.filter(r => r.outcome === 'failure');
  const score = Math.round(((receipts.length - failures.length) / receipts.length) * 100);
  
  return score;
}

/**
 * Count recent violations
 */
async function countRecentViolations(days: number = 1): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const receipts = await db
    .select()
    .from(receiptLedger)
    .where(gte(receiptLedger.timestamp, cutoffDate));

  return receipts.filter(r => r.outcome === 'failure').length;
}

/**
 * Send alert notification via configured channels
 */
async function sendAlert(
  config: AlertConfig,
  alertType: string,
  message: string
): Promise<boolean> {
  let sent = false;

  // Send email if enabled
  if (config.emailEnabled && config.emailAddress) {
    try {
      await sendAlertEmail(
        config.emailAddress,
        `SintraPrime Alert: ${alertType}`,
        message
      );
      sent = true;
    } catch (error) {
      console.error('Failed to send email alert:', error);
    }
  }

  // Send Slack if enabled
  if (config.slackEnabled && config.slackWebhookUrl) {
    try {
      await sendSlackAlert(config.slackWebhookUrl, alertType, message);
      sent = true;
    } catch (error) {
      console.error('Failed to send Slack alert:', error);
    }
  }

  return sent;
}

/**
 * Log alert to history
 */
async function logAlert(
  configId: number,
  alertType: string,
  message: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { alertHistory } = await import('../../drizzle/schema-alerts');

  await db.insert(alertHistory).values({
    configurationId: configId,
    alertType,
    message,
    severity,
    emailSent: false,
    slackSent: false,
  });
}

/**
 * Update last alert sent timestamp
 */
// Removed updateLastAlertSent - lastAlertSent field doesn't exist in schema

/**
 * Check compliance threshold and send alert if needed
 */
async function checkComplianceThreshold(config: AlertConfig): Promise<void> {
  const currentScore = await calculateComplianceScore();
  const threshold = parseInt(config.complianceMinScore || '90');

  if (currentScore < threshold) {
    if (!shouldSendAlert(config.lastAlertSent, config.cooldownMinutes)) {
      console.log(`Compliance alert skipped due to cooldown period`);
      return;
    }

    const message = `⚠️ Compliance Score Alert\n\nYour compliance score has dropped to ${currentScore}%, which is below your threshold of ${threshold}%.\n\nPlease review recent violations in the Governance Audit Log.`;

    const sent = await sendAlert(config, 'Compliance Threshold', message);
    
    if (sent) {
      await logAlert(config.id, 'compliance_threshold', message, 'high');
      console.log(`Compliance alert sent to user ${config.userId}`);
    }
  }
}

/**
 * Check violation count and send alert if needed
 */
async function checkViolationCount(config: AlertConfig): Promise<void> {
  const recentViolations = await countRecentViolations(1);
  const threshold = config.violationCountThreshold || 5;

  if (recentViolations > threshold) {
    if (!shouldSendAlert(config.lastAlertSent, config.cooldownMinutes)) {
      console.log(`Violation count alert skipped due to cooldown period`);
      return;
    }

    const message = `⚠️ Violation Count Alert\n\n${recentViolations} policy violations detected in the last 24 hours, exceeding your threshold of ${threshold}.\n\nPlease review the violations in the Governance Audit Log.`;

    const sent = await sendAlert(config, 'Violation Count', message);
    
    if (sent) {
      await logAlert(config.id, 'violation_count', message, 'medium');
      console.log(`Violation count alert sent to user ${config.userId}`);
    }
  }
}

/**
 * Main monitoring function - checks all active alert configurations
 */
export async function monitorAlerts(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed in alert monitoring');
    return;
  }

  const { alertConfigurations } = await import('../../drizzle/schema-alerts');
  const { eq } = await import('drizzle-orm');

  // Get all enabled alert configurations
  const configs = await db
    .select()
    .from(alertConfigurations)
    .where(eq(alertConfigurations.enabled, true));

  console.log(`[Alert Monitoring] Checking ${configs.length} active configurations`);

  for (const config of configs) {
    try {
      // Check compliance threshold
      await checkComplianceThreshold(config as any);

      // Check violation count
      await checkViolationCount(config as any);

      // TODO: Add spending limit check when implemented
    } catch (error) {
      console.error(`Error checking alerts for user ${config.userId}:`, error);
    }
  }

  console.log(`[Alert Monitoring] Check complete`);
}

/**
 * Start periodic monitoring (call this once on server startup)
 */
export function startAlertMonitoring(intervalMinutes: number = 5): NodeJS.Timeout {
  console.log(`[Alert Monitoring] Starting with ${intervalMinutes}-minute interval`);
  
  // Run immediately on startup
  monitorAlerts().catch(console.error);
  
  // Then run periodically
  const intervalMs = intervalMinutes * 60 * 1000;
  return setInterval(() => {
    monitorAlerts().catch(console.error);
  }, intervalMs);
}
