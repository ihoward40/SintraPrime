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
  fileUrl: text("fileUrl"), // S3 URL
  fileKey: varchar("fileKey", { length: 500 }), // S3 key
  fileName: varchar("fileName", { length: 300 }),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"), // bytes
  content: text("content"), // Text content for searchability
  version: int("version").default(1).notNull(),
  isTemplate: boolean("isTemplate").default(false).notNull(),
  templateCategory: varchar("templateCategory", { length: 100 }),
  tags: json("tags").$type<string[]>(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ============================================================================
// EVIDENCE
// ============================================================================

export const evidence = mysqlTable("evidence", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  evidenceType: varchar("evidenceType", { length: 100 }), // document, photo, video, audio, screenshot, etc.
  fileUrl: text("fileUrl").notNull(), // S3 URL
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 300 }),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  sourceUrl: text("sourceUrl"), // Original web URL if captured from browser
  captureMethod: varchar("captureMethod", { length: 100 }), // manual_upload, web_capture, screenshot, etc.
  // Blockchain verification
  blockchainHash: varchar("blockchainHash", { length: 200 }), // IPFS hash or Ethereum tx hash
  blockchainTimestamp: timestamp("blockchainTimestamp"),
  blockchainVerified: boolean("blockchainVerified").default(false).notNull(),
  // Chain of custody
  chainOfCustody: json("chainOfCustody").$type<Array<{
    timestamp: string;
    action: string;
    userId: number;
    userName: string;
    notes?: string;
  }>>(),
  tags: json("tags").$type<string[]>(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Evidence = typeof evidence.$inferSelect;
export type InsertEvidence = typeof evidence.$inferInsert;

// ============================================================================
// CASE TIMELINE / EVENTS
// ============================================================================

export const caseEvents = mysqlTable("caseEvents", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  eventType: varchar("eventType", { length: 100 }), // filing, hearing, deadline, correspondence, etc.
  eventDate: timestamp("eventDate").notNull(),
  dueDate: timestamp("dueDate"),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completedAt"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  relatedDocumentId: int("relatedDocumentId"),
  relatedEvidenceId: int("relatedEvidenceId"),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CaseEvent = typeof caseEvents.$inferSelect;
export type InsertCaseEvent = typeof caseEvents.$inferInsert;

// ============================================================================
// CASE NOTES
// ============================================================================

export const caseNotes = mysqlTable("caseNotes", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  noteType: varchar("noteType", { length: 100 }), // general, strategy, research, meeting, etc.
  isPinned: boolean("isPinned").default(false).notNull(),
  tags: json("tags").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CaseNote = typeof caseNotes.$inferSelect;
export type InsertCaseNote = typeof caseNotes.$inferInsert;

// ============================================================================
// AI CHAT HISTORY
// ============================================================================

export const aiChats = mysqlTable("aiChats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  caseId: int("caseId"), // Optional: link to specific case
  sessionId: varchar("sessionId", { length: 100 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata").$type<{
    model?: string;
    tokens?: number;
    context?: string;
    citations?: Array<{ title: string; url: string }>;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiChat = typeof aiChats.$inferSelect;
export type InsertAiChat = typeof aiChats.$inferInsert;

// ============================================================================
// COALITIONS (Group collaboration)
// ============================================================================

export const coalitions = mysqlTable("coalitions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  creatorId: int("creatorId").notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  memberCount: int("memberCount").default(1).notNull(),
  tags: json("tags").$type<string[]>(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Coalition = typeof coalitions.$inferSelect;
export type InsertCoalition = typeof coalitions.$inferInsert;

// ============================================================================
// COALITION MEMBERS
// ============================================================================

export const coalitionMembers = mysqlTable("coalitionMembers", {
  id: int("id").autoincrement().primaryKey(),
  coalitionId: int("coalitionId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type CoalitionMember = typeof coalitionMembers.$inferSelect;
export type InsertCoalitionMember = typeof coalitionMembers.$inferInsert;

// ============================================================================
// LEGAL INTELLIGENCE ALERTS
// ============================================================================

export const legalAlerts = mysqlTable("legalAlerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  caseId: int("caseId"),
  alertType: varchar("alertType", { length: 100 }).notNull(), // case_law, statute, regulation, etc.
  jurisdiction: varchar("jurisdiction", { length: 100 }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  sourceUrl: text("sourceUrl"),
  relevanceScore: int("relevanceScore"), // 0-100
  isRead: boolean("isRead").default(false).notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LegalAlert = typeof legalAlerts.$inferSelect;
export type InsertLegalAlert = typeof legalAlerts.$inferInsert;

// ============================================================================
// WARFARE STRATEGIES
// ============================================================================

export const warfareStrategies = mysqlTable("warfareStrategies", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  userId: int("userId").notNull(),
  strategyName: varchar("strategyName", { length: 300 }).notNull(),
  front: mysqlEnum("front", [
    "legal",
    "regulatory",
    "technical",
    "information",
    "financial",
    "political",
    "unconventional"
  ]).notNull(),
  description: text("description"),
  tactics: json("tactics").$type<Array<{
    name: string;
    description: string;
    status: string;
    deadline?: string;
  }>>(),
  status: mysqlEnum("status", ["planned", "active", "completed", "abandoned"]).default("planned").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WarfareStrategy = typeof warfareStrategies.$inferSelect;
export type InsertWarfareStrategy = typeof warfareStrategies.$inferInsert;

// ============================================================================
// BOOKMARKS (Quantum Workspace)
// ============================================================================

export const bookmarks = mysqlTable("bookmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  caseId: int("caseId"),
  url: text("url").notNull(),
  title: varchar("title", { length: 500 }),
  description: text("description"),
  category: varchar("category", { length: 100 }), // research, evidence, reference, etc.
  tags: json("tags").$type<string[]>(),
  screenshotUrl: text("screenshotUrl"), // S3 URL of page screenshot
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = typeof bookmarks.$inferInsert;

// ============================================================================
// PAYMENT HISTORY
// ============================================================================

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 255 }),
  amount: int("amount").notNull(), // in cents
  currency: varchar("currency", { length: 10 }).default("usd").notNull(),
  status: varchar("status", { length: 50 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  caseId: int("caseId"),
  type: varchar("type", { length: 100 }).notNull(), // deadline_approaching, case_status_change, coalition_activity, system, etc.
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 500 }), // In-app link to navigate to
  isRead: boolean("isRead").default(false).notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============================================================================
// CASE EMAILS (Correspondence tracking)
// ============================================================================

export const caseEmails = mysqlTable("caseEmails", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  userId: int("userId").notNull(),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  fromAddress: varchar("fromAddress", { length: 320 }),
  toAddress: varchar("toAddress", { length: 320 }),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  htmlBody: text("htmlBody"),
  threadId: varchar("threadId", { length: 100 }), // Group emails in threads
  attachments: json("attachments").$type<Array<{
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
  }>>(),
  isStarred: boolean("isStarred").default(false).notNull(),
  isRead: boolean("isRead").default(true).notNull(),
  sentAt: timestamp("sentAt"),
  receivedAt: timestamp("receivedAt"),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CaseEmail = typeof caseEmails.$inferSelect;
export type InsertCaseEmail = typeof caseEmails.$inferInsert;

// ============================================================================
// FILING CHECKLISTS
// ============================================================================

export const filingChecklists = mysqlTable("filingChecklists", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId"),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  caseType: varchar("caseType", { length: 100 }).notNull(), // FDCPA, FCRA, TILA, etc.
  jurisdiction: varchar("jurisdiction", { length: 100 }).notNull(),
  court: varchar("court", { length: 200 }),
  items: json("items").$type<Array<{
    id: string;
    step: number;
    title: string;
    description: string;
    category: string; // forms, fees, documents, procedures
    isRequired: boolean;
    isCompleted: boolean;
    completedAt?: string;
    dueDate?: string;
    estimatedFee?: string;
    notes?: string;
    links?: Array<{ title: string; url: string }>;
  }>>(),
  progress: int("progress").default(0).notNull(), // 0-100 percentage
  status: mysqlEnum("status", ["draft", "in_progress", "completed"]).default("draft").notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FilingChecklist = typeof filingChecklists.$inferSelect;
export type InsertFilingChecklist = typeof filingChecklists.$inferInsert;


// ============================================================================
// LEGAL RESEARCH LIBRARY
// ============================================================================

export const legalResearch = mysqlTable("legal_research", {
  id: int("id").autoincrement().primaryKey(),
  title: text("title").notNull(),
  category: mysqlEnum("category", [
    "federal_statute", "state_statute", "case_law", "regulation",
    "procedural_rule", "legal_guide", "form_template",
  ]).notNull(),
  subcategory: varchar("subcategory", { length: 255 }),
  citation: varchar("citation", { length: 500 }),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  jurisdiction: varchar("jurisdiction", { length: 100 }),
  tags: json("tags").$type<string[]>(),
  sourceUrl: text("sourceUrl"),
  effectiveDate: varchar("effectiveDate", { length: 50 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LegalResearch = typeof legalResearch.$inferSelect;
export type InsertLegalResearch = typeof legalResearch.$inferInsert;

export const researchBookmarks = mysqlTable("research_bookmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  researchId: int("researchId").notNull(),
  caseId: int("caseId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ResearchBookmark = typeof researchBookmarks.$inferSelect;
export type InsertResearchBookmark = typeof researchBookmarks.$inferInsert;


// ============================================================================
// DOCUMENT VERSION HISTORY
// ============================================================================

export const documentVersions = mysqlTable("document_versions", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  userId: int("userId").notNull(), // Who made this version
  versionNumber: int("versionNumber").notNull(),
  content: text("content").notNull(),
  changeSummary: varchar("changeSummary", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;

// ============================================================================
// CASE ACTIVITY FEED
// ============================================================================

export const caseActivities = mysqlTable("case_activities", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  userId: int("userId").notNull(), // Who performed the action
  activityType: mysqlEnum("activityType", [
    "case_created",
    "case_updated",
    "status_changed",
    "document_added",
    "document_updated",
    "evidence_added",
    "note_added",
    "party_added",
    "strategy_added",
    "member_joined",
    "deadline_added",
  ]).notNull(),
  description: text("description").notNull(),
  metadata: json("metadata"), // Additional context (e.g., old/new status, document name)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CaseActivity = typeof caseActivities.$inferSelect;
export type InsertCaseActivity = typeof caseActivities.$inferInsert;

// ============================================================================
// TERMINAL COMMAND HISTORY
// ============================================================================

export const terminalHistory = mysqlTable("terminal_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  command: text("command").notNull(),
  output: text("output"),
  success: boolean("success").notNull().default(true),
  executedAt: timestamp("executedAt").defaultNow().notNull(),
});

export type TerminalHistory = typeof terminalHistory.$inferSelect;
export type InsertTerminalHistory = typeof terminalHistory.$inferInsert;

// Workspaces for team collaboration
export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ownerId: int("ownerId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = typeof workspaces.$inferInsert;

// Team members with roles
export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "attorney", "paralegal", "client"]).notNull().default("client"),
  permissions: json("permissions").$type<string[]>(),
  invitedBy: int("invitedBy"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// Workspace cases (link cases to workspaces)
export const workspaceCases = mysqlTable("workspace_cases", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  caseId: int("caseId").notNull(),
  addedBy: int("addedBy").notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type WorkspaceCase = typeof workspaceCases.$inferSelect;
export type InsertWorkspaceCase = typeof workspaceCases.$inferInsert;

// User settings for API keys and preferences
export const userSettings = mysqlTable("user_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  settingKey: varchar("settingKey", { length: 255 }).notNull(),
  settingValue: text("settingValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSetting = typeof userSettings.$inferSelect;
export type InsertUserSetting = typeof userSettings.$inferInsert;

// ============================================================================
// CONTRACT LAW MANAGEMENT
// ============================================================================

export const contracts = mysqlTable("contracts", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId"),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  contractType: varchar("contractType", { length: 100 }).notNull(), // nda, employment, service_agreement, lease, purchase, etc.
  status: mysqlEnum("status", ["draft", "under_review", "negotiation", "executed", "terminated"]).default("draft").notNull(),
  parties: json("parties").$type<string[]>(), // Array of party names
  effectiveDate: timestamp("effectiveDate"),
  expirationDate: timestamp("expirationDate"),
  content: text("content").notNull(), // Full contract text
  metadata: json("metadata").$type<Record<string, any>>(),
  riskScore: int("riskScore"), // 0-100, calculated by AI
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = typeof contracts.$inferInsert;

export const contractClauses = mysqlTable("contract_clauses", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // confidentiality, termination, liability, payment, etc.
  content: text("content").notNull(),
  description: text("description"),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]),
  tags: json("tags").$type<string[]>(),
  isStandard: boolean("isStandard").default(false).notNull(), // Standard/boilerplate clause
  userId: int("userId"), // NULL for system clauses
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContractClause = typeof contractClauses.$inferSelect;
export type InsertContractClause = typeof contractClauses.$inferInsert;

export const contractNegotiations = mysqlTable("contract_negotiations", {
  id: int("id").autoincrement().primaryKey(),
  contractId: int("contractId").notNull(),
  version: int("version").notNull(),
  changes: json("changes").$type<Array<{
    section: string;
    oldText: string;
    newText: string;
    reason: string;
  }>>(),
  changedBy: varchar("changedBy", { length: 255 }).notNull(), // Party name
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContractNegotiation = typeof contractNegotiations.$inferSelect;
export type InsertContractNegotiation = typeof contractNegotiations.$inferInsert;

export const contractObligations = mysqlTable("contract_obligations", {
  id: int("id").autoincrement().primaryKey(),
  contractId: int("contractId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  responsibleParty: varchar("responsibleParty", { length: 255 }).notNull(),
  dueDate: timestamp("dueDate"),
  status: mysqlEnum("status", ["pending", "completed", "overdue"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type ContractObligation = typeof contractObligations.$inferSelect;
export type InsertContractObligation = typeof contractObligations.$inferInsert;

export const contractTemplates = mysqlTable("contract_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),
  contractType: varchar("contractType", { length: 100 }).notNull(),
  description: text("description"),
  content: text("content").notNull(), // Template with placeholders like {{party_name}}
  placeholders: json("placeholders").$type<Array<{
    key: string;
    label: string;
    type: string; // text, date, number, select
    required: boolean;
    options?: string[]; // For select type
  }>>(),
  isPublic: boolean("isPublic").default(false).notNull(),
  userId: int("userId"), // NULL for system templates
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type InsertContractTemplate = typeof contractTemplates.$inferInsert;

// ============================================================================
// TRUST LAW MANAGEMENT
// ============================================================================

export const trusts = mysqlTable("trusts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Creator/attorney
  caseId: int("caseId"), // Optional link to case
  trustName: varchar("trustName", { length: 500 }).notNull(),
  trustType: mysqlEnum("trustType", [
    "revocable_living",
    "irrevocable",
    "testamentary",
    "charitable",
    "special_needs",
    "spendthrift",
    "asset_protection"
  ]).notNull(),
  status: mysqlEnum("status", ["draft", "active", "amended", "terminated"]).default("draft").notNull(),
  settlor: varchar("settlor", { length: 300 }).notNull(), // Person creating the trust
  establishedDate: timestamp("establishedDate"),
  terminationDate: timestamp("terminationDate"),
  purpose: text("purpose"),
  terms: text("terms").notNull(), // Full trust document text
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Trust = typeof trusts.$inferSelect;
export type InsertTrust = typeof trusts.$inferInsert;

export const trustees = mysqlTable("trustees", {
  id: int("id").autoincrement().primaryKey(),
  trustId: int("trustId").notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  role: mysqlEnum("role", ["primary", "successor", "co_trustee"]).notNull(),
  contactInfo: json("contactInfo").$type<{
    email?: string;
    phone?: string;
    address?: string;
  }>(),
  appointedDate: timestamp("appointedDate"),
  removedDate: timestamp("removedDate"),
  status: mysqlEnum("status", ["active", "removed", "deceased"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Trustee = typeof trustees.$inferSelect;
export type InsertTrustee = typeof trustees.$inferInsert;

export const beneficiaries = mysqlTable("beneficiaries", {
  id: int("id").autoincrement().primaryKey(),
  trustId: int("trustId").notNull(),
  name: varchar("name", { length: 300 }).notNull(),
  relationship: varchar("relationship", { length: 100 }), // spouse, child, charity, etc.
  beneficiaryType: mysqlEnum("beneficiaryType", ["primary", "contingent", "remainder"]).notNull(),
  distributionShare: varchar("distributionShare", { length: 100 }), // "50%", "1/3", "residual", etc.
  distributionConditions: text("distributionConditions"), // Age requirements, milestones, etc.
  contactInfo: json("contactInfo").$type<{
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
  }>(),
  status: mysqlEnum("status", ["active", "removed", "deceased"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Beneficiary = typeof beneficiaries.$inferSelect;
export type InsertBeneficiary = typeof beneficiaries.$inferInsert;

export const trustAssets = mysqlTable("trust_assets", {
  id: int("id").autoincrement().primaryKey(),
  trustId: int("trustId").notNull(),
  assetType: mysqlEnum("assetType", [
    "real_estate",
    "cash",
    "securities",
    "business_interest",
    "personal_property",
    "intellectual_property",
    "other"
  ]).notNull(),
  description: text("description").notNull(),
  estimatedValue: int("estimatedValue"), // in cents
  acquisitionDate: timestamp("acquisitionDate"),
  location: varchar("location", { length: 500 }), // Physical location or account info
  documentation: json("documentation").$type<Array<{
    title: string;
    fileUrl: string;
    fileType: string;
  }>>(),
  status: mysqlEnum("status", ["active", "sold", "distributed", "transferred"]).default("active").notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrustAsset = typeof trustAssets.$inferSelect;
export type InsertTrustAsset = typeof trustAssets.$inferInsert;

export const trustDistributions = mysqlTable("trust_distributions", {
  id: int("id").autoincrement().primaryKey(),
  trustId: int("trustId").notNull(),
  beneficiaryId: int("beneficiaryId").notNull(),
  amount: int("amount").notNull(), // in cents
  distributionType: mysqlEnum("distributionType", ["income", "principal", "discretionary"]).notNull(),
  purpose: varchar("purpose", { length: 500 }),
  distributionDate: timestamp("distributionDate").notNull(),
  method: varchar("method", { length: 100 }), // check, wire_transfer, etc.
  status: mysqlEnum("status", ["pending", "completed", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrustDistribution = typeof trustDistributions.$inferSelect;
export type InsertTrustDistribution = typeof trustDistributions.$inferInsert;

export const fiduciaryDuties = mysqlTable("fiduciary_duties", {
  id: int("id").autoincrement().primaryKey(),
  trustId: int("trustId").notNull(),
  dutyType: varchar("dutyType", { length: 100 }).notNull(), // loyalty, prudence, impartiality, accounting, etc.
  description: text("description").notNull(),
  dueDate: timestamp("dueDate"),
  completedDate: timestamp("completedDate"),
  status: mysqlEnum("status", ["pending", "completed", "overdue"]).default("pending").notNull(),
  evidence: json("evidence").$type<Array<{
    title: string;
    fileUrl: string;
    uploadedAt: string;
  }>>(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FiduciaryDuty = typeof fiduciaryDuties.$inferSelect;
export type InsertFiduciaryDuty = typeof fiduciaryDuties.$inferInsert;

export const trustAmendments = mysqlTable("trust_amendments", {
  id: int("id").autoincrement().primaryKey(),
  trustId: int("trustId").notNull(),
  amendmentNumber: int("amendmentNumber").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  changes: json("changes").$type<Array<{
    section: string;
    oldText: string;
    newText: string;
  }>>(),
  effectiveDate: timestamp("effectiveDate").notNull(),
  documentUrl: text("documentUrl"), // S3 URL of signed amendment
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrustAmendment = typeof trustAmendments.$inferSelect;
export type InsertTrustAmendment = typeof trustAmendments.$inferInsert;


// ============================================================================
// QUANTUM WORKSPACE BOOKMARKS
// ============================================================================

export const workspaceBookmarks = mysqlTable("workspace_bookmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  url: text("url").notNull(),
  category: varchar("category", { length: 100 }), // case_law, research, court_filings, etc.
  notes: text("notes"),
  tags: json("tags").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkspaceBookmark = typeof workspaceBookmarks.$inferSelect;
export type InsertWorkspaceBookmark = typeof workspaceBookmarks.$inferInsert;


// ============================================================================
// BOOKMARK COLLECTIONS
// ============================================================================

export const bookmarkCollections = mysqlTable("bookmark_collections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Collection owner
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  isPublic: boolean("isPublic").default(false).notNull(),
  color: varchar("color", { length: 20 }), // Hex color for UI
  icon: varchar("icon", { length: 50 }), // Icon name
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BookmarkCollection = typeof bookmarkCollections.$inferSelect;
export type InsertBookmarkCollection = typeof bookmarkCollections.$inferInsert;

export const collectionBookmarks = mysqlTable("collection_bookmarks", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collectionId").notNull(),
  bookmarkId: int("bookmarkId").notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type CollectionBookmark = typeof collectionBookmarks.$inferSelect;
export type InsertCollectionBookmark = typeof collectionBookmarks.$inferInsert;

export const collectionShares = mysqlTable("collection_shares", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collectionId").notNull(),
  sharedWithUserId: int("sharedWithUserId").notNull(),
  permission: mysqlEnum("permission", ["view", "edit"]).default("view").notNull(),
  sharedAt: timestamp("sharedAt").defaultNow().notNull(),
});

export type CollectionShare = typeof collectionShares.$inferSelect;
export type InsertCollectionShare = typeof collectionShares.$inferInsert;


// ============================================================================
// NANOBOT SELF-REPAIR SYSTEM
// ============================================================================

export const systemHealthChecks = mysqlTable("system_health_checks", {
  id: int("id").autoincrement().primaryKey(),
  checkType: varchar("check_type", { length: 100 }).notNull(),
  endpoint: varchar("endpoint", { length: 500 }),
  status: varchar("status", { length: 50 }).notNull(),
  responseTime: int("response_time"),
  errorMessage: text("error_message"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SystemHealthCheck = typeof systemHealthChecks.$inferSelect;
export type InsertSystemHealthCheck = typeof systemHealthChecks.$inferInsert;

export const nanobotErrorLogs = mysqlTable("nanobot_error_logs", {
  id: int("id").autoincrement().primaryKey(),
  errorType: varchar("error_type", { length: 100 }).notNull(),
  severity: varchar("severity", { length: 50 }).notNull(),
  errorMessage: text("error_message").notNull(),
  stackTrace: text("stack_trace"),
  context: json("context"),
  source: varchar("source", { length: 200 }),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: varchar("resolved_by", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NanobotErrorLog = typeof nanobotErrorLogs.$inferSelect;
export type InsertNanobotErrorLog = typeof nanobotErrorLogs.$inferInsert;

export const nanobotRepairs = mysqlTable("nanobot_repairs", {
  id: int("id").autoincrement().primaryKey(),
  errorLogId: int("error_log_id"),
  repairType: varchar("repair_type", { length: 100 }).notNull(),
  repairDescription: text("repair_description").notNull(),
  repairActions: json("repair_actions").$type<string[]>().notNull(),
  success: boolean("success").notNull(),
  resultMessage: text("result_message"),
  executionTime: int("execution_time"),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NanobotRepair = typeof nanobotRepairs.$inferSelect;
export type InsertNanobotRepair = typeof nanobotRepairs.$inferInsert;

export const nanobotLearning = mysqlTable("nanobot_learning", {
  id: int("id").autoincrement().primaryKey(),
  errorPattern: text("error_pattern").notNull(),
  repairStrategy: text("repair_strategy").notNull(),
  successRate: int("success_rate").default(0).notNull(),
  timesApplied: int("times_applied").default(0).notNull(),
  lastApplied: timestamp("last_applied"),
  confidence: int("confidence").default(50).notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NanobotLearning = typeof nanobotLearning.$inferSelect;
export type InsertNanobotLearning = typeof nanobotLearning.$inferInsert;

export const systemMetrics = mysqlTable("system_metrics", {
  id: int("id").autoincrement().primaryKey(),
  metricType: varchar("metric_type", { length: 100 }).notNull(),
  metricValue: int("metric_value").notNull(),
  unit: varchar("unit", { length: 50 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SystemMetric = typeof systemMetrics.$inferSelect;
export type InsertSystemMetric = typeof systemMetrics.$inferInsert;


// ============================================================================
// AI CHAT CONVERSATIONS (Sprint 18)
// ============================================================================

export const chatConversations = mysqlTable("chat_conversations", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  caseId: int("case_id"),
  title: varchar("title", { length: 500 }),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = typeof chatConversations.$inferInsert;

export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").primaryKey().autoincrement(),
  conversationId: int("conversation_id").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  attachments: json("attachments"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

// ============================================================================
// AUTOMATION RESULTS
// ============================================================================

export const automationResults = mysqlTable("automation_results", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  demoType: varchar("demo_type", { length: 100 }).notNull(),
  resultData: text("result_data"),
  status: mysqlEnum("status", ["running", "completed", "failed"]).default("running").notNull(),
  errorMessage: text("error_message"),
  recordingUrl: varchar("recording_url", { length: 500 }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  duration: int("duration"), // in seconds
});

export type AutomationResult = typeof automationResults.$inferSelect;
export type InsertAutomationResult = typeof automationResults.$inferInsert;

// Demo usage metrics table
export const demoUsageMetrics = mysqlTable("demo_usage_metrics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  demoType: varchar("demo_type", { length: 100 }).notNull(),
  totalExecutions: int("total_executions").default(0).notNull(),
  successfulExecutions: int("successful_executions").default(0).notNull(),
  failedExecutions: int("failed_executions").default(0).notNull(),
  averageDuration: int("average_duration").default(0), // in seconds
  lastExecutedAt: timestamp("last_executed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type DemoUsageMetric = typeof demoUsageMetrics.$inferSelect;
export type InsertDemoUsageMetric = typeof demoUsageMetrics.$inferInsert;


// ============================================================================
// AGENT ZERO 2.0 - MEMORY & LEARNING
// ============================================================================

export const agentMemory = mysqlTable("agent_memory", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  key: varchar("key", { length: 255 }).notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AgentMemory = typeof agentMemory.$inferSelect;
export type InsertAgentMemory = typeof agentMemory.$inferInsert;

export const agentExecutions = mysqlTable("agent_executions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  taskType: varchar("task_type", { length: 100 }),
  approach: text("approach"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed", "blocked"]).notNull(),
  duration: int("duration"), // in seconds
  cost: int("cost").default(0), // in cents (USD * 10000 for precision)
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AgentExecution = typeof agentExecutions.$inferSelect;
export type InsertAgentExecution = typeof agentExecutions.$inferInsert;


// ============================================================================
// COURT IDENTIFIER TRACKING SYSTEM
// ============================================================================

export const courtIdentifiers = mysqlTable("court_identifiers", {
  id: int("id").autoincrement().primaryKey(),
  sintraPrimeId: varchar("sintra_prime_id", { length: 100 }).notNull().unique(),
  externalCaseNumber: varchar("external_case_number", { length: 100 }).notNull(),
  courtSystem: mysqlEnum("court_system", [
    "federal_district",
    "federal_circuit",
    "federal_supreme",
    "state_supreme",
    "state_appellate",
    "state_trial",
    "local_municipal",
    "international",
  ]).notNull(),
  courtId: varchar("court_id", { length: 50 }).notNull(),
  courtName: varchar("court_name", { length: 255 }).notNull(),
  jurisdiction: mysqlEnum("jurisdiction", ["federal", "state", "local", "international"]).notNull(),
  caseTitle: varchar("case_title", { length: 500 }).notNull(),
  filedDate: timestamp("filed_date").notNull(),
  status: mysqlEnum("status", ["active", "pending", "closed", "appealed", "settled", "dismissed"]).notNull(),
  lastChecked: timestamp("last_checked"),
  lastDocketEntry: int("last_docket_entry"),
  monitoringEnabled: boolean("monitoring_enabled").default(true).notNull(),
  userId: int("user_id").notNull(),
  internalCaseId: int("internal_case_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CourtIdentifier = typeof courtIdentifiers.$inferSelect;
export type InsertCourtIdentifier = typeof courtIdentifiers.$inferInsert;

export const courtMonitoringRules = mysqlTable("court_monitoring_rules", {
  id: int("id").autoincrement().primaryKey(),
  courtIdentifierId: int("court_identifier_id").notNull(),
  ruleType: mysqlEnum("rule_type", [
    "new_docket_entry",
    "specific_document",
    "party_filing",
    "judge_order",
    "hearing_scheduled",
    "status_change",
    "deadline_approaching",
  ]).notNull(),
  keywords: json("keywords"), // string[]
  documentTypes: json("document_types"), // string[]
  partyNames: json("party_names"), // string[]
  alertOnAnyChange: boolean("alert_on_any_change").default(false).notNull(),
  notificationMethod: json("notification_method").notNull(), // NotificationMethod[]
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CourtMonitoringRule = typeof courtMonitoringRules.$inferSelect;
export type InsertCourtMonitoringRule = typeof courtMonitoringRules.$inferInsert;

export const courtAlerts = mysqlTable("court_alerts", {
  id: int("id").autoincrement().primaryKey(),
  courtIdentifierId: int("court_identifier_id").notNull(),
  monitoringRuleId: int("monitoring_rule_id"),
  alertType: varchar("alert_type", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  docketEntryNumber: int("docket_entry_number"),
  documentNumber: varchar("document_number", { length: 50 }),
  severity: mysqlEnum("severity", ["info", "warning", "urgent", "critical"]).notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CourtAlert = typeof courtAlerts.$inferSelect;
export type InsertCourtAlert = typeof courtAlerts.$inferInsert;

// PACER Integration Tables
export const pacerCredentials = mysqlTable("pacer_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().unique(),
  username: varchar("username", { length: 255 }).notNull(),
  encryptedPassword: text("encrypted_password").notNull(), // AES-256 encrypted
  clientCode: varchar("client_code", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  lastVerified: timestamp("last_verified"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PACERCredentials = typeof pacerCredentials.$inferSelect;
export type InsertPACERCredentials = typeof pacerCredentials.$inferInsert;

export const pacerDocketCache = mysqlTable("pacer_docket_cache", {
  id: int("id").autoincrement().primaryKey(),
  courtIdentifierId: int("court_identifier_id").notNull(),
  caseNumber: varchar("case_number", { length: 100 }).notNull(),
  court: varchar("court", { length: 50 }).notNull(),
  docketData: json("docket_data").notNull(), // Full docket JSON
  lastFetched: timestamp("last_fetched").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Cache expiration
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PACERDocketCache = typeof pacerDocketCache.$inferSelect;
export type InsertPACERDocketCache = typeof pacerDocketCache.$inferInsert;


// ============================================================================
// NOTEBOOKLM RESEARCH SYSTEM
// ============================================================================

export const researchCollections = mysqlTable("research_collections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  caseId: int("case_id"), // Optional link to a case
  isShared: boolean("is_shared").default(false).notNull(),
  sharedWith: json("shared_with").$type<number[]>(), // Array of user IDs
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ResearchCollection = typeof researchCollections.$inferSelect;
export type InsertResearchCollection = typeof researchCollections.$inferInsert;

export const researchDocuments = mysqlTable("research_documents", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collection_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(), // S3 URL
  fileType: varchar("file_type", { length: 50 }).notNull(), // pdf, docx, txt, url, youtube
  fileSize: int("file_size"), // in bytes
  mimeType: varchar("mime_type", { length: 100 }),
  extractedText: text("extracted_text"), // Full text content
  summary: text("summary"), // AI-generated summary
  keyTopics: json("key_topics").$type<string[]>(), // Extracted topics
  embedding: json("embedding").$type<number[]>(), // Vector embedding for semantic search
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type ResearchDocument = typeof researchDocuments.$inferSelect;
export type InsertResearchDocument = typeof researchDocuments.$inferInsert;

export const researchInsights = mysqlTable("research_insights", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collection_id").notNull(),
  insightType: mysqlEnum("insight_type", [
    "qa",
    "summary",
    "study_guide",
    "briefing",
    "faq",
    "timeline",
    "flashcard",
    "quiz"
  ]).notNull(),
  question: text("question"), // For Q&A type
  answer: text("answer").notNull(),
  citations: json("citations").$type<Array<{
    documentId: number;
    fileName: string;
    excerpt: string;
    pageNumber?: number;
  }>>(), // Source citations
  metadata: json("metadata").$type<Record<string, any>>(), // Flexible metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ResearchInsight = typeof researchInsights.$inferSelect;
export type InsertResearchInsight = typeof researchInsights.$inferInsert;

export const researchAudioOverviews = mysqlTable("research_audio_overviews", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collection_id").notNull(),
  audioUrl: text("audio_url").notNull(), // S3 URL
  duration: int("duration"), // in seconds
  transcript: text("transcript"), // Full transcript
  focusAreas: json("focus_areas").$type<string[]>(), // Topics covered
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export type ResearchAudioOverview = typeof researchAudioOverviews.$inferSelect;
export type InsertResearchAudioOverview = typeof researchAudioOverviews.$inferInsert;

export const researchCitations = mysqlTable("research_citations", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collection_id").notNull(),
  documentId: int("document_id").notNull(),
  citationText: text("citation_text").notNull(),
  pageNumber: int("page_number"),
  context: text("context"), // Surrounding text
  usedInInsightId: int("used_in_insight_id"), // Link to insight
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ResearchCitation = typeof researchCitations.$inferSelect;
export type InsertResearchCitation = typeof researchCitations.$inferInsert;

// ============================================================================
// INTELLIGENCE DATABASE (AI Tools Tracking)
// ============================================================================

export const aiTools = mysqlTable("ai_tools", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // script, image, video, voice, automation, research, legal
  skillLevel: varchar("skill_level", { length: 50 }).notNull(), // beginner, intermediate, advanced
  budgetTier: varchar("budget_tier", { length: 50 }).notNull(), // free, low, premium
  reliabilityScore: int("reliability_score").default(0), // 1-10 scale
  officialDocs: text("official_docs"), // URL to official documentation
  pdfStored: boolean("pdf_stored").default(false),
  pdfPath: text("pdf_path"), // S3 path to stored PDF documentation
  notes: text("notes"),
  lastReviewed: timestamp("last_reviewed"),
  deprecated: boolean("deprecated").default(false),
  deprecationReason: text("deprecation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type AITool = typeof aiTools.$inferSelect;
export type InsertAITool = typeof aiTools.$inferInsert;

export const toolReviews = mysqlTable("tool_reviews", {
  id: int("id").primaryKey().autoincrement(),
  toolId: int("tool_id").notNull(),
  userId: int("user_id").notNull(),
  rating: int("rating").notNull(), // 1-5 stars
  review: text("review"),
  dateReviewed: timestamp("date_reviewed").defaultNow(),
});

export type ToolReview = typeof toolReviews.$inferSelect;
export type InsertToolReview = typeof toolReviews.$inferInsert;

export const toolDocumentation = mysqlTable("tool_documentation", {
  id: int("id").primaryKey().autoincrement(),
  toolId: int("tool_id").notNull(),
  docUrl: text("doc_url"),
  pdfPath: text("pdf_path"), // S3 path
  version: varchar("version", { length: 50 }),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export type ToolDocumentation = typeof toolDocumentation.$inferSelect;
export type InsertToolDocumentation = typeof toolDocumentation.$inferInsert;

export const reviewFlags = mysqlTable("review_flags", {
  id: int("id").primaryKey().autoincrement(),
  reviewId: int("review_id").notNull(),
  userId: int("user_id").notNull(), // User who flagged
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, resolved, dismissed
  moderatorNote: text("moderator_note"),
  flaggedAt: timestamp("flagged_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export type ReviewFlag = typeof reviewFlags.$inferSelect;
export type InsertReviewFlag = typeof reviewFlags.$inferInsert;

export const toolUsageAnalytics = mysqlTable("tool_usage_analytics", {
  id: int("id").primaryKey().autoincrement(),
  toolId: int("tool_id").notNull(),
  userId: int("user_id").notNull(),
  usageCount: int("usage_count").default(0),
  lastUsed: timestamp("last_used").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ToolUsageAnalytic = typeof toolUsageAnalytics.$inferSelect;
export type InsertToolUsageAnalytic = typeof toolUsageAnalytics.$inferInsert;

export const toolRecommendations = mysqlTable("tool_recommendations", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  toolId: int("tool_id").notNull(),
  score: int("score").notNull(), // 0-100
  reason: text("reason"), // Why this tool is recommended
  feedback: varchar("feedback", { length: 20 }), // thumbs_up, thumbs_down, null
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ToolRecommendation = typeof toolRecommendations.$inferSelect;
export type InsertToolRecommendation = typeof toolRecommendations.$inferInsert;

// ============================================================================
// STACK BUILDER SYSTEM
// ============================================================================

export const projectStacks = mysqlTable("project_stacks", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  outputType: varchar("output_type", { length: 100 }).notNull(), // film, reel, ad, course, legal_brief, etc.
  budget: varchar("budget", { length: 50 }).notNull(), // low, medium, high
  skillLevel: varchar("skill_level", { length: 50 }).notNull(), // beginner, intermediate, advanced
  timeline: varchar("timeline", { length: 100 }), // 1 week, 2 weeks, 1 month, etc.
  status: varchar("status", { length: 50 }).default("planning"), // planning, production, done
  decisionNotes: text("decision_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type ProjectStack = typeof projectStacks.$inferSelect;
export type InsertProjectStack = typeof projectStacks.$inferInsert;

export const stackTools = mysqlTable("stack_tools", {
  id: int("id").primaryKey().autoincrement(),
  stackId: int("stack_id").notNull(),
  toolId: int("tool_id").notNull(),
  toolRole: varchar("tool_role", { length: 100 }).notNull(), // script, image, video, voice, automation
  reasoning: text("reasoning"), // Why this tool was chosen
  isBackup: boolean("is_backup").default(false),
  addedAt: timestamp("added_at").defaultNow(),
});

export type StackTool = typeof stackTools.$inferSelect;
export type InsertStackTool = typeof stackTools.$inferInsert;

export const stackTemplates = mysqlTable("stack_templates", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  outputType: varchar("output_type", { length: 100 }).notNull(),
  toolsConfig: text("tools_config"), // JSON configuration
  createdAt: timestamp("created_at").defaultNow(),
});

export type StackTemplate = typeof stackTemplates.$inferSelect;
export type InsertStackTemplate = typeof stackTemplates.$inferInsert;

// ============================================================================
// MASTER PROMPT LIBRARY
// ============================================================================

export const promptLibrary = mysqlTable("prompt_library", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(), // innovation, ghostwriter, prompt_engineer, legal, custom
  systemPrompt: text("system_prompt").notNull(),
  userPromptTemplate: text("user_prompt_template"),
  variables: text("variables"), // JSON array of variable names
  description: text("description"),
  version: int("version").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type PromptLibrary = typeof promptLibrary.$inferSelect;
export type InsertPromptLibrary = typeof promptLibrary.$inferInsert;

export const promptExecutions = mysqlTable("prompt_executions", {
  id: int("id").primaryKey().autoincrement(),
  promptId: int("prompt_id").notNull(),
  userId: int("user_id").notNull(),
  input: text("input"), // User input
  output: text("output"), // AI response
  executedAt: timestamp("executed_at").defaultNow(),
  rating: int("rating"), // User rating of output (1-5)
});

export type PromptExecution = typeof promptExecutions.$inferSelect;
export type InsertPromptExecution = typeof promptExecutions.$inferInsert;


// ============================================================================
// TAX DOCUMENTS & OCR EXTRACTION
// ============================================================================

export const taxDocuments = mysqlTable("tax_documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(), // S3 URL
  fileKey: text("fileKey").notNull(), // S3 key
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  documentType: varchar("documentType", { length: 100 }).notNull(), // w2, 1099-int, 1099-div, k1, trust_instrument, etc.
  taxYear: int("taxYear"),
  status: mysqlEnum("status", ["uploaded", "processing", "extracted", "verified", "failed"]).default("uploaded").notNull(),
  ocrText: text("ocrText"), // Raw OCR extracted text
  extractedData: json("extractedData").$type<Record<string, any>>(), // Structured data extracted by LLM
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "flagged"]).default("pending"),
  verificationNotes: text("verificationNotes"),
  tags: json("tags").$type<string[]>(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  processedAt: timestamp("processedAt"),
});

export type TaxDocument = typeof taxDocuments.$inferSelect;
export type InsertTaxDocument = typeof taxDocuments.$inferInsert;

// W-2 specific data
export const w2Data = mysqlTable("w2_data", {
  id: int("id").autoincrement().primaryKey(),
  taxDocumentId: int("taxDocumentId").notNull().unique(),
  userId: int("userId").notNull(),
  taxYear: int("taxYear").notNull(),
  employerName: varchar("employerName", { length: 500 }),
  employerEIN: varchar("employerEIN", { length: 20 }),
  employeeSSN: varchar("employeeSSN", { length: 20 }),
  employeeName: varchar("employeeName", { length: 500 }),
  wages: int("wages"), // Box 1 - in cents
  federalTaxWithheld: int("federalTaxWithheld"), // Box 2 - in cents
  socialSecurityWages: int("socialSecurityWages"), // Box 3 - in cents
  socialSecurityTaxWithheld: int("socialSecurityTaxWithheld"), // Box 4 - in cents
  medicareWages: int("medicareWages"), // Box 5 - in cents
  medicareTaxWithheld: int("medicareTaxWithheld"), // Box 6 - in cents
  socialSecurityTips: int("socialSecurityTips"), // Box 7 - in cents
  allocatedTips: int("allocatedTips"), // Box 8 - in cents
  stateWages: int("stateWages"), // Box 16 - in cents
  stateTaxWithheld: int("stateTaxWithheld"), // Box 17 - in cents
  state: varchar("state", { length: 2 }),
  rawData: json("rawData").$type<Record<string, any>>(), // Full extracted data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type W2Data = typeof w2Data.$inferSelect;
export type InsertW2Data = typeof w2Data.$inferInsert;

// 1099 data (INT, DIV, B, R, etc.)
export const form1099Data = mysqlTable("form1099_data", {
  id: int("id").autoincrement().primaryKey(),
  taxDocumentId: int("taxDocumentId").notNull().unique(),
  userId: int("userId").notNull(),
  taxYear: int("taxYear").notNull(),
  formType: varchar("formType", { length: 20 }).notNull(), // 1099-INT, 1099-DIV, 1099-B, 1099-R, etc.
  payerName: varchar("payerName", { length: 500 }),
  payerEIN: varchar("payerEIN", { length: 20 }),
  recipientSSN: varchar("recipientSSN", { length: 20 }),
  recipientName: varchar("recipientName", { length: 500 }),
  // 1099-INT fields
  interestIncome: int("interestIncome"), // Box 1 - in cents
  earlyWithdrawalPenalty: int("earlyWithdrawalPenalty"), // Box 2 - in cents
  interestOnUSSavingsBonds: int("interestOnUSSavingsBonds"), // Box 3 - in cents
  federalTaxWithheld: int("federalTaxWithheld"), // Box 4 - in cents
  // 1099-DIV fields
  ordinaryDividends: int("ordinaryDividends"), // Box 1a - in cents
  qualifiedDividends: int("qualifiedDividends"), // Box 1b - in cents
  capitalGainDistributions: int("capitalGainDistributions"), // Box 2a - in cents
  // 1099-B fields
  proceedsFromBroker: int("proceedsFromBroker"), // Box 1d - in cents
  costBasis: int("costBasis"), // Box 1e - in cents
  // 1099-R fields
  grossDistribution: int("grossDistribution"), // Box 1 - in cents
  taxableAmount: int("taxableAmount"), // Box 2a - in cents
  distributionCode: varchar("distributionCode", { length: 10 }),
  rawData: json("rawData").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Form1099Data = typeof form1099Data.$inferSelect;
export type InsertForm1099Data = typeof form1099Data.$inferInsert;

// Schedule K-1 data (Form 1065 Partnership or Form 1041 Trust)
export const k1Data = mysqlTable("k1_data", {
  id: int("id").autoincrement().primaryKey(),
  taxDocumentId: int("taxDocumentId").notNull().unique(),
  userId: int("userId").notNull(),
  taxYear: int("taxYear").notNull(),
  formType: varchar("formType", { length: 20 }).notNull(), // 1065 (Partnership) or 1041 (Trust)
  entityName: varchar("entityName", { length: 500 }),
  entityEIN: varchar("entityEIN", { length: 20 }),
  partnerSSN: varchar("partnerSSN", { length: 20 }),
  partnerName: varchar("partnerName", { length: 500 }),
  ordinaryBusinessIncome: int("ordinaryBusinessIncome"), // Line 1 - in cents
  netRentalRealEstateIncome: int("netRentalRealEstateIncome"), // Line 2 - in cents
  otherNetRentalIncome: int("otherNetRentalIncome"), // Line 3 - in cents
  guaranteedPayments: int("guaranteedPayments"), // Line 4a - in cents
  interestIncome: int("interestIncome"), // Line 5 - in cents
  ordinaryDividends: int("ordinaryDividends"), // Line 6a - in cents
  qualifiedDividends: int("qualifiedDividends"), // Line 6b - in cents
  royalties: int("royalties"), // Line 7 - in cents
  netShortTermCapitalGain: int("netShortTermCapitalGain"), // Line 8 - in cents
  netLongTermCapitalGain: int("netLongTermCapitalGain"), // Line 9a - in cents
  collectiblesGain: int("collectiblesGain"), // Line 9b - in cents
  section1231Gain: int("section1231Gain"), // Line 10 - in cents
  otherIncome: int("otherIncome"), // Line 11 - in cents
  section179Deduction: int("section179Deduction"), // Line 12 - in cents
  otherDeductions: int("otherDeductions"), // Line 13 - in cents
  selfEmploymentEarnings: int("selfEmploymentEarnings"), // Line 14a - in cents
  rawData: json("rawData").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type K1Data = typeof k1Data.$inferSelect;
export type InsertK1Data = typeof k1Data.$inferInsert;

// Document verification audit trail
export const documentVerifications = mysqlTable("document_verifications", {
  id: int("id").autoincrement().primaryKey(),
  taxDocumentId: int("taxDocumentId").notNull(),
  verifiedBy: int("verifiedBy").notNull(), // userId
  verificationStatus: mysqlEnum("verificationStatus", ["verified", "flagged", "rejected"]).notNull(),
  notes: text("notes"),
  changesRequested: json("changesRequested").$type<Array<{
    field: string;
    oldValue: string;
    newValue: string;
    reason: string;
  }>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentVerification = typeof documentVerifications.$inferSelect;
export type InsertDocumentVerification = typeof documentVerifications.$inferInsert;


// ============================================================================
// TRUST ACCOUNTING LEDGER (Form 1041 Support)
// ============================================================================

// Trust accounts for fiduciary accounting
export const trustAccounts = mysqlTable("trust_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Fiduciary/trustee
  trustName: varchar("trustName", { length: 500 }).notNull(),
  ein: varchar("ein", { length: 20 }).notNull(), // XX-XXXXXXX format
  taxYear: int("taxYear").notNull(),
  trustType: mysqlEnum("trustType", [
    "simple",
    "complex",
    "grantor",
    "estate"
  ]).notNull(),
  fiscalYearEnd: varchar("fiscalYearEnd", { length: 10 }), // MM-DD format
  status: mysqlEnum("status", ["active", "terminated", "archived"]).default("active").notNull(),
  metadata: json("metadata").$type<{
    beneficiaries?: Array<{
      name: string;
      ssn?: string;
      relationship: string;
      distributionPercentage: number;
    }>;
    fiduciaries?: Array<{
      name: string;
      title: string;
      address: string;
    }>;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrustAccount = typeof trustAccounts.$inferSelect;
export type InsertTrustAccount = typeof trustAccounts.$inferInsert;

// Chart of accounts for trust accounting
export const ledgerAccounts = mysqlTable("ledger_accounts", {
  id: int("id").autoincrement().primaryKey(),
  trustAccountId: int("trustAccountId").notNull(),
  accountNumber: varchar("accountNumber", { length: 20 }).notNull(), // e.g., "1000", "2000"
  accountName: varchar("accountName", { length: 200 }).notNull(),
  accountType: mysqlEnum("accountType", [
    "asset",
    "liability",
    "equity",
    "income",
    "expense"
  ]).notNull(),
  accountCategory: varchar("accountCategory", { length: 100 }), // e.g., "Cash", "Investments", "Distributions"
  normalBalance: mysqlEnum("normalBalance", ["debit", "credit"]).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  parentAccountId: int("parentAccountId"), // For sub-accounts
  metadata: json("metadata").$type<{
    form1041Line?: string; // Maps to specific Form 1041 line
    taxTreatment?: "book" | "tax" | "both";
    description?: string;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LedgerAccount = typeof ledgerAccounts.$inferSelect;
export type InsertLedgerAccount = typeof ledgerAccounts.$inferInsert;

// Journal entries for dual-book accounting
export const journalEntries = mysqlTable("journal_entries", {
  id: int("id").autoincrement().primaryKey(),
  trustAccountId: int("trustAccountId").notNull(),
  entryNumber: varchar("entryNumber", { length: 50 }).notNull(), // e.g., "JE-2025-001"
  entryDate: timestamp("entryDate").notNull(),
  entryType: mysqlEnum("entryType", [
    "standard",
    "adjusting",
    "closing",
    "reversing"
  ]).default("standard").notNull(),
  basis: mysqlEnum("basis", ["book", "tax", "both"]).default("both").notNull(),
  description: text("description").notNull(),
  reference: varchar("reference", { length: 200 }), // Check number, invoice, etc.
  isPosted: boolean("isPosted").default(false).notNull(),
  postedBy: int("postedBy"), // userId
  postedAt: timestamp("postedAt"),
  metadata: json("metadata").$type<{
    attachments?: string[]; // S3 URLs
    tags?: string[];
    relatedDocumentId?: number;
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = typeof journalEntries.$inferInsert;

// Journal entry lines (debit/credit details)
export const journalEntryLines = mysqlTable("journal_entry_lines", {
  id: int("id").autoincrement().primaryKey(),
  journalEntryId: int("journalEntryId").notNull(),
  ledgerAccountId: int("ledgerAccountId").notNull(),
  lineType: mysqlEnum("lineType", ["debit", "credit"]).notNull(),
  amountInCents: int("amountInCents").notNull(), // Always positive, sign determined by lineType
  memo: text("memo"),
  metadata: json("metadata").$type<{
    beneficiaryAllocation?: {
      beneficiaryName: string;
      percentage: number;
      amountInCents: number;
    };
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type InsertJournalEntryLine = typeof journalEntryLines.$inferInsert;

// DNI (Distributable Net Income) calculations
export const dniCalculations = mysqlTable("dni_calculations", {
  id: int("id").autoincrement().primaryKey(),
  trustAccountId: int("trustAccountId").notNull(),
  taxYear: int("taxYear").notNull(),
  
  // Income components (in cents)
  interestIncome: int("interestIncome").default(0).notNull(),
  dividendIncome: int("dividendIncome").default(0).notNull(),
  capitalGains: int("capitalGains").default(0).notNull(),
  ordinaryIncome: int("ordinaryIncome").default(0).notNull(),
  otherIncome: int("otherIncome").default(0).notNull(),
  
  // Deductions (in cents)
  fiduciaryFees: int("fiduciaryFees").default(0).notNull(),
  accountingFees: int("accountingFees").default(0).notNull(),
  legalFees: int("legalFees").default(0).notNull(),
  otherDeductions: int("otherDeductions").default(0).notNull(),
  
  // Calculated DNI
  totalIncome: int("totalIncome").notNull(),
  totalDeductions: int("totalDeductions").notNull(),
  distributableNetIncome: int("distributableNetIncome").notNull(),
  
  // Distribution tracking
  actualDistributions: int("actualDistributions").default(0).notNull(),
  distributionDeduction: int("distributionDeduction").notNull(),
  
  // 65-day rule election
  has65DayElection: boolean("has65DayElection").default(false).notNull(),
  electionAmount: int("electionAmount").default(0).notNull(),
  
  calculationNotes: text("calculationNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DNICalculation = typeof dniCalculations.$inferSelect;
export type InsertDNICalculation = typeof dniCalculations.$inferInsert;


// ============================================================================
// AUDIT TRAIL
// ============================================================================

export const auditTrail = mysqlTable("audit_trail", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Event classification
  eventType: mysqlEnum("eventType", [
    "document_upload",
    "document_processing",
    "document_verification",
    "journal_entry_create",
    "journal_entry_update",
    "journal_entry_delete",
    "trust_account_create",
    "trust_account_update",
    "dni_calculation",
    "k1_generation",
    "form1041_generation",
    "efile_submission",
  ]).notNull(),
  
  // Event details
  entityType: varchar("entityType", { length: 100 }).notNull(), // e.g., "tax_document", "journal_entry"
  entityId: int("entityId").notNull(), // ID of the affected entity
  action: varchar("action", { length: 100 }).notNull(), // e.g., "create", "update", "delete", "approve"
  
  // Change tracking
  beforeData: json("beforeData"), // Previous state
  afterData: json("afterData"), // New state
  changes: json("changes"), // Specific fields that changed
  
  // Context
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  metadata: json("metadata"), // Additional context-specific data
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditTrailEntry = typeof auditTrail.$inferSelect;
export type InsertAuditTrailEntry = typeof auditTrail.$inferInsert;


// ============================================================================
// PAYMENT TRANSACTIONS (Tax Prep Fees)
// ============================================================================

export const paymentTransactions = mysqlTable("payment_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Beneficiary making payment
  trustAccountId: int("trustAccountId"), // Related trust account
  
  // Stripe integration
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }).notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  
  // Payment details
  amount: int("amount").notNull(), // in cents
  currency: varchar("currency", { length: 10 }).default("usd").notNull(),
  status: mysqlEnum("status", [
    "pending",
    "processing",
    "succeeded",
    "failed",
    "canceled",
    "refunded",
    "partially_refunded"
  ]).default("pending").notNull(),
  
  // Transaction metadata
  paymentMethod: varchar("paymentMethod", { length: 100 }), // card, bank_account, etc.
  description: text("description"),
  receiptUrl: text("receiptUrl"), // Stripe receipt URL
  receiptNumber: varchar("receiptNumber", { length: 100 }), // Generated receipt number
  
  // Tax prep service details
  serviceType: mysqlEnum("serviceType", [
    "k1_preparation",
    "form1041_filing",
    "tax_consultation",
    "audit_support",
    "full_service"
  ]).notNull(),
  taxYear: int("taxYear").notNull(),
  
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;


// ============================================================================
// CPA COLLABORATION & REVIEW
// ============================================================================

export const cpaReviews = mysqlTable("cpa_reviews", {
  id: int("id").autoincrement().primaryKey(),
  trustAccountId: int("trustAccountId").notNull(),
  submittedBy: int("submittedBy").notNull(), // User who submitted for review
  reviewedBy: int("reviewedBy"), // CPA user ID
  
  // Review status
  status: mysqlEnum("status", [
    "pending",
    "in_review",
    "changes_requested",
    "approved",
    "rejected"
  ]).default("pending").notNull(),
  
  // Review scope
  reviewType: mysqlEnum("reviewType", [
    "k1_review",
    "form1041_review",
    "full_return_review",
    "quarterly_review"
  ]).notNull(),
  taxYear: int("taxYear").notNull(),
  
  // Review details
  submissionNotes: text("submissionNotes"),
  reviewNotes: text("reviewNotes"),
  changesRequested: json("changesRequested").$type<Array<{
    field: string;
    issue: string;
    suggestion: string;
    priority: "low" | "medium" | "high";
  }>>(),
  
  // Approval workflow
  approvalSignature: text("approvalSignature"), // Digital signature data
  approvedAt: timestamp("approvedAt"),
  
  // Timestamps
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewStartedAt: timestamp("reviewStartedAt"),
  completedAt: timestamp("completedAt"),
  
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CPAReview = typeof cpaReviews.$inferSelect;
export type InsertCPAReview = typeof cpaReviews.$inferInsert;


// CPA review comments for real-time collaboration
export const cpaReviewComments = mysqlTable("cpa_review_comments", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull(),
  userId: int("userId").notNull(), // Commenter
  
  // Comment details
  commentText: text("commentText").notNull(),
  commentType: mysqlEnum("commentType", [
    "question",
    "suggestion",
    "issue",
    "approval",
    "general"
  ]).default("general").notNull(),
  
  // Reference to specific document/field
  referenceType: varchar("referenceType", { length: 100 }), // "journal_entry", "k1_line_item", etc.
  referenceId: int("referenceId"),
  
  // Thread support
  parentCommentId: int("parentCommentId"), // For nested replies
  
  // Status
  isResolved: boolean("isResolved").default(false).notNull(),
  resolvedBy: int("resolvedBy"),
  resolvedAt: timestamp("resolvedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CPAReviewComment = typeof cpaReviewComments.$inferSelect;
export type InsertCPAReviewComment = typeof cpaReviewComments.$inferInsert;


// ============================================================================
// IRS CREDENTIALS
// ============================================================================

export const irsCredentials = mysqlTable("irs_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Owner of the credentials
  
  // IRS MeF credentials
  transmitterControlCode: varchar("transmitterControlCode", { length: 100 }), // TCC
  electronicFilingIdentificationNumber: varchar("electronicFilingIdentificationNumber", { length: 100 }), // EFIN
  
  // Environment
  testMode: boolean("testMode").default(true).notNull(),
  
  // Credentials status
  isActive: boolean("isActive").default(true).notNull(),
  lastValidated: timestamp("lastValidated"),
  
  // Metadata
  metadata: json("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IrsCredentials = typeof irsCredentials.$inferSelect;
export type InsertIrsCredentials = typeof irsCredentials.$inferInsert;


// ============================================================================
// DISPUTES (Chargeback Management)
// ============================================================================

export const disputes = mysqlTable("disputes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  paymentTransactionId: int("paymentTransactionId"),
  stripeDisputeId: varchar("stripeDisputeId", { length: 255 }).notNull().unique(),
  amount: int("amount").notNull(), // Amount in cents
  currency: varchar("currency", { length: 10 }).default("usd").notNull(),
  status: mysqlEnum("status", [
    "warning_needs_response",
    "warning_under_review",
    "warning_closed",
    "needs_response",
    "under_review",
    "charge_refunded",
    "won",
    "lost"
  ]).default("needs_response").notNull(),
  reason: varchar("reason", { length: 100 }).notNull(), // fraudulent, duplicate, subscription_canceled, product_unacceptable, etc.
  evidenceDetails: json("evidenceDetails").$type<Record<string, any>>(),
  evidenceSubmitted: boolean("evidenceSubmitted").default(false).notNull(),
  evidenceDueBy: timestamp("evidenceDueBy"),
  isRefundable: boolean("isRefundable").default(false).notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = typeof disputes.$inferInsert;

// Dispute evidence uploads
export const disputeEvidence = mysqlTable("dispute_evidence", {
  id: int("id").autoincrement().primaryKey(),
  disputeId: int("disputeId").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 300 }).notNull(),
  fileType: varchar("fileType", { length: 100 }).notNull(), // customer_communication, receipt, shipping_documentation, etc.
  mimeType: varchar("mimeType", { length: 100 }),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type DisputeEvidence = typeof disputeEvidence.$inferSelect;
export type InsertDisputeEvidence = typeof disputeEvidence.$inferInsert;


// ============================================================================
// SUBSCRIPTION BILLING
// ============================================================================

export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }).notNull(),
  stripePriceId: varchar("stripePriceId", { length: 255 }).notNull(),
  plan: mysqlEnum("plan", ["monthly", "quarterly", "annual"]).notNull(),
  status: mysqlEnum("status", ["active", "canceled", "past_due", "unpaid", "trialing"]).default("active").notNull(),
  currentPeriodStart: timestamp("currentPeriodStart").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  canceledAt: timestamp("canceledAt"),
  trialStart: timestamp("trialStart"),
  trialEnd: timestamp("trialEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const subscriptionInvoices = mysqlTable("subscription_invoices", {
  id: int("id").autoincrement().primaryKey(),
  subscriptionId: int("subscriptionId").notNull(),
  stripeInvoiceId: varchar("stripeInvoiceId", { length: 255 }).notNull().unique(),
  amount: int("amount").notNull(), // in cents
  currency: varchar("currency", { length: 10 }).default("usd").notNull(),
  status: mysqlEnum("status", ["draft", "open", "paid", "void", "uncollectible"]).notNull(),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  paidAt: timestamp("paidAt"),
  dueDate: timestamp("dueDate"),
  attemptCount: int("attemptCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SubscriptionInvoice = typeof subscriptionInvoices.$inferSelect;
export type InsertSubscriptionInvoice = typeof subscriptionInvoices.$inferInsert;


// ============================================================================
// KILO CODE GOVERNANCE - RECEIPT LEDGER
// ============================================================================

export const receiptLedger = mysqlTable("receipt_ledger", {
  id: int("id").autoincrement().primaryKey(),
  receiptId: varchar("receiptId", { length: 36 }).notNull().unique(), // UUID
  
  // Receipt metadata
  timestamp: timestamp("timestamp").notNull(),
  action: varchar("action", { length: 255 }).notNull(), // e.g., "execute_scenario", "create_pr", "deploy_code"
  actor: varchar("actor", { length: 255 }).notNull(), // e.g., "agent:sintraprime-v2", "user:123"
  
  // Cryptographic verification
  evidenceHash: varchar("evidenceHash", { length: 64 }).notNull(), // SHA-256 hash
  signature: varchar("signature", { length: 255 }), // Ed25519 or HMAC-SHA256 signature
  
  // Outcome tracking
  outcome: mysqlEnum("outcome", ["success", "failure", "partial"]).notNull(),
  
  // Event details
  details: json("details").$type<Record<string, any>>().notNull(), // Full event data
  metadata: json("metadata").$type<Record<string, any>>(), // Additional context
  
  // Compliance fields
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]),
  requiresReview: boolean("requiresReview").default(false).notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: varchar("reviewedBy", { length: 255 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReceiptLedgerEntry = typeof receiptLedger.$inferSelect;
export type InsertReceiptLedgerEntry = typeof receiptLedger.$inferInsert;


// ============================================================================
// BENEFICIARY DISTRIBUTIONS
// ============================================================================

export const distributions = mysqlTable("distributions", {
  id: int("id").autoincrement().primaryKey(),
  beneficiaryId: int("beneficiaryId").notNull(),
  trustId: int("trustId").notNull(),
  
  // Distribution details
  amount: int("amount").notNull(), // Amount in cents
  distributionDate: timestamp("distributionDate").notNull(),
  distributionType: mysqlEnum("distributionType", [
    "income",
    "principal",
    "required_minimum",
    "discretionary"
  ]).notNull(),
  
  // Tax tracking
  taxYear: int("taxYear").notNull(),
  description: text("description"),
  
  // Audit trail
  performedBy: int("performedBy").notNull(), // User ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
});

export type Distribution = typeof distributions.$inferSelect;
export type InsertDistribution = typeof distributions.$inferInsert;


// ============================================================================
// NOTIFICATION SETTINGS
// ============================================================================

export const notificationSettings = mysqlTable("notification_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // One settings record per user
  
  // Slack configuration
  slackEnabled: boolean("slackEnabled").default(false).notNull(),
  slackWebhookUrl: text("slackWebhookUrl"),
  slackChannel: varchar("slackChannel", { length: 255 }),
  
  // Email configuration
  emailEnabled: boolean("emailEnabled").default(false).notNull(),
  emailRecipients: text("emailRecipients"), // Comma-separated emails
  
  // Event type toggles
  notifyHighSeverity: boolean("notifyHighSeverity").default(true).notNull(),
  notifyPolicyViolations: boolean("notifyPolicyViolations").default(true).notNull(),
  notifySpendingThresholds: boolean("notifySpendingThresholds").default(true).notNull(),
  notifyApprovalRequests: boolean("notifyApprovalRequests").default(true).notNull(),
  notifyComplianceIssues: boolean("notifyComplianceIssues").default(true).notNull(),
  
  // Threshold settings
  spendingThresholdPercent: int("spendingThresholdPercent").default(80).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
});

export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = typeof notificationSettings.$inferInsert;


// ============================================================================
// APPROVAL WORKFLOW
// ============================================================================

export const approvalRequests = mysqlTable("approval_requests", {
  id: int("id").autoincrement().primaryKey(),
  
  // Request details
  requestType: varchar("requestType", { length: 100 }).notNull(), // 'high_cost_action', 'policy_override', 'sensitive_operation'
  requestedBy: int("requestedBy").notNull(), // User ID
  action: text("action").notNull(), // Description of the action
  justification: text("justification").notNull(),
  
  // Cost and priority
  estimatedCost: int("estimatedCost"), // In cents
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  
  // Status and review
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"), // User ID
  reviewComment: text("reviewComment"),
  reviewedAt: timestamp("reviewedAt"),
  
  // Additional context
  metadata: json("metadata").$type<Record<string, any>>(), // Additional context
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
});

export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = typeof approvalRequests.$inferInsert;


// ============================================================================
// GOVERNANCE SETTINGS
// ============================================================================

export const governanceSettings = mysqlTable("governance_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Spending limits
  dailyLimit: decimal("dailyLimit", { precision: 10, scale: 2 }).notNull().default("1000.00"),
  weeklyLimit: decimal("weeklyLimit", { precision: 10, scale: 2 }).notNull().default("5000.00"),
  monthlyLimit: decimal("monthlyLimit", { precision: 10, scale: 2 }).notNull().default("20000.00"),
  
  // Approval settings
  approvalThreshold: decimal("approvalThreshold", { precision: 10, scale: 2 }).notNull().default("500.00"),
  
  // Feature toggles
  enableNotifications: boolean("enableNotifications").default(true).notNull(),
  enableAutoBlock: boolean("enableAutoBlock").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").onUpdateNow(),
});

export type GovernanceSettings = typeof governanceSettings.$inferSelect;
export type InsertGovernanceSettings = typeof governanceSettings.$inferInsert;

// ============================================================================
// ALERT CONFIGURATIONS & HISTORY
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
