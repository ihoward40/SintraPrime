/**
 * Task Scheduling System Database Schema
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const scheduledTasks = sqliteTable("scheduled_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  
  // Task details
  name: text("name").notNull(),
  description: text("description"),
  taskType: text("task_type").notNull(), // "workflow", "scraping", "video", "custom"
  taskConfig: text("task_config").notNull(), // JSON configuration
  
  // Schedule configuration
  scheduleType: text("schedule_type").notNull(), // "cron", "interval", "once"
  cronExpression: text("cron_expression"), // For cron schedules
  intervalSeconds: integer("interval_seconds"), // For interval schedules
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }), // For one-time schedules
  
  // Status
  status: text("status").notNull().default("active"), // "active", "paused", "completed", "failed"
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  
  // Execution tracking
  lastRunAt: integer("last_run_at", { mode: "timestamp" }),
  nextRunAt: integer("next_run_at", { mode: "timestamp" }),
  runCount: integer("run_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failureCount: integer("failure_count").notNull().default(0),
  
  // Metadata
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const taskExecutions = sqliteTable("task_executions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: integer("task_id").notNull(),
  userId: integer("user_id").notNull(),
  
  // Execution details
  status: text("status").notNull(), // "running", "completed", "failed"
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  duration: integer("duration"), // milliseconds
  
  // Results
  output: text("output"), // JSON output
  error: text("error"), // Error message if failed
  logs: text("logs"), // JSON array of log entries
  
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});

export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type NewScheduledTask = typeof scheduledTasks.$inferInsert;
export type TaskExecution = typeof taskExecutions.$inferSelect;
export type NewTaskExecution = typeof taskExecutions.$inferInsert;
