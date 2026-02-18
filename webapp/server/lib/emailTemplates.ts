/**
 * Professional Email Templates for SintraPrime Governance System
 * 
 * Provides branded HTML email templates for various notification types:
 * - Policy violations
 * - Spending alerts
 * - Approval requests
 * - High-severity events
 */

// Brand colors
const COLORS = {
  primary: '#00d4ff',
  danger: '#ff4444',
  success: '#00ff88',
  warning: '#ffaa00',
  dark: '#0a0e14',
  darkSecondary: '#1a1f2e',
  text: '#e4e4e7',
  textMuted: '#a1a1aa',
};

interface EmailTemplateData {
  title: string;
  recipientName?: string;
  content: string;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, string>;
}

/**
 * Base email template with SintraPrime branding
 */
function baseTemplate(data: EmailTemplateData): string {
  const { title, recipientName, content, actionUrl, actionText, metadata } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f4f4f5;
      color: #18181b;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, ${COLORS.dark} 0%, ${COLORS.darkSecondary} 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .logo {
      font-size: 28px;
      font-weight: 700;
      color: ${COLORS.primary};
      margin: 0;
      letter-spacing: -0.5px;
    }
    .subtitle {
      font-size: 14px;
      color: ${COLORS.textMuted};
      margin: 8px 0 0 0;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #18181b;
      margin: 0 0 16px 0;
    }
    .message {
      font-size: 15px;
      line-height: 1.6;
      color: #3f3f46;
      margin: 0 0 24px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: ${COLORS.primary};
      color: ${COLORS.dark};
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 15px;
      transition: background-color 0.2s;
    }
    .button:hover {
      background-color: #00b8e6;
    }
    .metadata {
      margin: 24px 0;
      padding: 16px;
      background-color: #f4f4f5;
      border-radius: 6px;
      border-left: 4px solid ${COLORS.primary};
    }
    .metadata-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e4e4e7;
    }
    .metadata-item:last-child {
      border-bottom: none;
    }
    .metadata-label {
      font-weight: 600;
      color: #52525b;
      font-size: 14px;
    }
    .metadata-value {
      color: #18181b;
      font-size: 14px;
    }
    .footer {
      padding: 24px;
      text-align: center;
      background-color: #fafafa;
      border-top: 1px solid #e4e4e7;
    }
    .footer-text {
      font-size: 13px;
      color: #71717a;
      margin: 0;
    }
    .footer-link {
      color: ${COLORS.primary};
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">SintraPrime</h1>
      <p class="subtitle">Legal AI Platform</p>
    </div>
    <div class="content">
      ${recipientName ? `<p class="greeting">Hello ${recipientName},</p>` : ''}
      <div class="message">${content}</div>
      ${metadata ? `
        <div class="metadata">
          ${Object.entries(metadata).map(([key, value]) => `
            <div class="metadata-item">
              <span class="metadata-label">${key}:</span>
              <span class="metadata-value">${value}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${actionUrl && actionText ? `
        <div style="text-align: center; margin-top: 32px;">
          <a href="${actionUrl}" class="button">${actionText}</a>
        </div>
      ` : ''}
    </div>
    <div class="footer">
      <p class="footer-text">
        This is an automated notification from SintraPrime Governance System.<br>
        <a href="#" class="footer-link">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Policy Violation Email Template
 */
export function policyViolationEmail(data: {
  recipientName: string;
  violationType: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  actor: string;
  dashboardUrl: string;
}): string {
  const severityColors = {
    low: COLORS.success,
    medium: COLORS.warning,
    high: COLORS.danger,
    critical: COLORS.danger,
  };

  const content = `
    <p><strong style="color: ${severityColors[data.severity]};">⚠️ Policy Violation Detected</strong></p>
    <p>A ${data.severity}-severity policy violation has been detected in your SintraPrime environment.</p>
    <p><strong>Violation Type:</strong> ${data.violationType}</p>
    <p><strong>Description:</strong> ${data.description}</p>
    <p>Please review this violation and take appropriate action to ensure compliance with your governance policies.</p>
  `;

  return baseTemplate({
    title: 'Policy Violation Alert - SintraPrime',
    recipientName: data.recipientName,
    content,
    actionUrl: data.dashboardUrl,
    actionText: 'View in Governance Dashboard',
    metadata: {
      'Severity': data.severity.toUpperCase(),
      'Actor': data.actor,
      'Timestamp': data.timestamp,
    },
  });
}

/**
 * Spending Alert Email Template
 */
export function spendingAlertEmail(data: {
  recipientName: string;
  alertType: 'threshold' | 'daily_limit' | 'weekly_limit' | 'monthly_limit';
  currentSpending: string;
  limit: string;
  percentage: number;
  dashboardUrl: string;
}): string {
  const content = `
    <p><strong style="color: ${COLORS.warning};">💰 Spending Alert</strong></p>
    <p>Your SintraPrime environment has reached ${data.percentage}% of its ${data.alertType.replace('_', ' ')}.</p>
    <p><strong>Current Spending:</strong> ${data.currentSpending}</p>
    <p><strong>Limit:</strong> ${data.limit}</p>
    <p>Please review your spending and adjust your policies if necessary to avoid service interruptions.</p>
  `;

  return baseTemplate({
    title: 'Spending Alert - SintraPrime',
    recipientName: data.recipientName,
    content,
    actionUrl: data.dashboardUrl,
    actionText: 'View Spending Dashboard',
    metadata: {
      'Alert Type': data.alertType.replace('_', ' ').toUpperCase(),
      'Current Spending': data.currentSpending,
      'Limit': data.limit,
      'Percentage': `${data.percentage}%`,
    },
  });
}

/**
 * Approval Request Email Template
 */
export function approvalRequestEmail(data: {
  recipientName: string;
  requestType: string;
  requestedBy: string;
  description: string;
  estimatedCost?: string;
  timestamp: string;
  approvalUrl: string;
}): string {
  const content = `
    <p><strong style="color: ${COLORS.primary};">🔔 Approval Request</strong></p>
    <p>A new approval request requires your attention in SintraPrime.</p>
    <p><strong>Request Type:</strong> ${data.requestType}</p>
    <p><strong>Requested By:</strong> ${data.requestedBy}</p>
    <p><strong>Description:</strong> ${data.description}</p>
    ${data.estimatedCost ? `<p><strong>Estimated Cost:</strong> ${data.estimatedCost}</p>` : ''}
    <p>Please review this request and approve or reject it at your earliest convenience.</p>
  `;

  return baseTemplate({
    title: 'Approval Request - SintraPrime',
    recipientName: data.recipientName,
    content,
    actionUrl: data.approvalUrl,
    actionText: 'Review & Approve',
    metadata: {
      'Request Type': data.requestType,
      'Requested By': data.requestedBy,
      'Timestamp': data.timestamp,
      ...(data.estimatedCost ? { 'Estimated Cost': data.estimatedCost } : {}),
    },
  });
}

/**
 * High-Severity Event Email Template
 */
export function highSeverityEventEmail(data: {
  recipientName: string;
  eventType: string;
  description: string;
  impact: string;
  timestamp: string;
  actor: string;
  dashboardUrl: string;
}): string {
  const content = `
    <p><strong style="color: ${COLORS.danger};">🚨 High-Severity Event Detected</strong></p>
    <p>A high-severity event has been detected in your SintraPrime environment that requires immediate attention.</p>
    <p><strong>Event Type:</strong> ${data.eventType}</p>
    <p><strong>Description:</strong> ${data.description}</p>
    <p><strong>Impact:</strong> ${data.impact}</p>
    <p>Please review this event immediately and take appropriate action to mitigate any potential risks.</p>
  `;

  return baseTemplate({
    title: 'High-Severity Event Alert - SintraPrime',
    recipientName: data.recipientName,
    content,
    actionUrl: data.dashboardUrl,
    actionText: 'View Event Details',
    metadata: {
      'Event Type': data.eventType,
      'Actor': data.actor,
      'Timestamp': data.timestamp,
      'Impact': data.impact,
    },
  });
}

/**
 * Welcome Email Template
 */
export function welcomeEmail(data: {
  recipientName: string;
  dashboardUrl: string;
}): string {
  const content = `
    <p><strong>Welcome to SintraPrime!</strong></p>
    <p>Your account has been successfully created and you now have access to the most advanced legal AI platform.</p>
    <p>SintraPrime provides:</p>
    <ul style="line-height: 1.8; color: #3f3f46;">
      <li>Military-grade legal intelligence and case management</li>
      <li>Autonomous AI agents for legal research and automation</li>
      <li>Comprehensive governance and compliance tools</li>
      <li>Real-time monitoring and alerts</li>
    </ul>
    <p>Get started by exploring your dashboard and setting up your first case.</p>
  `;

  return baseTemplate({
    title: 'Welcome to SintraPrime',
    recipientName: data.recipientName,
    content,
    actionUrl: data.dashboardUrl,
    actionText: 'Go to Dashboard',
  });
}
