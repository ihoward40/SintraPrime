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
// EVIDENCE
// ============================================================================

export const evidence = mysqlTable("evidence", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  evidenceType: varchar("evidenceType", { length: 100 }),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 300 }),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  sourceUrl: text("sourceUrl"),
  captureMethod: varchar("captureMethod", { length: 100 }),
  blockchainHash: varchar("blockchainHash", { length: 200 }),
  blockchainTimestamp: timestamp("blockchainTimestamp"),
  blockchainVerified: boolean("blockchainVerified").notNull().default(false),
  chainOfCustody: json("chainOfCustody"),
  tags: json("tags"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Evidence = typeof evidence.$inferSelect;
export type InsertEvidence = typeof evidence.$inferInsert;

// ============================================================================
// CASE EVENTS
// ============================================================================

export const caseEvents = mysqlTable("caseEvents", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  eventType: varchar("eventType", { length: 100 }),
  eventDate: timestamp("eventDate").notNull(),
  dueDate: timestamp("dueDate"),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completedAt"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  relatedDocumentId: int("relatedDocumentId"),
  relatedEvidenceId: int("relatedEvidenceId"),
  metadata: json("metadata"),
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
  noteType: varchar("noteType", { length: 100 }),
  isPinned: boolean("isPinned").notNull().default(false),
  tags: json("tags"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CaseNote = typeof caseNotes.$inferSelect;
export type InsertCaseNote = typeof caseNotes.$inferInsert;

// ============================================================================
// AI CHATS
// ============================================================================

export const aiChats = mysqlTable("aiChats", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  caseId: int("caseId"),
  sessionId: varchar("sessionId", { length: 100 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiChat = typeof aiChats.$inferSelect;
export type InsertAiChat = typeof aiChats.$inferInsert;

// ============================================================================
// COALITIONS
// ============================================================================

export const coalitions = mysqlTable("coalitions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 300 }).notNull(),
  description: text("description"),
  creatorId: int("creatorId").notNull(),
  isPublic: boolean("isPublic").notNull().default(false),
  memberCount: int("memberCount").notNull().default(1),
  tags: json("tags"),
  metadata: json("metadata"),
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
  role: mysqlEnum("role", ["owner", "admin", "member"]).notNull().default("member"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type CoalitionMember = typeof coalitionMembers.$inferSelect;
export type InsertCoalitionMember = typeof coalitionMembers.$inferInsert;

// ============================================================================
// LEGAL ALERTS
// ============================================================================

export const legalAlerts = mysqlTable("legalAlerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  caseId: int("caseId"),
  alertType: varchar("alertType", { length: 100 }).notNull(),
  jurisdiction: varchar("jurisdiction", { length: 100 }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  sourceUrl: text("sourceUrl"),
  relevanceScore: int("relevanceScore"),
  isRead: boolean("isRead").notNull().default(false),
  metadata: json("metadata"),
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
  front: mysqlEnum("front", ["legal", "regulatory", "technical", "information", "financial", "political", "unconventional"]).notNull(),
  description: text("description"),
  tactics: json("tactics"),
  status: mysqlEnum("status", ["planned", "active", "completed", "abandoned"]).notNull().default("planned"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WarfareStrategy = typeof warfareStrategies.$inferSelect;
export type InsertWarfareStrategy = typeof warfareStrategies.$inferInsert;

// ============================================================================
// BOOKMARKS
// ============================================================================

export const bookmarks = mysqlTable("bookmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  caseId: int("caseId"),
  url: text("url").notNull(),
  title: varchar("title", { length: 500 }),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  tags: json("tags"),
  screenshotUrl: text("screenshotUrl"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = typeof bookmarks.$inferInsert;

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  caseId: int("caseId"),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  message: text("message").notNull(),
  link: varchar("link", { length: 500 }),
  isRead: boolean("isRead").notNull().default(false),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============================================================================
// CASE EMAILS
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
  threadId: varchar("threadId", { length: 100 }),
  attachments: json("attachments"),
  isStarred: boolean("isStarred").notNull().default(false),
  isRead: boolean("isRead").notNull().default(true),
  sentAt: timestamp("sentAt"),
  receivedAt: timestamp("receivedAt"),
  metadata: json("metadata"),
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
  caseType: varchar("caseType", { length: 100 }).notNull(),
  jurisdiction: varchar("jurisdiction", { length: 100 }).notNull(),
  court: varchar("court", { length: 200 }),
  items: json("items"),
  progress: int("progress").notNull().default(0),
  status: mysqlEnum("status", ["draft", "in_progress", "completed"]).notNull().default("draft"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FilingChecklist = typeof filingChecklists.$inferSelect;
export type InsertFilingChecklist = typeof filingChecklists.$inferInsert;

// ============================================================================
// LEGAL RESEARCH
// ============================================================================

export const legalResearch = mysqlTable("legal_research", {
  id: int("id").autoincrement().primaryKey(),
  title: text("title").notNull(),
  category: mysqlEnum("category", ["federal_statute", "state_statute", "case_law", "regulation", "procedural_rule", "legal_guide", "form_template"]).notNull(),
  subcategory: varchar("subcategory", { length: 255 }),
  citation: varchar("citation", { length: 500 }),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  jurisdiction: varchar("jurisdiction", { length: 100 }),
  tags: json("tags"),
  sourceUrl: text("sourceUrl"),
  effectiveDate: varchar("effectiveDate", { length: 50 }),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LegalResearch = typeof legalResearch.$inferSelect;
export type InsertLegalResearch = typeof legalResearch.$inferInsert;

// ============================================================================
// RESEARCH BOOKMARKS
// ============================================================================

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
// DOCUMENT VERSIONS
// ============================================================================

export const documentVersions = mysqlTable("document_versions", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  userId: int("userId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  content: text("content").notNull(),
  changeSummary: varchar("changeSummary", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;

// ============================================================================
// CASE ACTIVITIES
// ============================================================================

export const caseActivities = mysqlTable("case_activities", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  userId: int("userId").notNull(),
  activityType: mysqlEnum("activityType", ["case_created", "case_updated", "status_changed", "document_added", "document_updated", "evidence_added", "note_added", "party_added", "strategy_added", "member_joined", "deadline_added"]).notNull(),
  description: text("description").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CaseActivity = typeof caseActivities.$inferSelect;
export type InsertCaseActivity = typeof caseActivities.$inferInsert;

// ============================================================================
// TERMINAL HISTORY
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

// ============================================================================
// WORKSPACES
// ============================================================================

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

// ============================================================================
// TEAM MEMBERS
// ============================================================================

export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "attorney", "paralegal", "client"]).notNull().default("client"),
  permissions: json("permissions"),
  invitedBy: int("invitedBy"),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// ============================================================================
// WORKSPACE CASES
// ============================================================================

export const workspaceCases = mysqlTable("workspace_cases", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  caseId: int("caseId").notNull(),
  addedBy: int("addedBy").notNull(),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type WorkspaceCase = typeof workspaceCases.$inferSelect;
export type InsertWorkspaceCase = typeof workspaceCases.$inferInsert;

// ============================================================================
// USER SETTINGS
// ============================================================================

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
// RESEARCH COLLECTIONS
// ============================================================================

export const researchCollections = mysqlTable("research_collections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  caseId: int("case_id"),
  isShared: boolean("is_shared").notNull().default(false),
  sharedWith: json("shared_with"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ResearchCollection = typeof researchCollections.$inferSelect;
export type InsertResearchCollection = typeof researchCollections.$inferInsert;

// ============================================================================
// RESEARCH DOCUMENTS
// ============================================================================

export const researchDocuments = mysqlTable("research_documents", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collection_id").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 50 }).notNull(),
  fileSize: int("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  extractedText: text("extracted_text"),
  summary: text("summary"),
  keyTopics: json("key_topics"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type ResearchDocument = typeof researchDocuments.$inferSelect;
export type InsertResearchDocument = typeof researchDocuments.$inferInsert;

// ============================================================================
// RESEARCH INSIGHTS
// ============================================================================

export const researchInsights = mysqlTable("research_insights", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collection_id").notNull(),
  insightType: mysqlEnum("insight_type", ["qa", "summary", "study_guide", "briefing", "faq", "timeline", "flashcard", "quiz"]).notNull(),
  question: text("question"),
  answer: text("answer").notNull(),
  citations: json("citations"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ResearchInsight = typeof researchInsights.$inferSelect;
export type InsertResearchInsight = typeof researchInsights.$inferInsert;

// ============================================================================
// RESEARCH AUDIO OVERVIEWS
// ============================================================================

export const researchAudioOverviews = mysqlTable("research_audio_overviews", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collection_id").notNull(),
  audioUrl: text("audio_url").notNull(),
  duration: int("duration"),
  transcript: text("transcript"),
  focusAreas: json("focus_areas"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export type ResearchAudioOverview = typeof researchAudioOverviews.$inferSelect;
export type InsertResearchAudioOverview = typeof researchAudioOverviews.$inferInsert;

// ============================================================================
// RESEARCH CITATIONS
// ============================================================================

export const researchCitations = mysqlTable("research_citations", {
  id: int("id").autoincrement().primaryKey(),
  collectionId: int("collection_id").notNull(),
  documentId: int("document_id").notNull(),
  citationText: text("citation_text").notNull(),
  pageNumber: int("page_number"),
  context: text("context"),
  usedInInsightId: int("used_in_insight_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ResearchCitation = typeof researchCitations.$inferSelect;
export type InsertResearchCitation = typeof researchCitations.$inferInsert;

// ============================================================================
// AI TOOLS
// ============================================================================

export const aiTools = mysqlTable("ai_tools", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  skillLevel: varchar("skill_level", { length: 50 }).notNull(),
  budgetTier: varchar("budget_tier", { length: 50 }).notNull(),
  reliabilityScore: int("reliability_score").default(0),
  officialDocs: text("official_docs"),
  pdfStored: boolean("pdf_stored").default(false),
  pdfPath: text("pdf_path"),
  notes: text("notes"),
  lastReviewed: timestamp("last_reviewed"),
  deprecated: boolean("deprecated").default(false),
  deprecationReason: text("deprecation_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type AITool = typeof aiTools.$inferSelect;
export type InsertAITool = typeof aiTools.$inferInsert;

// ============================================================================
// PROJECT STACKS
// ============================================================================

export const projectStacks = mysqlTable("project_stacks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  outputType: varchar("output_type", { length: 100 }).notNull(),
  budget: varchar("budget", { length: 50 }).notNull(),
  skillLevel: varchar("skill_level", { length: 50 }).notNull(),
  timeline: varchar("timeline", { length: 100 }),
  status: varchar("status", { length: 50 }).default("planning"),
  decisionNotes: text("decision_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type ProjectStack = typeof projectStacks.$inferSelect;
export type InsertProjectStack = typeof projectStacks.$inferInsert;

// ============================================================================
// STACK TOOLS
// ============================================================================

export const stackTools = mysqlTable("stack_tools", {
  id: int("id").autoincrement().primaryKey(),
  stackId: int("stack_id").notNull(),
  toolId: int("tool_id").notNull(),
  toolRole: varchar("tool_role", { length: 100 }).notNull(),
  reasoning: text("reasoning"),
  isBackup: boolean("is_backup").default(false),
  addedAt: timestamp("added_at").defaultNow(),
});

export type StackTool = typeof stackTools.$inferSelect;
export type InsertStackTool = typeof stackTools.$inferInsert;

// ============================================================================
// PROMPT LIBRARY
// ============================================================================

export const promptLibrary = mysqlTable("prompt_library", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  systemPrompt: text("system_prompt").notNull(),
  userPromptTemplate: text("user_prompt_template"),
  variables: text("variables"),
  description: text("description"),
  version: int("version").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type PromptLibrary = typeof promptLibrary.$inferSelect;
export type InsertPromptLibrary = typeof promptLibrary.$inferInsert;

// ============================================================================
// PROMPT EXECUTIONS
// ============================================================================

export const promptExecutions = mysqlTable("prompt_executions", {
  id: int("id").autoincrement().primaryKey(),
  promptId: int("prompt_id").notNull(),
  userId: int("user_id").notNull(),
  input: text("input"),
  output: text("output"),
  executedAt: timestamp("executed_at").defaultNow(),
  rating: int("rating"),
});

export type PromptExecution = typeof promptExecutions.$inferSelect;
export type InsertPromptExecution = typeof promptExecutions.$inferInsert;

// ============================================================================
// TOOL REVIEWS
// ============================================================================

export const toolReviews = mysqlTable("tool_reviews", {
  id: int("id").autoincrement().primaryKey(),
  toolId: int("tool_id").notNull(),
  userId: int("user_id").notNull(),
  rating: int("rating").notNull(),
  review: text("review"),
  dateReviewed: timestamp("date_reviewed").defaultNow(),
});

export type ToolReview = typeof toolReviews.$inferSelect;
export type InsertToolReview = typeof toolReviews.$inferInsert;

// ============================================================================
// REVIEW FLAGS
// ============================================================================

export const reviewFlags = mysqlTable("review_flags", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("review_id").notNull(),
  userId: int("user_id").notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).default("pending"),
  moderatorNote: text("moderator_note"),
  flaggedAt: timestamp("flagged_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export type ReviewFlag = typeof reviewFlags.$inferSelect;
export type InsertReviewFlag = typeof reviewFlags.$inferInsert;

// ============================================================================
// TAX DOCUMENTS
// ============================================================================

export const taxDocuments = mysqlTable("tax_documents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  documentType: varchar("documentType", { length: 100 }).notNull(),
  taxYear: int("taxYear"),
  status: mysqlEnum("status", ["uploaded", "processing", "extracted", "verified", "failed"]).notNull().default("uploaded"),
  ocrText: text("ocrText"),
  extractedData: json("extractedData"),
  verificationStatus: mysqlEnum("verificationStatus", ["pending", "verified", "flagged"]).default("pending"),
  verificationNotes: text("verificationNotes"),
  tags: json("tags"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  processedAt: timestamp("processedAt"),
});

export type TaxDocument = typeof taxDocuments.$inferSelect;
export type InsertTaxDocument = typeof taxDocuments.$inferInsert;

// ============================================================================
// W2 DATA
// ============================================================================

export const w2Data = mysqlTable("w2_data", {
  id: int("id").autoincrement().primaryKey(),
  taxDocumentId: int("taxDocumentId").notNull().unique(),
  userId: int("userId").notNull(),
  taxYear: int("taxYear").notNull(),
  employerName: varchar("employerName", { length: 500 }),
  employerEIN: varchar("employerEIN", { length: 20 }),
  employeeSSN: varchar("employeeSSN", { length: 20 }),
  employeeName: varchar("employeeName", { length: 500 }),
  wages: int("wages"),
  federalTaxWithheld: int("federalTaxWithheld"),
  socialSecurityWages: int("socialSecurityWages"),
  socialSecurityTaxWithheld: int("socialSecurityTaxWithheld"),
  medicareWages: int("medicareWages"),
  medicareTaxWithheld: int("medicareTaxWithheld"),
  socialSecurityTips: int("socialSecurityTips"),
  allocatedTips: int("allocatedTips"),
  stateWages: int("stateWages"),
  stateTaxWithheld: int("stateTaxWithheld"),
  state: varchar("state", { length: 2 }),
  rawData: json("rawData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type W2Data = typeof w2Data.$inferSelect;
export type InsertW2Data = typeof w2Data.$inferInsert;

// ============================================================================
// FORM 1099 DATA
// ============================================================================

export const form1099Data = mysqlTable("form1099_data", {
  id: int("id").autoincrement().primaryKey(),
  taxDocumentId: int("taxDocumentId").notNull().unique(),
  userId: int("userId").notNull(),
  taxYear: int("taxYear").notNull(),
  formType: varchar("formType", { length: 20 }).notNull(),
  payerName: varchar("payerName", { length: 500 }),
  payerEIN: varchar("payerEIN", { length: 20 }),
  recipientSSN: varchar("recipientSSN", { length: 20 }),
  recipientName: varchar("recipientName", { length: 500 }),
  interestIncome: int("interestIncome"),
  earlyWithdrawalPenalty: int("earlyWithdrawalPenalty"),
  interestOnUSSavingsBonds: int("interestOnUSSavingsBonds"),
  federalTaxWithheld: int("federalTaxWithheld"),
  ordinaryDividends: int("ordinaryDividends"),
  qualifiedDividends: int("qualifiedDividends"),
  capitalGainDistributions: int("capitalGainDistributions"),
  proceedsFromBroker: int("proceedsFromBroker"),
  costBasis: int("costBasis"),
  grossDistribution: int("grossDistribution"),
  taxableAmount: int("taxableAmount"),
  distributionCode: varchar("distributionCode", { length: 10 }),
  rawData: json("rawData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Form1099Data = typeof form1099Data.$inferSelect;
export type InsertForm1099Data = typeof form1099Data.$inferInsert;

// ============================================================================
// TRUST ACCOUNTS
// ============================================================================

export const trustAccounts = mysqlTable("trust_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  trustName: varchar("trustName", { length: 500 }).notNull(),
  ein: varchar("ein", { length: 20 }).notNull(),
  taxYear: int("taxYear").notNull(),
  trustType: mysqlEnum("trustType", ["simple", "complex", "grantor", "estate"]).notNull(),
  fiscalYearEnd: varchar("fiscalYearEnd", { length: 10 }),
  status: mysqlEnum("status", ["active", "terminated", "archived"]).notNull().default("active"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrustAccount = typeof trustAccounts.$inferSelect;
export type InsertTrustAccount = typeof trustAccounts.$inferInsert;

// ============================================================================
// LEDGER ACCOUNTS
// ============================================================================

export const ledgerAccounts = mysqlTable("ledger_accounts", {
  id: int("id").autoincrement().primaryKey(),
  trustAccountId: int("trustAccountId").notNull(),
  accountNumber: varchar("accountNumber", { length: 20 }).notNull(),
  accountName: varchar("accountName", { length: 200 }).notNull(),
  accountType: mysqlEnum("accountType", ["asset", "liability", "equity", "income", "expense"]).notNull(),
  accountCategory: varchar("accountCategory", { length: 100 }),
  normalBalance: mysqlEnum("normalBalance", ["debit", "credit"]).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  parentAccountId: int("parentAccountId"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LedgerAccount = typeof ledgerAccounts.$inferSelect;
export type InsertLedgerAccount = typeof ledgerAccounts.$inferInsert;

// ============================================================================
// JOURNAL ENTRIES
// ============================================================================

export const journalEntries = mysqlTable("journal_entries", {
  id: int("id").autoincrement().primaryKey(),
  trustAccountId: int("trustAccountId").notNull(),
  entryNumber: varchar("entryNumber", { length: 50 }).notNull(),
  entryDate: timestamp("entryDate").notNull(),
  entryType: mysqlEnum("entryType", ["standard", "adjusting", "closing", "reversing"]).notNull().default("standard"),
  basis: mysqlEnum("basis", ["book", "tax", "both"]).notNull().default("both"),
  description: text("description").notNull(),
  reference: varchar("reference", { length: 200 }),
  isPosted: boolean("isPosted").notNull().default(false),
  postedBy: int("postedBy"),
  postedAt: timestamp("postedAt"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = typeof journalEntries.$inferInsert;

// ============================================================================
// JOURNAL ENTRY LINES
// ============================================================================

export const journalEntryLines = mysqlTable("journal_entry_lines", {
  id: int("id").autoincrement().primaryKey(),
  journalEntryId: int("journalEntryId").notNull(),
  ledgerAccountId: int("ledgerAccountId").notNull(),
  lineType: mysqlEnum("lineType", ["debit", "credit"]).notNull(),
  amountInCents: int("amountInCents").notNull(),
  memo: text("memo"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type InsertJournalEntryLine = typeof journalEntryLines.$inferInsert;

// ============================================================================
// DNI CALCULATIONS
// ============================================================================

export const dniCalculations = mysqlTable("dni_calculations", {
  id: int("id").autoincrement().primaryKey(),
  trustAccountId: int("trustAccountId").notNull(),
  taxYear: int("taxYear").notNull(),
  interestIncome: int("interestIncome").notNull().default(0),
  dividendIncome: int("dividendIncome").notNull().default(0),
  capitalGains: int("capitalGains").notNull().default(0),
  ordinaryIncome: int("ordinaryIncome").notNull().default(0),
  otherIncome: int("otherIncome").notNull().default(0),
  fiduciaryFees: int("fiduciaryFees").notNull().default(0),
  accountingFees: int("accountingFees").notNull().default(0),
  legalFees: int("legalFees").notNull().default(0),
  otherDeductions: int("otherDeductions").notNull().default(0),
  totalIncome: int("totalIncome").notNull(),
  totalDeductions: int("totalDeductions").notNull(),
  distributableNetIncome: int("distributableNetIncome").notNull(),
  actualDistributions: int("actualDistributions").notNull().default(0),
  distributionDeduction: int("distributionDeduction").notNull(),
  has65DayElection: boolean("has65DayElection").notNull().default(false),
  electionAmount: int("electionAmount").notNull().default(0),
  calculationNotes: text("calculationNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DNICalculation = typeof dniCalculations.$inferSelect;
export type InsertDNICalculation = typeof dniCalculations.$inferInsert;

// ============================================================================
// K1 DATA
// ============================================================================

export const k1Data = mysqlTable("k1_data", {
  id: int("id").autoincrement().primaryKey(),
  taxDocumentId: int("taxDocumentId").notNull().unique(),
  userId: int("userId").notNull(),
  taxYear: int("taxYear").notNull(),
  formType: varchar("formType", { length: 20 }).notNull(),
  entityName: varchar("entityName", { length: 500 }),
  entityEIN: varchar("entityEIN", { length: 20 }),
  partnerSSN: varchar("partnerSSN", { length: 20 }),
  partnerName: varchar("partnerName", { length: 500 }),
  ordinaryBusinessIncome: int("ordinaryBusinessIncome"),
  netRentalRealEstateIncome: int("netRentalRealEstateIncome"),
  otherNetRentalIncome: int("otherNetRentalIncome"),
  guaranteedPayments: int("guaranteedPayments"),
  interestIncome: int("interestIncome"),
  ordinaryDividends: int("ordinaryDividends"),
  qualifiedDividends: int("qualifiedDividends"),
  royalties: int("royalties"),
  netShortTermCapitalGain: int("netShortTermCapitalGain"),
  netLongTermCapitalGain: int("netLongTermCapitalGain"),
  collectiblesGain: int("collectiblesGain"),
  section1231Gain: int("section1231Gain"),
  otherIncome: int("otherIncome"),
  section179Deduction: int("section179Deduction"),
  otherDeductions: int("otherDeductions"),
  selfEmploymentEarnings: int("selfEmploymentEarnings"),
  rawData: json("rawData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type K1Data = typeof k1Data.$inferSelect;
export type InsertK1Data = typeof k1Data.$inferInsert;

// ============================================================================
// DOCUMENT VERIFICATIONS
// ============================================================================

export const documentVerifications = mysqlTable("document_verifications", {
  id: int("id").autoincrement().primaryKey(),
  taxDocumentId: int("taxDocumentId").notNull(),
  verifiedBy: int("verifiedBy").notNull(),
  verificationStatus: mysqlEnum("verificationStatus", ["verified", "flagged", "rejected"]).notNull(),
  notes: text("notes"),
  changesRequested: json("changesRequested"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentVerification = typeof documentVerifications.$inferSelect;
export type InsertDocumentVerification = typeof documentVerifications.$inferInsert;

// ============================================================================
// PAYMENT TRANSACTIONS
// ============================================================================

export const paymentTransactions = mysqlTable("payment_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  trustAccountId: int("trustAccountId"),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }).notNull().unique(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("usd"),
  status: mysqlEnum("status", ["pending", "processing", "succeeded", "failed", "canceled", "refunded", "partially_refunded"]).notNull().default("pending"),
  paymentMethod: varchar("paymentMethod", { length: 100 }),
  description: text("description"),
  receiptUrl: text("receiptUrl"),
  receiptNumber: varchar("receiptNumber", { length: 100 }),
  serviceType: mysqlEnum("serviceType", ["k1_preparation", "form1041_filing", "tax_consultation", "audit_support", "full_service"]).notNull(),
  taxYear: int("taxYear").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = typeof paymentTransactions.$inferInsert;

// ============================================================================
// CPA REVIEWS
// ============================================================================

export const cpaReviews = mysqlTable("cpa_reviews", {
  id: int("id").autoincrement().primaryKey(),
  trustAccountId: int("trustAccountId").notNull(),
  submittedBy: int("submittedBy").notNull(),
  reviewedBy: int("reviewedBy"),
  status: mysqlEnum("status", ["pending", "in_review", "changes_requested", "approved", "rejected"]).notNull().default("pending"),
  reviewType: mysqlEnum("reviewType", ["k1_review", "form1041_review", "full_return_review", "quarterly_review"]).notNull(),
  taxYear: int("taxYear").notNull(),
  submissionNotes: text("submissionNotes"),
  reviewNotes: text("reviewNotes"),
  changesRequested: json("changesRequested"),
  approvalSignature: text("approvalSignature"),
  approvedAt: timestamp("approvedAt"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewStartedAt: timestamp("reviewStartedAt"),
  completedAt: timestamp("completedAt"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CPAReview = typeof cpaReviews.$inferSelect;
export type InsertCPAReview = typeof cpaReviews.$inferInsert;

// ============================================================================
// CPA REVIEW COMMENTS
// ============================================================================

export const cpaReviewComments = mysqlTable("cpa_review_comments", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("reviewId").notNull(),
  userId: int("userId").notNull(),
  commentText: text("commentText").notNull(),
  commentType: mysqlEnum("commentType", ["question", "suggestion", "issue", "approval", "general"]).notNull().default("general"),
  referenceType: varchar("referenceType", { length: 100 }),
  referenceId: int("referenceId"),
  parentCommentId: int("parentCommentId"),
  isResolved: boolean("isResolved").notNull().default(false),
  resolvedBy: int("resolvedBy"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CPAReviewComment = typeof cpaReviewComments.$inferSelect;
export type InsertCPAReviewComment = typeof cpaReviewComments.$inferInsert;

// ============================================================================
// DISPUTES
// ============================================================================

export const disputes = mysqlTable("disputes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  paymentTransactionId: int("paymentTransactionId"),
  stripeDisputeId: varchar("stripeDisputeId", { length: 255 }).notNull().unique(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("usd"),
  status: mysqlEnum("status", ["warning_needs_response", "warning_under_review", "warning_closed", "needs_response", "under_review", "charge_refunded", "won", "lost"]).notNull().default("needs_response"),
  reason: varchar("reason", { length: 100 }).notNull(),
  evidenceDetails: json("evidenceDetails"),
  evidenceSubmitted: boolean("evidenceSubmitted").notNull().default(false),
  evidenceDueBy: timestamp("evidenceDueBy"),
  isRefundable: boolean("isRefundable").notNull().default(false),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = typeof disputes.$inferInsert;

// ============================================================================
// DISPUTE EVIDENCE
// ============================================================================

export const disputeEvidence = mysqlTable("dispute_evidence", {
  id: int("id").autoincrement().primaryKey(),
  disputeId: int("disputeId").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileName: varchar("fileName", { length: 300 }).notNull(),
  fileType: varchar("fileType", { length: 100 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});

export type DisputeEvidence = typeof disputeEvidence.$inferSelect;
export type InsertDisputeEvidence = typeof disputeEvidence.$inferInsert;
