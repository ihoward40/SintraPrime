import { mysqlTable, varchar, text, timestamp, int, decimal } from "drizzle-orm/mysql-core";

export const agentExecutions = mysqlTable("agent_executions", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 64 }).notNull(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  taskType: varchar("taskType", { length: 100 }).notNull(),
  approach: text("approach"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  duration: int("duration"),
  cost: decimal("cost", { precision: 10, scale: 6 }),
  output: text("output"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentExecution = typeof agentExecutions.$inferSelect;
export type InsertAgentExecution = typeof agentExecutions.$inferInsert;
