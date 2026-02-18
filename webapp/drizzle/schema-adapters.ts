import { mysqlTable, varchar, text, timestamp, json, int, boolean } from 'drizzle-orm/mysql-core';

export const adapterConnections = mysqlTable('adapter_connections', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  adapterType: varchar('adapter_type', { length: 100 }).notNull(), // gmail, notion, slack, etc.
  connectionName: varchar('connection_name', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(), // active, disabled, error
  oauthTokens: json('oauth_tokens').$type<{
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
  }>(),
  config: json('config').$type<Record<string, any>>(), // Adapter-specific configuration
  lastSyncAt: timestamp('last_sync_at'),
  errorMessage: text('error_message'),
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const adapterRequests = mysqlTable('adapter_requests', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  connectionId: int('connection_id').notNull(),
  requestType: varchar('request_type', { length: 100 }).notNull(), // send_email, create_page, post_message
  params: json('params').$type<Record<string, any>>().notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, approved, rejected, executed
  approvalStatus: varchar('approval_status', { length: 50 }).default('pending'), // pending, approved, rejected
  approvedBy: int('approved_by'),
  approvedAt: timestamp('approved_at'),
  rejectionReason: text('rejection_reason'),
  executionResult: json('execution_result').$type<any>(),
  executedAt: timestamp('executed_at'),
  errorMessage: text('error_message'),
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});
