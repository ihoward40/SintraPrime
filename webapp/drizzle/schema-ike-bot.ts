import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  json,
  date,
  decimal,
  int,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

export const ikeBeneficiaries = mysqlTable("ike_beneficiaries", {
  id: varchar("id", { length: 36 }).primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  ssnLastFour: varchar("ssn_last_four", { length: 4 }),
  dateOfBirth: date("date_of_birth"),
  relationship: varchar("relationship", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type IkeBeneficiary = typeof ikeBeneficiaries.$inferSelect;
export type InsertIkeBeneficiary = typeof ikeBeneficiaries.$inferInsert;

export const ikeCreditDisputes = mysqlTable("ike_credit_disputes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  beneficiaryId: varchar("beneficiary_id", { length: 36 })
    .notNull()
    .references(() => ikeBeneficiaries.id, { onDelete: "cascade" }),
  creditorName: varchar("creditor_name", { length: 200 }).notNull(),
  accountNumber: varchar("account_number", { length: 100 }),
  disputeReason: text("dispute_reason").notNull(),
  disputeType: mysqlEnum("dispute_type", [
    "identity_theft",
    "not_mine",
    "inaccurate",
    "duplicate",
    "paid",
    "other",
  ]).notNull(),
  status: mysqlEnum("status", [
    "pending",
    "submitted",
    "investigating",
    "resolved",
    "rejected",
  ])
    .default("pending")
    .notNull(),
  amountDisputed: decimal("amount_disputed", { precision: 10, scale: 2 }),
  dateSubmitted: date("date_submitted"),
  dateResolved: date("date_resolved"),
  resolutionNotes: text("resolution_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type IkeCreditDispute = typeof ikeCreditDisputes.$inferSelect;
export type InsertIkeCreditDispute = typeof ikeCreditDisputes.$inferInsert;

export const ikeBillingEvents = mysqlTable("ike_billing_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  beneficiaryId: varchar("beneficiary_id", { length: 36 }).references(() => ikeBeneficiaries.id, {
    onDelete: "set null",
  }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  eventSource: varchar("event_source", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: varchar("status", { length: 50 }).notNull(),
  stripeEventId: varchar("stripe_event_id", { length: 255 }),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type IkeBillingEvent = typeof ikeBillingEvents.$inferSelect;
export type InsertIkeBillingEvent = typeof ikeBillingEvents.$inferInsert;

export const ikeEnforcementPackets = mysqlTable("ike_enforcement_packets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  beneficiaryId: varchar("beneficiary_id", { length: 36 })
    .notNull()
    .references(() => ikeBeneficiaries.id, { onDelete: "cascade" }),
  packetType: varchar("packet_type", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["draft", "pending", "sent", "completed", "failed"])
    .default("draft")
    .notNull(),
  targetAgency: varchar("target_agency", { length: 200 }),
  documents: json("documents").$type<any>(),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  dateSent: date("date_sent"),
  dateCompleted: date("date_completed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type IkeEnforcementPacket = typeof ikeEnforcementPackets.$inferSelect;
export type InsertIkeEnforcementPacket = typeof ikeEnforcementPackets.$inferInsert;

export const ikeAgentLogs = mysqlTable("ike_agent_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  traceId: varchar("trace_id", { length: 36 }).notNull(),
  correlationId: varchar("correlation_id", { length: 36 }),
  level: mysqlEnum("level", ["debug", "info", "warn", "error", "fatal"]).notNull(),
  message: text("message").notNull(),
  action: varchar("action", { length: 100 }),
  userId: varchar("user_id", { length: 36 }),
  beneficiaryId: varchar("beneficiary_id", { length: 36 }).references(() => ikeBeneficiaries.id, {
    onDelete: "set null",
  }),
  requestMethod: varchar("request_method", { length: 10 }),
  requestPath: text("request_path"),
  responseStatus: int("response_status"),
  durationMs: int("duration_ms"),
  metadata: json("metadata").$type<Record<string, any>>(),
  errorStack: text("error_stack"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type IkeAgentLog = typeof ikeAgentLogs.$inferSelect;
export type InsertIkeAgentLog = typeof ikeAgentLogs.$inferInsert;
