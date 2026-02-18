import { mysqlTable, int, text, boolean, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core';

/**
 * Report Schedule Table
 * Stores automated report generation schedules
 */
export const reportSchedules = mysqlTable('report_schedules', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull(),
  
  // Schedule settings
  frequency: mysqlEnum('frequency', ['daily', 'weekly', 'monthly']).notNull(),
  dayOfWeek: int('day_of_week'), // 0-6 for weekly (0=Sunday)
  dayOfMonth: int('day_of_month'), // 1-31 for monthly
  timeOfDay: text('time_of_day').notNull(), // HH:MM format (e.g., "09:00")
  
  // Report settings
  reportType: mysqlEnum('report_type', ['compliance', 'violations', 'full']).notNull(),
  dateRangeDays: int('date_range_days').notNull(), // How many days to include in report
  
  // Delivery settings
  emailEnabled: boolean('email_enabled').default(true).notNull(),
  emailAddresses: text('email_addresses').notNull(), // Comma-separated list
  
  // Status
  enabled: boolean('enabled').default(true).notNull(),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/**
 * Report History Table
 * Logs all generated scheduled reports
 */
export const reportHistory = mysqlTable('report_history', {
  id: int('id').autoincrement().primaryKey(),
  scheduleId: int('schedule_id').notNull(),
  
  // Report details
  reportType: text('report_type').notNull(),
  dateRangeStart: timestamp('date_range_start').notNull(),
  dateRangeEnd: timestamp('date_range_end').notNull(),
  
  // Generation status
  status: mysqlEnum('status', ['pending', 'generating', 'completed', 'failed']).notNull(),
  errorMessage: text('error_message'),
  
  // Delivery status
  emailSent: boolean('email_sent').default(false).notNull(),
  emailRecipients: text('email_recipients'),
  
  // File storage
  reportUrl: text('report_url'), // S3 URL if stored
  
  // Metadata
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
});
