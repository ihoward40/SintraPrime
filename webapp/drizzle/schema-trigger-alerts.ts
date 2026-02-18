import { mysqlTable, int, varchar, text, timestamp, boolean, decimal } from 'drizzle-orm/mysql-core';

export const triggerPerformanceAlerts = mysqlTable('trigger_performance_alerts', {
  id: int('id').primaryKey().autoincrement(),
  triggerId: int('trigger_id').notNull(),
  alertType: varchar('alert_type', { length: 50 }).notNull(), // 'low_success_rate', 'slow_execution', 'no_matches', 'high_failure_rate'
  threshold: decimal('threshold', { precision: 10, scale: 2 }).notNull(),
  currentValue: decimal('current_value', { precision: 10, scale: 2 }).notNull(),
  message: text('message').notNull(),
  severity: varchar('severity', { length: 20 }).notNull(), // 'info', 'warning', 'critical'
  isResolved: boolean('is_resolved').default(false).notNull(),
  resolvedAt: timestamp('resolved_at'),
  notificationSent: boolean('notification_sent').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const triggerAlertConfig = mysqlTable('trigger_alert_config', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  triggerId: int('trigger_id'), // null = global config
  alertType: varchar('alert_type', { length: 50 }).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  threshold: decimal('threshold', { precision: 10, scale: 2 }).notNull(),
  checkInterval: int('check_interval').notNull(), // minutes
  notifyOwner: boolean('notify_owner').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});
