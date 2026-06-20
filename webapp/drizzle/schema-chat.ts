import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  json,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

// ============================================================================
// CHAT CONVERSATIONS
// Persistent threads for AI Chat and future Agent Zero session logs.
// ============================================================================
export const chatConversations = mysqlTable("chat_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  caseId: int("case_id"), // optional case linkage
  title: varchar("title", { length: 500 }),
  model: varchar("model", { length: 64 }).default("gemini-2.5-flash"),
  status: mysqlEnum("status", ["active", "archived", "deleted"])
    .default("active")
    .notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = typeof chatConversations.$inferInsert;

// ============================================================================
// CHAT MESSAGES
// Each row is one message in a conversation thread.
// Supports idempotency keys and receipt linkage from PR-0004.
// ============================================================================
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversation_id").notNull(),
  userId: int("user_id"), // nullable until old rows are backfilled; enforce NOT NULL after backfill
  role: mysqlEnum("role", ["user", "assistant", "system", "tool"]).notNull(),
  content: text("content").notNull(),
  attachments: json("attachments"), // fileContext, images, tool call args/results
  model: varchar("model", { length: 64 }), // model that generated assistant/tool messages
  tokensUsed: int("tokens_used"), // total prompt + completion tokens
  latencyMs: int("latency_ms"), // LLM invocation latency
  receiptId: varchar("receipt_id", { length: 64 }), // links to PR-0004 receipt
  idempotencyKey: varchar("idempotency_key", { length: 128 }).unique(), // dedupe guard
  status: mysqlEnum("status", ["visible", "edited", "deleted"])
    .default("visible")
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
