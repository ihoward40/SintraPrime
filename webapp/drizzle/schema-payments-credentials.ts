import {
  mysqlTable,
  int,
  varchar,
  text,
  decimal,
  timestamp,
  mysqlEnum,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ============================================================================
// PAYMENTS
// ============================================================================
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 255 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ============================================================================
// PACER CREDENTIALS
// ============================================================================
export const pacerCredentials = mysqlTable("pacer_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  username: varchar("username", { length: 255 }).notNull(),
  encryptedPassword: varchar("password_hash", { length: 255 }).notNull(),
  clientCode: varchar("account_number", { length: 100 }),
  isActive: boolean("isActive").notNull().default(true),
  lastVerified: timestamp("last_verified"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PacerCredential = typeof pacerCredentials.$inferSelect;
export type InsertPacerCredential = typeof pacerCredentials.$inferInsert;

// ============================================================================
// PACER DOCKET CACHE
// ============================================================================
export const pacerDocketCache = mysqlTable("pacer_docket_cache", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  caseId: int("caseId"),
  courtIdentifierId: int("court_identifier_id").notNull(),
  caseNumber: varchar("case_number", { length: 100 }).notNull(),
  court: varchar("court", { length: 500 }),
  docketData: json("docketData"),
  lastFetched: timestamp("lastFetched"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PacerDocketCache = typeof pacerDocketCache.$inferSelect;
export type InsertPacerDocketCache = typeof pacerDocketCache.$inferInsert;

// ============================================================================
// AUDIT TRAIL
// ============================================================================
export const auditTrail = mysqlTable("audit_trail", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  eventType: varchar("eventType", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 100 }),
  entityId: int("entityId"),
  action: varchar("action", { length: 50 }).notNull(),
  beforeData: json("beforeData"),
  afterData: json("afterData"),
  changes: json("changes"),
  metadata: json("metadata"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditTrailEntry = typeof auditTrail.$inferSelect;
export type InsertAuditTrailEntry = typeof auditTrail.$inferInsert;

// ============================================================================
// IRS CREDENTIALS
// ============================================================================
export const irsCredentials = mysqlTable("irs_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  etin: varchar("etin", { length: 50 }),
  practitionerId: varchar("practitionerId", { length: 100 }),
  pin: varchar("pin", { length: 255 }),
  pinHash: varchar("pinHash", { length: 255 }),
  efileStatus: mysqlEnum("efileStatus", [
    "active",
    "inactive",
    "suspended",
    "revoked",
  ]).notNull().default("active"),
  statusCheckDate: timestamp("statusCheckDate"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IrsCredential = typeof irsCredentials.$inferSelect;
export type InsertIrsCredential = typeof irsCredentials.$inferInsert;
