import { mysqlTable, varchar, text, timestamp, json, int, boolean } from 'drizzle-orm/mysql-core';

export const monitoredSites = mysqlTable('monitored_sites', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  caseId: int('case_id'), // Optional: link to specific case
  url: text('url').notNull(),
  name: varchar('name', { length: 300 }).notNull(),
  description: text('description'),
  siteType: varchar('site_type', { length: 100 }), // court, regulatory, corporate, etc.
  checkFrequency: varchar('check_frequency', { length: 50 }).default('daily').notNull(), // hourly, daily, weekly
  isActive: boolean('is_active').default(true).notNull(),
  lastChecked: timestamp('last_checked'),
  lastChanged: timestamp('last_changed'),
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const siteSnapshots = mysqlTable('site_snapshots', {
  id: int('id').primaryKey().autoincrement(),
  monitoredSiteId: int('monitored_site_id').notNull(),
  url: text('url').notNull(),
  htmlContent: text('html_content'), // Full HTML snapshot
  textContent: text('text_content'), // Extracted text for diff
  screenshotUrl: text('screenshot_url'), // S3 URL of screenshot
  screenshotKey: varchar('screenshot_key', { length: 500 }),
  contentHash: varchar('content_hash', { length: 64 }).notNull(), // SHA256 hash for change detection
  changeDetected: boolean('change_detected').default(false).notNull(),
  changesSummary: text('changes_summary'), // AI-generated summary of changes
  diffFromPrevious: json('diff_from_previous').$type<Array<{
    type: 'added' | 'removed' | 'modified';
    selector?: string;
    oldValue?: string;
    newValue?: string;
    description?: string;
  }>>(),
  metadata: json('metadata').$type<Record<string, any>>(),
  capturedAt: timestamp('captured_at').defaultNow(),
});

export const policyChanges = mysqlTable('policy_changes', {
  id: int('id').primaryKey().autoincrement(),
  monitoredSiteId: int('monitored_site_id').notNull(),
  snapshotId: int('snapshot_id').notNull(),
  changeType: varchar('change_type', { length: 100 }).notNull(), // policy_update, docket_entry, regulation_change, etc.
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  severity: varchar('severity', { length: 50 }).default('medium').notNull(), // low, medium, high, critical
  affectedSections: json('affected_sections').$type<string[]>(),
  aiAnalysis: text('ai_analysis'), // AI-generated impact analysis
  isReviewed: boolean('is_reviewed').default(false).notNull(),
  reviewedBy: int('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  metadata: json('metadata').$type<Record<string, any>>(),
  detectedAt: timestamp('detected_at').defaultNow(),
});
