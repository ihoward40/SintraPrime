import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const agentMemory = sqliteTable("agent_memory", {
  userId: text("user_id").notNull(),
  sessionId: text("session_id").notNull(),
  key: text("key").primaryKey(),
  value: text("value"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});
