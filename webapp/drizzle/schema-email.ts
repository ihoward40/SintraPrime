import { mysqlTable, varchar, text, timestamp, json, int, boolean } from 'drizzle-orm/mysql-core';

export const emailMessages = mysqlTable('email_messages', {
  id: int('id').primaryKey().autoincrement(),
  messageId: varchar('message_id', { length: 255 }).notNull().unique(), // Email Message-ID header
  from: varchar('from', { length: 255 }).notNull(),
  to: text('to').notNull(), // JSON array of recipients
  cc: text('cc'), // JSON array of CC recipients
  subject: varchar('subject', { length: 500 }),
  body: text('body'),
  htmlBody: text('html_body'),
  attachments: json('attachments').$type<Array<{
    filename: string;
    contentType: string;
    size: number;
    s3Key: string;
    s3Url: string;
  }>>(),
  receivedAt: timestamp('received_at').notNull(),
  caseId: int('case_id'), // Link to case if associated
  processed: boolean('processed').default(false),
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const emailAttachments = mysqlTable('email_attachments', {
  id: int('id').primaryKey().autoincrement(),
  emailId: int('email_id').notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  contentType: varchar('content_type', { length: 100 }),
  size: int('size'), // bytes
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  s3Url: text('s3_url').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
