/**
 * Workflow Builder Database Schema
 * Stores user-created automation workflows
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const workflows = sqliteTable("workflows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // "scraping", "video", "custom"
  status: text("status").notNull().default("draft"), // "draft", "active", "paused", "archived"
  
  // Workflow definition (JSON)
  nodes: text("nodes").notNull(), // Array of workflow nodes
  edges: text("edges").notNull(), // Array of connections between nodes
  
  // Execution settings
  triggerType: text("trigger_type").notNull(), // "manual", "schedule", "webhook"
  scheduleConfig: text("schedule_config"), // Cron expression or schedule settings (JSON)
  
  // Metadata
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  lastRunAt: integer("last_run_at", { mode: "timestamp" }),
  
  // Statistics
  runCount: integer("run_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0)
});

export const workflowExecutions = sqliteTable("workflow_executions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workflowId: integer("workflow_id").notNull(),
  userId: integer("user_id").notNull(),
  
  // Execution details
  status: text("status").notNull(), // "running", "completed", "failed", "cancelled"
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  
  // Input/Output
  input: text("input"), // JSON input parameters
  output: text("output"), // JSON output results
  error: text("error"), // Error message if failed
  
  // Execution log
  logs: text("logs"), // JSON array of log entries
  
  // Performance metrics
  duration: integer("duration"), // Execution time in milliseconds
  nodesExecuted: integer("nodes_executed"),
  
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});

export const workflowTemplates = sqliteTable("workflow_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  
  // Template definition
  nodes: text("nodes").notNull(),
  edges: text("edges").notNull(),
  
  // Metadata
  icon: text("icon"),
  tags: text("tags"), // JSON array
  difficulty: text("difficulty").notNull(), // "easy", "medium", "hard"
  estimatedTime: text("estimated_time"),
  
  // Usage statistics
  useCount: integer("use_count").notNull().default(0),
  
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type NewWorkflowTemplate = typeof workflowTemplates.$inferInsert;
