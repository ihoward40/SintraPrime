import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const agentExecutions = sqliteTable("agent_executions", {
  userId: text("user_id").notNull(),
  sessionId: text("session_id").notNull(),
  taskType: text("task_type").notNull(),
  approach: text("approach"),
  status: text("status").notNull().default("pending"),
  duration: integer("duration"),
  cost: real("cost"),
  output: text("output"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});
