import { mysqlTable, varchar, text, timestamp, int, mysqlEnum } from "drizzle-orm/mysql-core";

export const aiMemory = mysqlTable("ai_memory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  caseId: int("case_id"), // Optional: if memory is specific to a case
  category: mysqlEnum("category", [
    "user_preference", // e.g., "User prefers concise answers"
    "case_fact",       // e.g., "The defendant is John Doe"
    "legal_strategy",  // e.g., "Focusing on FDCPA violations"
    "general_context"  // e.g., "User is a pro se litigant"
  ]).default("general_context").notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(),
  importance: int("importance").default(1).notNull(), // 1-5 scale, higher means more important to include in context
  source: varchar("source", { length: 100 }).default("chat").notNull(), // chat, manual, document_extraction
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AiMemory = typeof aiMemory.$inferSelect;
export type InsertAiMemory = typeof aiMemory.$inferInsert;
