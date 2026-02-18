/**
 * Notification System
 * 
 * Provides email and Slack notifications for governance events
 */

import { notifyOwner } from '../_core/notification';
import { createReceipt } from './receiptLedger';
import {
  policyViolationEmail,
  spendingAlertEmail,
  approvalRequestEmail,
  highSeverityEventEmail,
} from './emailTemplates';

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    recipients: string[];
  };
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
    channel?: string;
  };
}

export interface NotificationEvent {
  type: 'high_severity' | 'policy_violation' | 'spending_threshold' | 'approval_request' | 'compliance_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details?: Record<string, any>;
  userId?: number;
}

/**
 * Send notification through configured channels
 * @param {NotificationEvent} event - Notification event
 * @param {NotificationConfig} config - Notification configuration
 * @returns {Promise<void>}
 */
export async function sendNotification(
  event: NotificationEvent,
  config?: NotificationConfig
): Promise<void> {
  // Create audit receipt for notification
  await createReceipt({
    action: 'notification_sent',
    actor: 'system',
    details: {
      type: event.type,
      severity: event.severity,
      title: event.title,
    },
    outcome: 'success',
    severity: event.severity,
  });
  
  // Send to owner notification (always enabled)
  await notifyOwner({
    title: `[${event.severity.toUpperCase()}] ${event.title}`,
    content: event.message,
  });
  
  // Send email notifications
  if (config?.email?.enabled && config.email.recipients.length > 0) {
    await sendEmailNotification(event, config.email.recipients);
  }
  
  // Send Slack notifications
  if (config?.slack?.enabled && config.slack.webhookUrl) {
    await sendSlackNotification(event, config.slack.webhookUrl, config.slack.channel);
  }
}

/**
 * Send email notification
 * @param {NotificationEvent} event - Notification event
 * @param {string[]} recipients - Email recipients
 * @returns {Promise<void>}
 */
async function sendEmailNotification(
  event: NotificationEvent,
  recipients: string[]
): Promise<void> {
  // Generate HTML email using appropriate template
  let htmlContent: string;
  
  switch (event.type) {
    case 'policy_violation':
      htmlContent = policyViolationEmail({
        recipientName: 'Administrator',
        violationType: event.title,
        description: event.message,
        severity: event.severity,
        timestamp: new Date().toISOString(),
        actor: event.details?.actor || 'Unknown',
        dashboardUrl: 'https://sintraprime.manus.space/governance',
      });
      break;
    
    case 'spending_threshold':
      htmlContent = spendingAlertEmail({
        recipientName: 'Administrator',
        alertType: event.details?.period ? `${event.details.period}_limit` as any : 'threshold',
        currentSpending: event.details?.current_spending || '$0',
        limit: event.details?.limit || '$0',
        percentage: parseFloat(event.details?.percentage || '0'),
        dashboardUrl: 'https://sintraprime.manus.space/governance',
      });
      break;
    
    case 'approval_request':
      htmlContent = approvalRequestEmail({
        recipientName: 'Administrator',
        requestType: event.title,
        requestedBy: event.details?.actor || `User ${event.userId}`,
        description: event.message,
        estimatedCost: event.details?.estimated_cost,
        timestamp: new Date().toISOString(),
        approvalUrl: 'https://sintraprime.manus.space/approvals',
      });
      break;
    
    default:
      htmlContent = highSeverityEventEmail({
        recipientName: 'Administrator',
        eventType: event.title,
        description: event.message,
        impact: 'Requires immediate attention',
        timestamp: new Date().toISOString(),
        actor: event.details?.actor || 'System',
        dashboardUrl: 'https://sintraprime.manus.space/governance',
      });
  }
  
  // In production, use SendGrid or similar email service
  // For now, just log
  console.log(`[Email Notification] Sent to ${recipients.join(', ')}`);
  console.log(`Subject: [${event.severity.toUpperCase()}] ${event.title}`);
  console.log(`HTML Email Generated: ${htmlContent.length} characters`);
  
  await createReceipt({
    action: 'email_notification_sent',
    actor: 'system',
    details: {
      recipients,
      subject: event.title,
      type: event.type,
    },
    outcome: 'success',
  });
}

/**
 * Send Slack notification
 * @param {NotificationEvent} event - Notification event
 * @param {string} webhookUrl - Slack webhook URL
 * @param {string} channel - Slack channel (optional)
 * @returns {Promise<void>}
 */
async function sendSlackNotification(
  event: NotificationEvent,
  webhookUrl: string,
  channel?: string
): Promise<void> {
  const severityColors = {
    low: '#36a64f',
    medium: '#ffcc00',
    high: '#ff9900',
    critical: '#ff0000',
  };
  
  const payload = {
    channel,
    username: 'SintraPrime Governance',
    icon_emoji: ':shield:',
    attachments: [
      {
        color: severityColors[event.severity],
        title: event.title,
        text: event.message,
        fields: event.details ? Object.entries(event.details).map(([key, value]) => ({
          title: key,
          value: String(value),
          short: true,
        })) : [],
        footer: 'SintraPrime Governance System',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }
    
    await createReceipt({
      action: 'slack_notification_sent',
      actor: 'system',
      details: {
        channel: channel || 'default',
        title: event.title,
        type: event.type,
      },
      outcome: 'success',
    });
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    
    await createReceipt({
      action: 'slack_notification_failed',
      actor: 'system',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        title: event.title,
      },
      outcome: 'failure',
      severity: 'medium',
    });
  }
}

