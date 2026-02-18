import { mysqlTable, text, int, decimal, mysqlEnum, boolean, timestamp, json } from 'drizzle-orm/mysql-core';

/**
 * Alert Configuration Table
 * Stores user-defined alert rules and thresholds
 */
export const alertConfigurations = mysqlTable('alert_configurations', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  
  // Alert type
  alertType: mysqlEnum('alert_type', ['compliance_threshold', 'violation_count', 'critical_event', 'spending_limit']).notNull(),
  
  // Threshold settings
  complianceMinScore: decimal('compliance_min_score', { precision: 5, scale: 2 }), // Trigger when score drops below this
  violationCountThreshold: int('violation_count_threshold'), // Trigger when violations exceed this
  spendingLimitAmount: decimal('spending_limit_amount', { precision: 10, scale: 2 }), // Trigger when spending exceeds this
  
  // Notification channels
  emailEnabled: boolean('email_enabled').default(false).notNull(),
  emailAddress: text('email_address'),
  slackEnabled: boolean('slack_enabled').default(false).notNull(),
  slackWebhookUrl: text('slack_webhook_url'),
  
  // Alert settings
  enabled: boolean('enabled').default(true).notNull(),
  cooldownMinutes: int('cooldown_minutes').default(60).notNull(), // Prevent alert spam
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/**
 * Alert History Table
 * Logs all triggered alerts
 */
export const alertHistory = mysqlTable('alert_history', {
  id: int('id').autoincrement().primaryKey(),
  configurationId: int('configuration_id').notNull(),
  
  // Alert details
  alertType: text('alert_type').notNull(),
  message: text('message').notNull(),
  severity: mysqlEnum('severity', ['low', 'medium', 'high', 'critical']).notNull(),
  
  // Trigger data
  triggerValue: decimal('trigger_value', { precision: 10, scale: 2 }), // The value that triggered the alert
  threshold: decimal('threshold', { precision: 10, scale: 2 }), // The threshold that was crossed
  
  // Notification status
  emailSent: boolean('email_sent').default(false).notNull(),
  slackSent: boolean('slack_sent').default(false).notNull(),
  
  // Metadata
  triggeredAt: timestamp('triggered_at').defaultNow().notNull(),
  metadata: json('metadata').$type<Record<string, any>>(),
});
