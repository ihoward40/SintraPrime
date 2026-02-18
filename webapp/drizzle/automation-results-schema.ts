import { mysqlTable, varchar, int, text, timestamp } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * Automation Results Table
 * Stores results from automation demos (web scraping, document generation, video creation)
 */
export const automationResults = mysqlTable("automation_results", {
  id: int("id").primaryKey().autoincrement(),
  
  // User and session info
  userId: int("user_id").notNull(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  
  // Demo type
  demoType: varchar("demo_type", { length: 50 }).notNull(), // 'web-scraping', 'document-generation', 'video-creation', 'full-workflow'
  
  // Result data (JSON)
  resultData: text("result_data").notNull(), // JSON string containing demo-specific results
  
  // Metadata
  status: varchar("status", { length: 20 }).notNull().default("completed"), // 'running', 'completed', 'failed'
  errorMessage: text("error_message"),
  
  // Recording URL (if available)
  recordingUrl: varchar("recording_url", { length: 500 }),
  
  // Timestamps
  startedAt: timestamp("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: timestamp("completed_at"),
  
  // Duration in seconds
  duration: int("duration"),
});

/**
 * Demo Usage Metrics Table
 * Tracks user usage of automation demos for analytics
 */
export const demoUsageMetrics = mysqlTable("demo_usage_metrics", {
  id: int("id").primaryKey().autoincrement(),
  
  userId: int("user_id").notNull(),
  demoType: varchar("demo_type", { length: 50 }).notNull(),
  
  // Metrics
  executionCount: int("execution_count").notNull().default(1),
  totalDuration: int("total_duration").notNull().default(0), // in seconds
  successCount: int("success_count").notNull().default(0),
  failureCount: int("failure_count").notNull().default(0),
  
  // Timestamps
  firstUsedAt: timestamp("first_used_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastUsedAt: timestamp("last_used_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
