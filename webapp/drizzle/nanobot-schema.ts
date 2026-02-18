import { mysqlTable, serial, varchar, text, timestamp, int, json, boolean } from "drizzle-orm/mysql-core";

// System health checks
export const systemHealthChecks = mysqlTable("system_health_checks", {
  id: serial("id").primaryKey(),
  checkType: varchar("check_type", { length: 100 }).notNull(), // 'api', 'database', 'service', 'frontend'
  endpoint: varchar("endpoint", { length: 500 }),
  status: varchar("status", { length: 50 }).notNull(), // 'healthy', 'degraded', 'down'
  responseTime: int("response_time"), // milliseconds
  errorMessage: text("error_message"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Error logs captured by the nanobot
export const nanobotErrorLogs = mysqlTable("nanobot_error_logs", {
  id: serial("id").primaryKey(),
  errorType: varchar("error_type", { length: 100 }).notNull(), // 'runtime', 'api', 'database', 'frontend'
  severity: varchar("severity", { length: 50 }).notNull(), // 'low', 'medium', 'high', 'critical'
  errorMessage: text("error_message").notNull(),
  stackTrace: text("stack_trace"),
  context: json("context"), // Request details, user info, etc.
  source: varchar("source", { length: 200 }), // File/component where error occurred
  resolved: boolean("resolved").default(false).notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by", { length: 100 }), // 'nanobot', 'manual', 'auto-restart'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Repair actions taken by the nanobot
export const nanobotRepairs = mysqlTable("nanobot_repairs", {
  id: serial("id").primaryKey(),
  errorLogId: int("error_log_id"),
  repairType: varchar("repair_type", { length: 100 }).notNull(), // 'restart_service', 'clear_cache', 'rollback', 'config_fix'
  repairDescription: text("repair_description").notNull(),
  repairActions: json("repair_actions").notNull(), // Array of actions taken
  success: boolean("success").notNull(),
  resultMessage: text("result_message"),
  executionTime: int("execution_time"), // milliseconds
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Nanobot learning database - successful repair patterns
export const nanobotLearning = mysqlTable("nanobot_learning", {
  id: serial("id").primaryKey(),
  errorPattern: text("error_pattern").notNull(), // Regex or description of error pattern
  repairStrategy: text("repair_strategy").notNull(),
  successRate: int("success_rate").default(0).notNull(), // Percentage
  timesApplied: int("times_applied").default(0).notNull(),
  lastApplied: timestamp("last_applied"),
  confidence: int("confidence").default(50).notNull(), // 0-100
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// System metrics for monitoring
export const systemMetrics = mysqlTable("system_metrics", {
  id: serial("id").primaryKey(),
  metricType: varchar("metric_type", { length: 100 }).notNull(), // 'cpu', 'memory', 'disk', 'requests', 'errors'
  metricValue: int("metric_value").notNull(),
  unit: varchar("unit", { length: 50 }), // '%', 'MB', 'count', 'ms'
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
