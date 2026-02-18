import { mysqlTable, varchar, text, timestamp, json, int, boolean } from 'drizzle-orm/mysql-core';

export const workflows = mysqlTable('workflows', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  workflowType: varchar('workflow_type', { length: 100 }).notNull(), // yaml, json, visual
  definition: json('definition').$type<any>().notNull(), // YAML/JSON workflow definition
  isTemplate: boolean('is_template').default(false).notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  category: varchar('category', { length: 100 }), // legal, discovery, filing, etc.
  tags: json('tags').$type<string[]>(),
  version: int('version').default(1).notNull(),
  status: varchar('status', { length: 50 }).default('draft').notNull(), // draft, active, archived
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const workflowExecutions = mysqlTable('workflow_executions', {
  id: int('id').primaryKey().autoincrement(),
  workflowId: int('workflow_id').notNull(),
  userId: int('user_id').notNull(),
  caseId: int('case_id'), // Optional link to case
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, running, completed, failed, cancelled
  currentStep: int('current_step').default(0).notNull(),
  totalSteps: int('total_steps').notNull(),
  variables: json('variables').$type<Record<string, any>>(), // Workflow variables/context
  stepResults: json('step_results').$type<any[]>(), // Results from each step
  error: text('error'), // Error message if failed
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  metadata: json('metadata').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});
