/**
 * Alert Service - Automated Governance Notifications
 * Monitors compliance metrics and sends alerts via email/Slack
 */

import { getDb } from '../db';
import { alertConfigurations, alertHistory } from '../../drizzle/schema-alerts';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * Send email alert via SendGrid
 */
export async function sendAlertEmail(
  to: string,
  subject: string,
  message: string
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error('SENDGRID_API_KEY not configured');
    return;
  }

  const fromEmail = process.env.FROM_EMAIL || 'noreply@sintraprime.com';
  const fromName = process.env.FROM_NAME || 'SintraPrime Alerts';

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [{ type: 'text/plain', value: message }],
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid API error: ${response.status}`);
    }

    console.log(`Email alert sent to ${to}`);
  } catch (error) {
    console.error('Failed to send email alert:', error);
    throw error;
  }
}

/**
 * Send Slack alert via webhook
 */
export async function sendSlackAlert(
  webhookUrl: string,
  title: string,
  message: string
): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `*${title}*\n${message}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook error: ${response.status}`);
    }

    console.log(`Slack alert sent`);
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
    throw error;
  }
}

interface AlertTrigger {
  configId: number;
  alertType: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggerValue: number;
  threshold: number;
}

/**
 * Check compliance score and trigger alerts if needed
 */
export async function checkComplianceAlerts(userId: number, currentScore: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get active compliance threshold alerts for this user
  const configs = await db
    .select()
    .from(alertConfigurations)
    .where(
      and(
        eq(alertConfigurations.userId, userId),
        eq(alertConfigurations.alertType, 'compliance_threshold'),
        eq(alertConfigurations.enabled, true)
      )
    );

  for (const config of configs) {
    if (!config.complianceMinScore) continue;

    const threshold = parseFloat(config.complianceMinScore.toString());
    
    // Check if score dropped below threshold
    if (currentScore < threshold) {
      // Check cooldown period
      const canTrigger = await checkCooldown(config.id, config.cooldownMinutes);
      if (!canTrigger) continue;

      // Trigger alert
      await triggerAlert({
        configId: config.id,
        alertType: 'compliance_threshold',
        message: `Compliance score dropped to ${currentScore.toFixed(1)}% (threshold: ${threshold}%)`,
        severity: currentScore < threshold * 0.5 ? 'critical' : 'high',
        triggerValue: currentScore,
        threshold,
      }, config);
    }
  }
}

/**
 * Check violation count and trigger alerts if needed
 */
export async function checkViolationAlerts(userId: number, violationCount: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const configs = await db
    .select()
    .from(alertConfigurations)
    .where(
      and(
        eq(alertConfigurations.userId, userId),
        eq(alertConfigurations.alertType, 'violation_count'),
        eq(alertConfigurations.enabled, true)
      )
    );

  for (const config of configs) {
    if (!config.violationCountThreshold) continue;

    const threshold = config.violationCountThreshold;
    
    if (violationCount >= threshold) {
      const canTrigger = await checkCooldown(config.id, config.cooldownMinutes);
      if (!canTrigger) continue;

      await triggerAlert({
        configId: config.id,
        alertType: 'violation_count',
        message: `${violationCount} policy violations detected (threshold: ${threshold})`,
        severity: violationCount >= threshold * 2 ? 'critical' : 'high',
        triggerValue: violationCount,
        threshold,
      }, config);
    }
  }
}

/**
 * Check spending and trigger alerts if needed
 */
export async function checkSpendingAlerts(userId: number, currentSpending: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const configs = await db
    .select()
    .from(alertConfigurations)
    .where(
      and(
        eq(alertConfigurations.userId, userId),
        eq(alertConfigurations.alertType, 'spending_limit'),
        eq(alertConfigurations.enabled, true)
      )
    );

  for (const config of configs) {
    if (!config.spendingLimitAmount) continue;

    const threshold = parseFloat(config.spendingLimitAmount.toString());
    
    if (currentSpending >= threshold) {
      const canTrigger = await checkCooldown(config.id, config.cooldownMinutes);
      if (!canTrigger) continue;

      await triggerAlert({
        configId: config.id,
        alertType: 'spending_limit',
        message: `Spending reached $${currentSpending.toFixed(2)} (limit: $${threshold.toFixed(2)})`,
        severity: currentSpending >= threshold * 1.5 ? 'critical' : 'high',
        triggerValue: currentSpending,
        threshold,
      }, config);
    }
  }
}

/**
 * Check cooldown period to prevent alert spam
 */
async function checkCooldown(configId: number, cooldownMinutes: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [lastAlert] = await db
    .select()
    .from(alertHistory)
    .where(eq(alertHistory.configurationId, configId))
    .orderBy(desc(alertHistory.triggeredAt))
    .limit(1);

  if (!lastAlert) return true;

  const cooldownMs = cooldownMinutes * 60 * 1000;
  const timeSinceLastAlert = Date.now() - new Date(lastAlert.triggeredAt).getTime();
  
  return timeSinceLastAlert >= cooldownMs;
}

/**
 * Trigger an alert and send notifications
 */
async function triggerAlert(trigger: AlertTrigger, config: any): Promise<void> {
  const db = await getDb();
  if (!db) return;

  let emailSent = false;
  let slackSent = false;

  // Send email notification
  if (config.emailEnabled && config.emailAddress) {
    try {
      // Send via SendGrid API
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: config.emailAddress }] }],
          from: { email: process.env.FROM_EMAIL || 'alerts@sintraprime.com', name: 'SintraPrime Alerts' },
          subject: `[${trigger.severity.toUpperCase()}] SintraPrime Governance Alert`,
          content: [{ type: 'text/html', value: generateAlertEmailHTML(trigger) }],
        }),
      });
      
      if (!response.ok) {
        throw new Error(`SendGrid API failed: ${response.statusText}`);
      }
      emailSent = true;
    } catch (error) {
      console.error('Failed to send alert email:', error);
    }
  }

  // Send Slack notification
  if (config.slackEnabled && config.slackWebhookUrl) {
    try {
      await sendSlackNotification(config.slackWebhookUrl, trigger);
      slackSent = true;
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  // Log alert in history
  await db.insert(alertHistory).values({
    configurationId: trigger.configId,
    alertType: trigger.alertType,
    message: trigger.message,
    severity: trigger.severity,
    triggerValue: trigger.triggerValue.toString(),
    threshold: trigger.threshold.toString(),
    emailSent,
    slackSent,
  });
}

/**
 * Generate HTML email for alert
 */
function generateAlertEmailHTML(trigger: AlertTrigger): string {
  const severityColors = {
    low: '#16a34a',
    medium: '#ca8a04',
    high: '#ea580c',
    critical: '#dc2626',
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${severityColors[trigger.severity]}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
    .metric { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid ${severityColors[trigger.severity]}; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">${trigger.severity.toUpperCase()} Alert</h1>
      <p style="margin: 5px 0 0 0;">SintraPrime Governance System</p>
    </div>
    <div class="content">
      <h2>Alert Details</h2>
      <p><strong>Message:</strong> ${trigger.message}</p>
      
      <div class="metric">
        <p><strong>Current Value:</strong> ${trigger.triggerValue.toFixed(2)}</p>
        <p><strong>Threshold:</strong> ${trigger.threshold.toFixed(2)}</p>
        <p><strong>Alert Type:</strong> ${trigger.alertType.replace(/_/g, ' ').toUpperCase()}</p>
      </div>
      
      <p>This alert was triggered because the monitored metric crossed your configured threshold. Please review your governance dashboard for more details.</p>
      
      <p><a href="https://sintraprime.manus.space/governance" style="display: inline-block; background: ${severityColors[trigger.severity]}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Dashboard</a></p>
    </div>
    <div class="footer">
      <p>SintraPrime Legal AI Platform - Automated Governance Monitoring</p>
      <p>To manage alert settings, visit your Governance Settings page.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(webhookUrl: string, trigger: AlertTrigger): Promise<void> {
  const severityEmojis = {
    low: ':large_blue_circle:',
    medium: ':large_yellow_circle:',
    high: ':large_orange_circle:',
    critical: ':red_circle:',
  };

  const payload = {
    text: `${severityEmojis[trigger.severity]} *${trigger.severity.toUpperCase()} Alert*`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmojis[trigger.severity]} ${trigger.severity.toUpperCase()} Governance Alert`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Message:* ${trigger.message}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Current Value:*\n${trigger.triggerValue.toFixed(2)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Threshold:*\n${trigger.threshold.toFixed(2)}`,
          },
          {
            type: 'mrkdwn',
            text: `*Alert Type:*\n${trigger.alertType.replace(/_/g, ' ')}`,
          },
          {
            type: 'mrkdwn',
            text: `*Time:*\n${new Date().toLocaleString()}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Dashboard',
            },
            url: 'https://sintraprime.manus.space/governance',
            style: 'primary',
          },
        ],
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.statusText}`);
  }
}
