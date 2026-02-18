import { mysqlTable, varchar, text, timestamp, json, int, boolean } from 'drizzle-orm/mysql-core';

/**
 * Workflow Triggers
 * 
 * Connects ingest events (email, audio, web changes) to workflow executions
 */
export const workflowTriggers = mysqlTable('workflow_triggers', {
  id: int('id').primaryKey().autoincrement(),
  workflowId: int('workflow_id').notNull(),
  userId: int('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Trigger type
  triggerType: varchar('trigger_type', { length: 100 }).notNull(), // email_received, audio_transcribed, web_change_detected, manual
  
  // Trigger conditions (keyword matching, pattern matching, etc.)
  conditions: json('conditions').$type<{
    keywords?: string[]; // Match if any keyword present
    patterns?: string[]; // Regex patterns
    senderEmail?: string[]; // For email triggers
    siteId?: number; // For web monitoring triggers
    severity?: string[]; // For web change triggers
    caseId?: number; // Optional: only trigger for specific case
  }>(),
  
  // Workflow execution parameters
  executionParams: json('execution_params').$type<{
    autoStart?: boolean; // Start immediately or require approval
    priority?: 'low' | 'medium' | 'high' | 'critical';
    variables?: Record<string, any>; // Initial workflow variables
  }>(),
  
  isActive: boolean('is_active').default(true).notNull(),
  lastTriggered: timestamp('last_triggered'),
  triggerCount: int('trigger_count').default(0).notNull(),
  
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

/**
 * Trigger Execution History
 * 
 * Tracks when triggers fire and what workflows they execute
 */
export const triggerExecutions = mysqlTable('trigger_executions', {
  id: int('id').primaryKey().autoincrement(),
  triggerId: int('trigger_id').notNull(),
  workflowExecutionId: int('workflow_execution_id'), // Link to actual workflow execution
  
  // Event that triggered this
  eventType: varchar('event_type', { length: 100 }).notNull(), // email_received, audio_transcribed, etc.
  eventId: int('event_id'), // ID of the email/audio/snapshot that triggered this
  eventData: json('event_data').$type<Record<string, any>>(), // Snapshot of event data
  
  // Matching details
  matchedConditions: json('matched_conditions').$type<{
    keywords?: string[];
    patterns?: string[];
    field?: string; // Which field matched (subject, body, etc.)
  }>(),
  
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, executed, failed, skipped
  error: text('error'),
  
  triggeredAt: timestamp('triggered_at').defaultNow(),
  executedAt: timestamp('executed_at'),
});
