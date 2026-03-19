import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  json,
  mysqlEnum,
  decimal,
} from "drizzle-orm/mysql-core";

// ============================================================================
// TWO-FACTOR AUTHENTICATION
// ============================================================================
export const userTotp = mysqlTable("user_totp", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  secret: varchar("secret", { length: 64 }).notNull(),
  enabled: boolean("enabled").notNull().default(false),
  backupCodes: text("backupCodes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserTotp = typeof userTotp.$inferSelect;
export type InsertUserTotp = typeof userTotp.$inferInsert;

// ============================================================================
// RATE LIMIT LOG
// ============================================================================
export const rateLimitLog = mysqlTable("rate_limit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  endpoint: varchar("endpoint", { length: 128 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 64 }),
  requestCount: int("requestCount").notNull().default(1),
  windowStart: timestamp("windowStart").defaultNow().notNull(),
  blocked: boolean("blocked").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RateLimitLog = typeof rateLimitLog.$inferSelect;

// ============================================================================
// TIME TRACKING
// ============================================================================
export const timeEntries = mysqlTable("time_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  caseId: int("caseId"),
  description: text("description").notNull(),
  category: mysqlEnum("category", [
    "research", "drafting", "court", "client_comm", "admin", "review", "other",
  ]).notNull().default("other"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  durationMinutes: int("durationMinutes"),
  billable: boolean("billable").notNull().default(true),
  hourlyRate: decimal("hourlyRate", { precision: 10, scale: 2 }),
  invoiced: boolean("invoiced").notNull().default(false),
  invoiceId: varchar("invoiceId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;

// ============================================================================
// BILLING INVOICES
// ============================================================================
export const billingInvoices = mysqlTable("billing_invoices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  caseId: int("caseId"),
  invoiceNumber: varchar("invoiceNumber", { length: 64 }).notNull().unique(),
  clientName: varchar("clientName", { length: 255 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull().default("0"),
  status: mysqlEnum("status", ["draft", "sent", "paid", "overdue", "cancelled"]).notNull().default("draft"),
  dueDate: timestamp("dueDate"),
  paidAt: timestamp("paidAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BillingInvoice = typeof billingInvoices.$inferSelect;
export type InsertBillingInvoice = typeof billingInvoices.$inferInsert;

// ============================================================================
// DOCUMENT INTELLIGENCE
// ============================================================================
export const documentIntelligence = mysqlTable("document_intelligence", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  documentId: int("documentId"),
  caseId: int("caseId"),
  fileName: varchar("fileName", { length: 512 }).notNull(),
  extractedText: text("extractedText"),
  entities: json("entities"),
  clauses: json("clauses"),
  risks: json("risks"),
  summary: text("summary"),
  keyDates: json("keyDates"),
  keyParties: json("keyParties"),
  contradictions: json("contradictions"),
  processingStatus: mysqlEnum("processingStatus", ["pending", "processing", "complete", "failed"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DocumentIntelligence = typeof documentIntelligence.$inferSelect;
export type InsertDocumentIntelligence = typeof documentIntelligence.$inferInsert;

// ============================================================================
// LLM ROUTER CONFIG
// ============================================================================
export const llmRouterConfig = mysqlTable("llm_router_config", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  defaultModel: varchar("defaultModel", { length: 64 }).notNull().default("gpt-4o"),
  reasoningModel: varchar("reasoningModel", { length: 64 }).notNull().default("gpt-4o"),
  longDocModel: varchar("longDocModel", { length: 64 }).notNull().default("gpt-4o"),
  fastModel: varchar("fastModel", { length: 64 }).notNull().default("gpt-4o-mini"),
  costOptimize: boolean("costOptimize").notNull().default(false),
  privacyMode: boolean("privacyMode").notNull().default(false),
  autoRoute: boolean("autoRoute").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type LlmRouterConfig = typeof llmRouterConfig.$inferSelect;
export type InsertLlmRouterConfig = typeof llmRouterConfig.$inferInsert;

// ============================================================================
// PLUGIN MARKETPLACE
// ============================================================================
export const plugins = mysqlTable("plugins", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", ["ai", "legal", "productivity", "integration", "analytics", "security", "other"]).notNull().default("other"),
  author: varchar("author", { length: 255 }).notNull(),
  version: varchar("version", { length: 32 }).notNull().default("1.0.0"),
  repoUrl: varchar("repoUrl", { length: 512 }),
  iconUrl: varchar("iconUrl", { length: 512 }),
  stars: int("stars").notNull().default(0),
  downloads: int("downloads").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  tags: json("tags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Plugin = typeof plugins.$inferSelect;

export const userPlugins = mysqlTable("user_plugins", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pluginId: int("pluginId").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  config: json("config"),
  installedAt: timestamp("installedAt").defaultNow().notNull(),
});
export type UserPlugin = typeof userPlugins.$inferSelect;

// ============================================================================
// LEGAL JURISDICTIONS
// ============================================================================
export const legalJurisdictions = mysqlTable("legal_jurisdictions", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 64 }).notNull().default("US"),
  type: mysqlEnum("type", ["federal", "state", "county", "international", "regulatory"]).notNull().default("state"),
  courtSystem: text("courtSystem"),
  filingDeadlines: json("filingDeadlines"),
  localRules: json("localRules"),
  resources: json("resources"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LegalJurisdiction = typeof legalJurisdictions.$inferSelect;

// ============================================================================
// DAILY DIGEST SETTINGS
// ============================================================================
export const digestSettings = mysqlTable("digest_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "never"]).notNull().default("daily"),
  sendTime: varchar("sendTime", { length: 8 }).notNull().default("08:00"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("America/New_York"),
  includeDeadlines: boolean("includeDeadlines").notNull().default(true),
  includeCaseUpdates: boolean("includeCaseUpdates").notNull().default(true),
  includeAIInsights: boolean("includeAIInsights").notNull().default(true),
  includeTimeTracking: boolean("includeTimeTracking").notNull().default(true),
  lastSentAt: timestamp("lastSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DigestSettings = typeof digestSettings.$inferSelect;
export type InsertDigestSettings = typeof digestSettings.$inferInsert;
