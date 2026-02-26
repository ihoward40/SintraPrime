import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, decimal } from "drizzle-orm/mysql-core";

/**
 * SintraPrime Legal Warfare Platform - Database Schema
 * 
 * This schema supports:
 * - Case management
 * - Document storage and templates
 * - Evidence tracking with blockchain verification
 * - Coalition collaboration
 * - AI interaction history
 * - Legal intelligence monitoring
 */

// ============================================================================
// CORE USER TABLE
// ============================================================================

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "pro", "coalition", "enterprise"]).default("free").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  onboardingComplete: boolean("onboardingComplete").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// CASE MANAGEMENT
// ============================================================================

export const cases = mysqlTable("cases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Owner of the case
  title: varchar("title", { length: 500 }).notNull(),
  caseNumber: varchar("caseNumber", { length: 100 }),
  description: text("description"),
  status: mysqlEnum("status", [
    "draft",
    "active",
    "pending",
    "won",
    "lost",
    "settled",
    "archived"
  ]).default("draft").notNull(),
  caseType: varchar("caseType", { length: 100 }), // FDCPA, FCRA, RICO, etc.
  jurisdiction: varchar("jurisdiction", { length: 100 }), // Federal, State, County
  court: varchar("court", { length: 200 }),
  filingDate: timestamp("filingDate"),
  trialDate: timestamp("trialDate"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  tags: json("tags").$type<string[]>(), // Array of tags
  metadata: json("metadata").$type<Record<string, any>>(), // Flexible metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;

// ============================================================================
// PARTIES (Plaintiffs, Defendants, Creditors, etc.)
// ============================================================================

export const parties = mysqlTable("parties", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  type: mysqlEnum("type", ["plaintiff", "defendant", "creditor", "attorney", "witness", "other"]).notNull(),
  entityType: mysqlEnum("entityType", ["individual", "corporation", "llc", "partnership", "government", "other"]),
  contactInfo: json("contactInfo").$type<{
    email?: string;
    phone?: string;
    address?: string;
    registeredAgent?: string;
  }>(),
  corporateInfo: json("corporateInfo").$type<{
    ein?: string;
    secStatus?: string;
    stateOfIncorporation?: string;
    businessAddress?: string;
  }>(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Party = typeof parties.$inferSelect;
export type InsertParty = typeof parties.$inferInsert;

// ============================================================================
// DOCUMENTS
// ============================================================================

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId"),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  documentType: varchar("documentType", { length: 100 }), // complaint, motion, letter, evidence, etc.
  s3Url: varchar("s3Url", { length: 500 }),
  mimeType: varchar("mimeType", { length: 50 }),
  fileSize: int("fileSize"),
  uploadedAt: timestamp("uploadedAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ============================================================================
// REPORT SCHEDULES & HISTORY
// ============================================================================

export * from './schema-alerts';


// ============================================================================
// REPORT SCHEDULES & HISTORY
// ============================================================================

export * from './schema-report-schedules';
export * from './schema-email';
export * from './schema-web-monitoring';
export * from './schema-audio';
export * from './schema-timeline';
export * from './schema-workflows';
export * from './schema-workflow-triggers';
export * from './schema-trigger-alerts';
export * from './schema-adapters';
export * from './schema-autonomous-tasks';

// ============================================================================
// IKE BOT (Phase 3-2)
// ============================================================================

export * from './schema-ike-bot';