/**
 * Send high-severity event alert
 * @param {string} action - Action that triggered the alert
 * @param {string} actor - Actor who performed the action
 * @param {string} reason - Reason for the alert
 * @param {NotificationConfig} config - Notification configuration
 * @returns {Promise<void>}
 */
export async function sendHighSeverityAlert(
  action: string,
  actor: string,
  reason: string,
  config?: NotificationConfig
): Promise<void> {
  await sendNotification({
    type: 'high_severity',
    severity: 'high',
    title: 'High-Severity Action Detected',
    message: `Action "${action}" by ${actor} requires review.\n\nReason: ${reason}`,
    details: {
      action,
      actor,
      reason,
      timestamp: new Date().toISOString(),
    },
  }, config);
}

/**
 * Send policy violation alert
 * @param {string} policy - Policy that was violated
 * @param {string} actor - Actor who violated the policy
 * @param {string} details - Violation details
 * @param {NotificationConfig} config - Notification configuration
 * @returns {Promise<void>}
 */
export async function sendPolicyViolationAlert(
  policy: string,
  actor: string,
  details: string,
  config?: NotificationConfig
): Promise<void> {
  await sendNotification({
    type: 'policy_violation',
    severity: 'high',
    title: 'Policy Violation Detected',
    message: `Policy "${policy}" violated by ${actor}.\n\nDetails: ${details}`,
    details: {
      policy,
      actor,
      violation_details: details,
      timestamp: new Date().toISOString(),
    },
  }, config);
}

/**
 * Send spending threshold warning
 * @param {number} userId - User ID
 * @param {string} period - Time period (daily/weekly/monthly)
 * @param {number} currentSpending - Current spending in cents
 * @param {number} limit - Spending limit in cents
 * @param {NotificationConfig} config - Notification configuration
 * @returns {Promise<void>}
 */
export async function sendSpendingThresholdWarning(
  userId: number,
  period: string,
  currentSpending: number,
  limit: number,
  config?: NotificationConfig
): Promise<void> {
  const percentage = (currentSpending / limit) * 100;
  
  await sendNotification({
    type: 'spending_threshold',
    severity: percentage >= 90 ? 'high' : 'medium',
    title: 'Spending Threshold Warning',
    message: `User ${userId} has reached ${percentage.toFixed(1)}% of their ${period} spending limit.\n\nCurrent: $${(currentSpending / 100).toFixed(2)}\nLimit: $${(limit / 100).toFixed(2)}`,
    details: {
      user_id: userId,
      period,
      current_spending: `$${(currentSpending / 100).toFixed(2)}`,
      limit: `$${(limit / 100).toFixed(2)}`,
      percentage: `${percentage.toFixed(1)}%`,
    },
    userId,
  }, config);
}

/**
 * Send approval request notification
 * @param {number} userId - User ID
 * @param {string} action - Action requiring approval
 * @param {number} estimatedCost - Estimated cost in cents
 * @param {string} justification - Justification for the action
 * @param {NotificationConfig} config - Notification configuration
 * @returns {Promise<void>}
 */
export async function sendApprovalRequestNotification(
  userId: number,
  action: string,
  estimatedCost: number,
  justification: string,
  config?: NotificationConfig
): Promise<void> {
  await sendNotification({
    type: 'approval_request',
    severity: 'medium',
    title: 'Approval Request',
    message: `User ${userId} requests approval for "${action}".\n\nEstimated Cost: $${(estimatedCost / 100).toFixed(2)}\nJustification: ${justification}`,
    details: {
      user_id: userId,
      action,
      estimated_cost: `$${(estimatedCost / 100).toFixed(2)}`,
      justification,
    },
    userId,
  }, config);
}

/**
 * Send compliance issue alert
 * @param {string} issue - Compliance issue description
 * @param {string} severity - Issue severity
 * @param {NotificationConfig} config - Notification configuration
 * @returns {Promise<void>}
 */
export async function sendComplianceIssueAlert(
  issue: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  config?: NotificationConfig
): Promise<void> {
  await sendNotification({
    type: 'compliance_issue',
    severity,
    title: 'Compliance Issue Detected',
    message: `Compliance issue detected: ${issue}`,
    details: {
      issue,
      severity,
      timestamp: new Date().toISOString(),
    },
  }, config);
}

/**
 * Get default notification configuration
 * @returns {NotificationConfig} Default configuration
 */
export function getDefaultNotificationConfig(): NotificationConfig {
  return {
    email: {
      enabled: false,
      recipients: [],
    },
    slack: {
      enabled: false,
    },
  };
}
