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
  first_name: varchar("first_name", { length: 100 }).notNull(),
  last_name: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  ssn_last_four: varchar("ssn_last_four", { length: 4 }),
  date_of_birth: date("date_of_birth"),
  relationship: varchar("relationship", { length: 100 }),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const ikeCreditDisputes = mysqlTable("ike_credit_disputes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  beneficiary_id: varchar("beneficiary_id", { length: 36 })
    .notNull()
    .references(() => ikeBeneficiaries.id, { onDelete: "cascade" }),
  creditor_name: varchar("creditor_name", { length: 200 }).notNull(),
  account_number: varchar("account_number", { length: 100 }),
  dispute_reason: text("dispute_reason").notNull(),
  dispute_type: mysqlEnum("dispute_type", [
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
  amount_disputed: decimal("amount_disputed", { precision: 10, scale: 2 }),
  date_submitted: date("date_submitted"),
  date_resolved: date("date_resolved"),
  resolution_notes: text("resolution_notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const ikeBillingEvents = mysqlTable("ike_billing_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  beneficiary_id: varchar("beneficiary_id", { length: 36 }).references(() => ikeBeneficiaries.id, {
    onDelete: "set null",
  }),
  event_type: varchar("event_type", { length: 100 }).notNull(),
  event_source: varchar("event_source", { length: 100 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: varchar("status", { length: 50 }).notNull(),
  stripe_event_id: varchar("stripe_event_id", { length: 255 }),
  metadata: json("metadata").$type<Record<string, any>>(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const ikeEnforcementPackets = mysqlTable("ike_enforcement_packets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  beneficiary_id: varchar("beneficiary_id", { length: 36 })
    .notNull()
    .references(() => ikeBeneficiaries.id, { onDelete: "cascade" }),
  packet_type: varchar("packet_type", { length: 100 }).notNull(),
  status: mysqlEnum("status", ["draft", "pending", "sent", "completed", "failed"])
    .default("draft")
    .notNull(),
  target_agency: varchar("target_agency", { length: 200 }),
  documents: json("documents").$type<any>(),
  tracking_number: varchar("tracking_number", { length: 100 }),
  date_sent: date("date_sent"),
  date_completed: date("date_completed"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const ikeAgentLogs = mysqlTable("ike_agent_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  trace_id: varchar("trace_id", { length: 36 }).notNull(),
  correlation_id: varchar("correlation_id", { length: 36 }),
  level: mysqlEnum("level", ["debug", "info", "warn", "error", "fatal"]).notNull(),
  message: text("message").notNull(),
  action: varchar("action", { length: 100 }),
  user_id: varchar("user_id", { length: 36 }),
  beneficiary_id: varchar("beneficiary_id", { length: 36 }).references(() => ikeBeneficiaries.id, {
    onDelete: "set null",
  }),
  request_method: varchar("request_method", { length: 10 }),
  request_path: text("request_path"),
  response_status: int("response_status"),
  duration_ms: int("duration_ms"),
  metadata: json("metadata").$type<Record<string, any>>(),
  error_stack: text("error_stack"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
