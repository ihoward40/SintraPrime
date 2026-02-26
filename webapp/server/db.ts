import { eq, desc, and, like, or, sql, gte, lte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  cases,
  Case,
  InsertCase,
  parties,
  Party,
  InsertParty,
  documents,
  Document,
  InsertDocument,
  evidence,
  Evidence,
  InsertEvidence,
  caseEvents,
  CaseEvent,
  InsertCaseEvent,
  caseNotes,
  CaseNote,
  InsertCaseNote,
  aiChats,
  AiChat,
  InsertAiChat,
  coalitions,
  Coalition,
  InsertCoalition,
  coalitionMembers,
  CoalitionMember,
  InsertCoalitionMember,
  legalAlerts,
  LegalAlert,
  InsertLegalAlert,
  warfareStrategies,
  WarfareStrategy,
  InsertWarfareStrategy,
  bookmarks,
  Bookmark,
  InsertBookmark,
  notifications,
  Notification,
  InsertNotification,
  caseEmails,
  CaseEmail,
  InsertCaseEmail,
  filingChecklists,
  FilingChecklist,
  InsertFilingChecklist,
  legalResearch,
  LegalResearch,
  InsertLegalResearch,
  researchBookmarks,
  ResearchBookmark,
  InsertResearchBookmark,
  documentVersions,
  DocumentVersion,
  InsertDocumentVersion,
  caseActivities,
  CaseActivity,
  InsertCaseActivity,
  terminalHistory,
  TerminalHistory,
  InsertTerminalHistory,
  workspaces,
  Workspace,
  InsertWorkspace,
  teamMembers,
  TeamMember,
  InsertTeamMember,
  workspaceCases,
  WorkspaceCase,
  InsertWorkspaceCase,
  userSettings,
  UserSetting,
  InsertUserSetting,
  agentMemory,
  AgentMemory,
  InsertAgentMemory,
  agentExecutions,
  AgentExecution,
  InsertAgentExecution,
  researchCollections,
  ResearchCollection,
  InsertResearchCollection,
  researchDocuments,
  ResearchDocument,
  InsertResearchDocument,
  researchInsights,
  ResearchInsight,
  InsertResearchInsight,
  researchAudioOverviews,
  ResearchAudioOverview,
  InsertResearchAudioOverview,
  researchCitations,
  ResearchCitation,
  InsertResearchCitation,
  aiTools,
  AITool,
  InsertAITool,
  projectStacks,
  ProjectStack,
  InsertProjectStack,
  stackTools,
  StackTool,
  InsertStackTool,
  promptLibrary,
  PromptLibrary,
  InsertPromptLibrary,
  promptExecutions,
  PromptExecution,
  InsertPromptExecution,
  toolReviews,
  ToolReview,
  InsertToolReview,
  reviewFlags,
  ReviewFlag,
  InsertReviewFlag,
  taxDocuments,
  TaxDocument,
  InsertTaxDocument,
  w2Data,
  W2Data,
  InsertW2Data,
  form1099Data,
  Form1099Data,
  InsertForm1099Data,
  trustAccounts,
  TrustAccount,
  InsertTrustAccount,
  ledgerAccounts,
  LedgerAccount,
  InsertLedgerAccount,
  journalEntries,
  JournalEntry,
  InsertJournalEntry,
  journalEntryLines,
  JournalEntryLine,
  InsertJournalEntryLine,
  dniCalculations,
  DNICalculation,
  InsertDNICalculation,
  k1Data,
  K1Data,
  InsertK1Data,
  documentVerifications,
  DocumentVerification,
  InsertDocumentVerification,
  paymentTransactions,
  PaymentTransaction,
  InsertPaymentTransaction,
  cpaReviews,
  CPAReview,
  InsertCPAReview,
  cpaReviewComments,
  CPAReviewComment,
  InsertCPAReviewComment,
  disputes,
  Dispute,
  InsertDispute,
  disputeEvidence,
  DisputeEvidence,
  InsertDisputeEvidence,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER FUNCTIONS
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// CASE FUNCTIONS
// ============================================================================

export async function createCase(caseData: InsertCase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(cases).values(caseData);
  return result;
}

export async function getCaseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
  return result[0];
}

export async function getCasesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(cases).where(eq(cases.userId, userId)).orderBy(desc(cases.updatedAt));
}

export async function updateCase(id: number, updates: Partial<InsertCase>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(cases).set(updates).where(eq(cases.id, id));
}

export async function deleteCase(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(cases).where(eq(cases.id, id));
}

// ============================================================================
// PARTY FUNCTIONS
// ============================================================================

export async function createParty(partyData: InsertParty) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(parties).values(partyData);
}

export async function getPartiesByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(parties).where(eq(parties.caseId, caseId));
}

export async function updateParty(id: number, updates: Partial<InsertParty>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(parties).set(updates).where(eq(parties.id, id));
}

export async function deleteParty(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(parties).where(eq(parties.id, id));
}

// ============================================================================
// DOCUMENT FUNCTIONS
// ============================================================================

export async function createDocument(docData: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(documents).values(docData);
  const insertId = (result as any).lastInsertRowid || (result as any).insertId;
  if (insertId) {
    return await getDocumentById(Number(insertId));
  }
  return result;
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result[0];
}

export async function getDocumentsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(documents).where(eq(documents.caseId, caseId)).orderBy(desc(documents.updatedAt));
}

export async function getDocumentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.updatedAt));
}

export async function getTemplates(category?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (category) {
    return await db.select().from(documents)
      .where(and(eq(documents.isTemplate, true), eq(documents.templateCategory, category)))
      .orderBy(desc(documents.updatedAt));
  }
  
  return await db.select().from(documents).where(eq(documents.isTemplate, true)).orderBy(desc(documents.updatedAt));
}

export async function updateDocument(id: number, updates: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(documents).set(updates).where(eq(documents.id, id));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(documents).where(eq(documents.id, id));
}

// ============================================================================
// EVIDENCE FUNCTIONS
// ============================================================================

export async function createEvidence(evidenceData: InsertEvidence) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(evidence).values(evidenceData);
}

export async function getEvidenceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(evidence).where(eq(evidence.id, id)).limit(1);
  return result[0];
}

export async function getEvidenceByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(evidence).where(eq(evidence.caseId, caseId)).orderBy(desc(evidence.createdAt));
}

export async function getEvidenceByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(evidence).where(eq(evidence.userId, userId)).orderBy(desc(evidence.createdAt));
}

export async function updateEvidence(id: number, updates: Partial<InsertEvidence>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(evidence).set(updates).where(eq(evidence.id, id));
}

export async function deleteEvidence(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(evidence).where(eq(evidence.id, id));
}

// ============================================================================
// CASE EVENT FUNCTIONS
// ============================================================================

export async function createCaseEvent(eventData: InsertCaseEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(caseEvents).values(eventData);
}

export async function getCaseEventsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(caseEvents).where(eq(caseEvents.caseId, caseId)).orderBy(desc(caseEvents.eventDate));
}

export async function updateCaseEvent(id: number, updates: Partial<InsertCaseEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(caseEvents).set(updates).where(eq(caseEvents.id, id));
}

export async function deleteCaseEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(caseEvents).where(eq(caseEvents.id, id));
}

// ============================================================================
// CASE NOTE FUNCTIONS
// ============================================================================

export async function createCaseNote(noteData: InsertCaseNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(caseNotes).values(noteData);
}

export async function getCaseNotesByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(caseNotes).where(eq(caseNotes.caseId, caseId)).orderBy(desc(caseNotes.createdAt));
}

export async function updateCaseNote(id: number, updates: Partial<InsertCaseNote>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(caseNotes).set(updates).where(eq(caseNotes.id, id));
}

export async function deleteCaseNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(caseNotes).where(eq(caseNotes.id, id));
}

// ============================================================================
// AI CHAT FUNCTIONS
// ============================================================================

export async function createAiChat(chatData: InsertAiChat) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(aiChats).values(chatData);
}

export async function getAiChatsBySessionId(sessionId: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(aiChats).where(eq(aiChats.sessionId, sessionId)).orderBy(aiChats.createdAt);
}

export async function getAiChatsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(aiChats).where(eq(aiChats.caseId, caseId)).orderBy(desc(aiChats.createdAt));
}

// ============================================================================
// COALITION FUNCTIONS
// ============================================================================

export async function createCoalition(coalitionData: InsertCoalition) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(coalitions).values(coalitionData);
}

export async function getCoalitionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(coalitions).where(eq(coalitions.id, id)).limit(1);
  return result[0];
}

export async function getCoalitionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get coalitions where user is a member
  const memberCoalitions = await db
    .select({ coalition: coalitions })
    .from(coalitionMembers)
    .innerJoin(coalitions, eq(coalitionMembers.coalitionId, coalitions.id))
    .where(eq(coalitionMembers.userId, userId));
  
  return memberCoalitions.map(mc => mc.coalition);
}

export async function updateCoalition(id: number, updates: Partial<InsertCoalition>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(coalitions).set(updates).where(eq(coalitions.id, id));
}

export async function deleteCoalition(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(coalitions).where(eq(coalitions.id, id));
}

// ============================================================================
// COALITION MEMBER FUNCTIONS
// ============================================================================

export async function addCoalitionMember(memberData: InsertCoalitionMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(coalitionMembers).values(memberData);
}

export async function getCoalitionMembers(coalitionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Join with users table to get member details
  const members = await db
    .select({
      member: coalitionMembers,
      user: users,
    })
    .from(coalitionMembers)
    .innerJoin(users, eq(coalitionMembers.userId, users.id))
    .where(eq(coalitionMembers.coalitionId, coalitionId));
  
  return members;
}

export async function removeCoalitionMember(coalitionId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(coalitionMembers)
    .where(and(eq(coalitionMembers.coalitionId, coalitionId), eq(coalitionMembers.userId, userId)));
}

// ============================================================================
// LEGAL ALERT FUNCTIONS
// ============================================================================

export async function createLegalAlert(alertData: InsertLegalAlert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(legalAlerts).values(alertData);
}

export async function getLegalAlertsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(legalAlerts).where(eq(legalAlerts.userId, userId)).orderBy(desc(legalAlerts.createdAt));
}

export async function getLegalAlertsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(legalAlerts).where(eq(legalAlerts.caseId, caseId)).orderBy(desc(legalAlerts.createdAt));
}

export async function markAlertAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(legalAlerts).set({ isRead: true }).where(eq(legalAlerts.id, id));
}

// ============================================================================
// WARFARE STRATEGY FUNCTIONS
// ============================================================================

export async function createWarfareStrategy(strategyData: InsertWarfareStrategy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(warfareStrategies).values(strategyData);
}

export async function getWarfareStrategiesByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(warfareStrategies).where(eq(warfareStrategies.caseId, caseId)).orderBy(desc(warfareStrategies.updatedAt));
}

export async function updateWarfareStrategy(id: number, updates: Partial<InsertWarfareStrategy>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(warfareStrategies).set(updates).where(eq(warfareStrategies.id, id));
}

export async function deleteWarfareStrategy(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(warfareStrategies).where(eq(warfareStrategies.id, id));
}

// ============================================================================
// BOOKMARK FUNCTIONS
// ============================================================================

export async function createBookmark(bookmarkData: InsertBookmark) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(bookmarks).values(bookmarkData);
}

export async function getBookmarksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(bookmarks).where(eq(bookmarks.userId, userId)).orderBy(desc(bookmarks.createdAt));
}

export async function getBookmarksByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(bookmarks).where(eq(bookmarks.caseId, caseId)).orderBy(desc(bookmarks.createdAt));
}

export async function deleteBookmark(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(bookmarks).where(eq(bookmarks.id, id));
}


// ============================================================================
// TIER ENFORCEMENT HELPERS
// ============================================================================

export async function countUserCases(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` }).from(cases).where(eq(cases.userId, userId));
  return result[0]?.count ?? 0;
}

export async function countUserAiMessagesToday(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(aiChats)
    .where(
      and(
        eq(aiChats.userId, userId),
        eq(aiChats.role, "user"),
        gte(aiChats.createdAt, todayStart)
      )
    );
  return result[0]?.count ?? 0;
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0] ?? null;
}


export async function updateUserOnboardingComplete(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(users).set({ onboardingComplete: true }).where(eq(users.id, userId));
}


// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

export async function createNotification(data: {
  userId: number;
  caseId?: number;
  type: string;
  title: string;
  message: string;
  link?: string;
  priority?: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(notifications).values(data);
}

export async function getNotificationsByUserId(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count ?? 0;
}

export async function markNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
}

export async function deleteNotification(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

// ============================================================================
// ANALYTICS HELPER FUNCTIONS
// ============================================================================

export async function getCaseAnalytics(userId: number) {
  const db = await getDb();
  if (!db) return { statusCounts: [], typeCounts: [], priorityCounts: [], totalCases: 0, recentActivity: [] };

  const userCases = await db.select().from(cases).where(eq(cases.userId, userId));
  
  // Status distribution
  const statusMap: Record<string, number> = {};
  const typeMap: Record<string, number> = {};
  const priorityMap: Record<string, number> = {};
  
  for (const c of userCases) {
    statusMap[c.status] = (statusMap[c.status] || 0) + 1;
    if (c.caseType) typeMap[c.caseType] = (typeMap[c.caseType] || 0) + 1;
    if (c.priority) priorityMap[c.priority] = (priorityMap[c.priority] || 0) + 1;
  }

  const statusCounts = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
  const typeCounts = Object.entries(typeMap).map(([type, count]) => ({ type, count }));
  const priorityCounts = Object.entries(priorityMap).map(([priority, count]) => ({ priority, count }));

  // Recent activity (last 30 events)
  const recentActivity = await db.select().from(caseEvents)
    .where(eq(caseEvents.userId, userId))
    .orderBy(desc(caseEvents.createdAt))
    .limit(30);

  return {
    statusCounts,
    typeCounts,
    priorityCounts,
    totalCases: userCases.length,
    activeCases: userCases.filter(c => c.status === "active").length,
    wonCases: userCases.filter(c => c.status === "won").length,
    lostCases: userCases.filter(c => c.status === "lost").length,
    settledCases: userCases.filter(c => c.status === "settled").length,
    recentActivity,
  };
}

// ============================================================================
// GLOBAL SEARCH
// ============================================================================

export async function globalSearch(userId: number, query: string) {
  const db = await getDb();
  if (!db) return { cases: [], documents: [], evidence: [], notes: [] };
  const searchTerm = `%${query}%`;

  const [matchedCases, matchedDocs, matchedEvidence, matchedNotes] = await Promise.all([
    db.select().from(cases)
      .where(and(eq(cases.userId, userId), or(like(cases.title, searchTerm), like(cases.description, searchTerm), like(cases.caseNumber, searchTerm))))
      .limit(10),
    db.select().from(documents)
      .where(and(eq(documents.userId, userId), or(like(documents.title, searchTerm), like(documents.description, searchTerm), like(documents.content, searchTerm))))
      .limit(10),
    db.select().from(evidence)
      .where(and(eq(evidence.userId, userId), or(like(evidence.title, searchTerm), like(evidence.description, searchTerm))))
      .limit(10),
    db.select().from(caseNotes)
      .where(and(eq(caseNotes.userId, userId), like(caseNotes.content, searchTerm)))
      .limit(10),
  ]);

  return {
    cases: matchedCases,
    documents: matchedDocs,
    evidence: matchedEvidence,
    notes: matchedNotes,
  };
}

// ============================================================================
// CASE EMAILS
// ============================================================================

export async function createCaseEmail(data: InsertCaseEmail) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(caseEmails).values(data);
  return { id: result.insertId, ...data };
}

export async function getCaseEmailsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(caseEmails)
    .where(eq(caseEmails.caseId, caseId))
    .orderBy(desc(caseEmails.createdAt));
}

export async function getCaseEmailById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [email] = await db.select().from(caseEmails).where(eq(caseEmails.id, id));
  return email || null;
}

export async function toggleEmailStar(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const email = await getCaseEmailById(id);
  if (!email) throw new Error("Email not found");
  await db.update(caseEmails).set({ isStarred: !email.isStarred }).where(eq(caseEmails.id, id));
  return { ...email, isStarred: !email.isStarred };
}

export async function deleteCaseEmail(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(caseEmails).where(eq(caseEmails.id, id));
}

// ============================================================================
// FILING CHECKLISTS
// ============================================================================

export async function createFilingChecklist(data: InsertFilingChecklist) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(filingChecklists).values(data);
  return { id: result.insertId, ...data };
}

export async function getFilingChecklistsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(filingChecklists)
    .where(eq(filingChecklists.userId, userId))
    .orderBy(desc(filingChecklists.createdAt));
}

export async function getFilingChecklistById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [checklist] = await db.select().from(filingChecklists).where(eq(filingChecklists.id, id));
  return checklist || null;
}

export async function updateFilingChecklist(id: number, data: Partial<InsertFilingChecklist>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(filingChecklists).set(data).where(eq(filingChecklists.id, id));
  return getFilingChecklistById(id);
}

export async function deleteFilingChecklist(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(filingChecklists).where(eq(filingChecklists.id, id));
}


// ============================================================================
// LEGAL RESEARCH LIBRARY FUNCTIONS
// ============================================================================

export async function getAllLegalResearch() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(legalResearch).where(eq(legalResearch.isActive, true)).orderBy(legalResearch.title);
}

export async function getLegalResearchById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(legalResearch).where(eq(legalResearch.id, id));
  return rows[0] || null;
}

export async function searchLegalResearch(query: string, category?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(legalResearch.isActive, true), like(legalResearch.title, `%${query}%`)];
  if (category) conditions.push(eq(legalResearch.category, category as any));
  return db.select().from(legalResearch).where(and(...conditions)).orderBy(legalResearch.title);
}

export async function createLegalResearch(data: InsertLegalResearch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(legalResearch).values(data);
  return { id: result.insertId, ...data };
}

// ============================================================================
// RESEARCH BOOKMARK FUNCTIONS
// ============================================================================

export async function getResearchBookmarksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(researchBookmarks).where(eq(researchBookmarks.userId, userId)).orderBy(researchBookmarks.createdAt);
}

export async function createResearchBookmark(data: InsertResearchBookmark) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(researchBookmarks).values(data);
  return { id: result.insertId, ...data };
}

export async function deleteResearchBookmark(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(researchBookmarks).where(eq(researchBookmarks.id, id));
}

// ============================================================================
// CASE EXPORT HELPERS
// ============================================================================

export async function getFullCaseData(caseId: number) {
  const db = await getDb();
  if (!db) return null;
  const [caseData] = await db.select().from(cases).where(eq(cases.id, caseId));
  if (!caseData) return null;
  const caseParties = await db.select().from(parties).where(eq(parties.caseId, caseId));
  const caseDocs = await db.select().from(documents).where(eq(documents.caseId, caseId));
  const caseEvidence = await db.select().from(evidence).where(eq(evidence.caseId, caseId));
  const caseTimeline = await db.select().from(caseEvents).where(eq(caseEvents.caseId, caseId)).orderBy(caseEvents.eventDate);
  const caseNotesList = await db.select().from(caseNotes).where(eq(caseNotes.caseId, caseId));
  const caseStrategies = await db.select().from(warfareStrategies).where(eq(warfareStrategies.caseId, caseId));
  return {
    case: caseData,
    parties: caseParties,
    documents: caseDocs,
    evidence: caseEvidence,
    timeline: caseTimeline,
    notes: caseNotesList,
    strategies: caseStrategies,
  };
}


// ============================================================================
// DOCUMENT VERSION HISTORY
// ============================================================================

export async function createDocumentVersion(data: InsertDocumentVersion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documentVersions).values(data);
  const insertId = (result as any).lastInsertRowid || (result as any).insertId;
  if (insertId) {
    return await getDocumentVersionById(Number(insertId));
  }
  return data;
}

export async function getDocumentVersions(documentId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documentVersions).where(eq(documentVersions.documentId, documentId)).orderBy(desc(documentVersions.versionNumber));
}

export async function getDocumentVersionById(versionId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(documentVersions).where(eq(documentVersions.id, versionId)).limit(1);
  return result[0] || null;
}

// ============================================================================
// CASE ACTIVITY FEED
// ============================================================================

export async function createCaseActivity(data: InsertCaseActivity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(caseActivities).values(data);
  return true;
}

export async function getCaseActivities(caseId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(caseActivities).where(eq(caseActivities.caseId, caseId)).orderBy(desc(caseActivities.createdAt)).limit(limit);
}

export async function getCaseActivitiesByType(caseId: number, activityType: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(caseActivities).where(
    and(
      eq(caseActivities.caseId, caseId),
      eq(caseActivities.activityType, activityType as any)
    )
  ).orderBy(desc(caseActivities.createdAt));
}

// ============================================================================
// TERMINAL COMMAND HISTORY
// ============================================================================

export async function saveTerminalCommand(data: InsertTerminalHistory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(terminalHistory).values(data);
  return true;
}

export async function getTerminalHistory(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(terminalHistory).where(eq(terminalHistory.userId, userId)).orderBy(desc(terminalHistory.executedAt)).limit(limit);
}

export async function searchTerminalHistory(userId: number, searchTerm: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(terminalHistory).where(
    and(
      eq(terminalHistory.userId, userId),
      sql`${terminalHistory.command} LIKE ${`%${searchTerm}%`}`
    )
  ).orderBy(desc(terminalHistory.executedAt)).limit(limit);
}

export async function clearTerminalHistory(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(terminalHistory).where(eq(terminalHistory.userId, userId));
  return true;
}

// ============================================================================
// WORKSPACE FUNCTIONS
// ============================================================================

export async function createWorkspace(workspace: InsertWorkspace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(workspaces).values(workspace);
  return true;
}

export async function getWorkspacesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get workspaces where user is owner or member
  const userWorkspaces = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      description: workspaces.description,
      ownerId: workspaces.ownerId,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
      memberRole: teamMembers.role,
    })
    .from(workspaces)
    .leftJoin(teamMembers, and(
      eq(workspaces.id, teamMembers.workspaceId),
      eq(teamMembers.userId, userId)
    ))
    .where(or(eq(workspaces.ownerId, userId), eq(teamMembers.userId, userId)));
  
  // Get member counts for each workspace
  const results = await Promise.all(
    userWorkspaces.map(async (workspace) => {
      const members = await db
        .select({ count: sql<number>`count(*)` })
        .from(teamMembers)
        .where(eq(teamMembers.workspaceId, workspace.id));
      
      const memberCount = Number(members[0]?.count || 0) + 1; // +1 for owner
      const role = workspace.ownerId === userId ? "owner" : (workspace.memberRole || "member");
      
      return {
        id: workspace.id.toString(),
        name: workspace.name,
        description: workspace.description,
        ownerId: workspace.ownerId,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
        role,
        memberCount,
      };
    })
  );
  
  return results;
}

export async function getWorkspaceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(workspaces).where(eq(workspaces.id, id));
  return result[0] || null;
}

export async function updateWorkspace(id: number, workspace: Partial<InsertWorkspace>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workspaces).set(workspace).where(eq(workspaces.id, id));
  return true;
}

export async function deleteWorkspace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(workspaces).where(eq(workspaces.id, id));
  return true;
}

// ============================================================================
// TEAM MEMBER FUNCTIONS
// ============================================================================

export async function addTeamMember(member: InsertTeamMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(teamMembers).values(member);
  return true;
}

export async function getTeamMembersByWorkspaceId(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: teamMembers.id,
      workspaceId: teamMembers.workspaceId,
      userId: teamMembers.userId,
      role: teamMembers.role,
      permissions: teamMembers.permissions,
      joinedAt: teamMembers.joinedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.workspaceId, workspaceId));
}

export async function updateTeamMemberRole(id: number, role: string, permissions?: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(teamMembers)
    .set({ role: role as any, permissions })
    .where(eq(teamMembers.id, id));
  return true;
}

export async function removeTeamMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(teamMembers).where(eq(teamMembers.id, id));
  return true;
}

// ============================================================================
// WORKSPACE CASE FUNCTIONS
// ============================================================================

export async function addCaseToWorkspace(workspaceCase: InsertWorkspaceCase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(workspaceCases).values(workspaceCase);
  return true;
}

export async function getWorkspaceCases(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: workspaceCases.id,
      workspaceId: workspaceCases.workspaceId,
      caseId: workspaceCases.caseId,
      addedBy: workspaceCases.addedBy,
      addedAt: workspaceCases.addedAt,
      case: cases,
    })
    .from(workspaceCases)
    .leftJoin(cases, eq(workspaceCases.caseId, cases.id))
    .where(eq(workspaceCases.workspaceId, workspaceId));
}

export async function removeCaseFromWorkspace(workspaceId: number, caseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(workspaceCases)
    .where(and(eq(workspaceCases.workspaceId, workspaceId), eq(workspaceCases.caseId, caseId)));
  return true;
}

// ============================================================================
// USER SETTINGS FUNCTIONS
// ============================================================================

export async function saveUserSetting(
  userId: number,
  key: string,
  value: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Check if setting exists
  const existing = await db
    .select()
    .from(userSettings)
    .where(and(eq(userSettings.userId, userId), eq(userSettings.settingKey, key)))
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db
      .update(userSettings)
      .set({ settingValue: value, updatedAt: new Date() })
      .where(and(eq(userSettings.userId, userId), eq(userSettings.settingKey, key)));
  } else {
    // Insert new
    await db.insert(userSettings).values({
      userId,
      settingKey: key,
      settingValue: value,
    });
  }
}

export async function getUserSettings(userId: number): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};

  const settings = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));

  const result: Record<string, string> = {};
  for (const setting of settings) {
    result[setting.settingKey] = setting.settingValue || "";
  }

  return result;
}

export async function getUserSetting(userId: number, key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const setting = await db
    .select()
    .from(userSettings)
    .where(and(eq(userSettings.userId, userId), eq(userSettings.settingKey, key)))
    .limit(1);

  return setting[0]?.settingValue || null;
}

export async function deleteUserSetting(userId: number, key: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .delete(userSettings)
    .where(and(eq(userSettings.userId, userId), eq(userSettings.settingKey, key)));
}


// ============================================================================
// AGENT ZERO 2.0 - MEMORY & LEARNING
// ============================================================================

export async function insertAgentMemory(data: {
  userId: number;
  sessionId: string;
  key: string;
  value: string;
}): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;

  await dbConn.insert(agentMemory).values({
    ...data,
    createdAt: new Date(),
  });
}

export async function getAgentMemory(key: string): Promise<any[]> {
  const dbConn = await getDb();
  if (!dbConn) return [];

  return await dbConn
    .select()
    .from(agentMemory)
    .where(eq(agentMemory.key, key))
    .orderBy(desc(agentMemory.createdAt))
    .limit(1);
}

export async function insertAgentExecution(data: {
  userId: number;
  sessionId: string;
  taskType?: string;
  approach?: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "blocked";
  duration?: number;
  cost?: number;
}): Promise<void> {
  const dbConn = await getDb();
  if (!dbConn) return;

  await dbConn.insert(agentExecutions).values({
    ...data,
    createdAt: new Date(),
  });
}

export async function getAgentExecutions(userId: number, limit: number = 100): Promise<any[]> {
  const dbConn = await getDb();
  if (!dbConn) return [];

  return await dbConn
    .select()
    .from(agentExecutions)
    .where(eq(agentExecutions.userId, userId))
    .orderBy(desc(agentExecutions.createdAt))
    .limit(limit);
}


// ============================================================================
// NOTEBOOKLM RESEARCH HELPERS
// ============================================================================

export async function getResearchCollectionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(researchCollections).where(eq(researchCollections.userId, userId)).orderBy(desc(researchCollections.updatedAt));
}

export async function getResearchCollectionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(researchCollections).where(eq(researchCollections.id, id)).limit(1);
  return result[0];
}

export async function createResearchCollection(data: InsertResearchCollection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(researchCollections).values(data);
  return await getResearchCollectionById(Number(result[0].insertId));
}

export async function updateResearchCollection(id: number, data: Partial<InsertResearchCollection>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(researchCollections).set(data).where(eq(researchCollections.id, id));
  return await getResearchCollectionById(id);
}

export async function deleteResearchCollection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete related data first
  await db.delete(researchDocuments).where(eq(researchDocuments.collectionId, id));
  await db.delete(researchInsights).where(eq(researchInsights.collectionId, id));
  await db.delete(researchAudioOverviews).where(eq(researchAudioOverviews.collectionId, id));
  await db.delete(researchCitations).where(eq(researchCitations.collectionId, id));
  
  await db.delete(researchCollections).where(eq(researchCollections.id, id));
  return { success: true };
}

export async function getResearchDocumentsByCollectionId(collectionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(researchDocuments).where(eq(researchDocuments.collectionId, collectionId)).orderBy(desc(researchDocuments.uploadedAt));
}

export async function getResearchDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(researchDocuments).where(eq(researchDocuments.id, id)).limit(1);
  return result[0];
}

export async function createResearchDocument(data: InsertResearchDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(researchDocuments).values(data);
  return await getResearchDocumentById(Number(result[0].insertId));
}

export async function deleteResearchDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(researchDocuments).where(eq(researchDocuments.id, id));
  return { success: true };
}

export async function createResearchInsight(data: InsertResearchInsight) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(researchInsights).values(data);
  return await getResearchInsightById(Number(result[0].insertId));
}

export async function getResearchInsightById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(researchInsights).where(eq(researchInsights.id, id)).limit(1);
  return result[0];
}

export async function getResearchInsightsByCollectionId(collectionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(researchInsights).where(eq(researchInsights.collectionId, collectionId)).orderBy(desc(researchInsights.createdAt));
}

export async function createResearchAudioOverview(data: InsertResearchAudioOverview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(researchAudioOverviews).values(data);
  const insertId = Number(result[0].insertId);
  const overview = await db.select().from(researchAudioOverviews).where(eq(researchAudioOverviews.id, insertId)).limit(1);
  return overview[0];
}

export async function getResearchAudioOverviewsByCollectionId(collectionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(researchAudioOverviews).where(eq(researchAudioOverviews.collectionId, collectionId)).orderBy(desc(researchAudioOverviews.generatedAt));
}


// ============================================================================
// INTELLIGENCE DATABASE HELPERS
// ============================================================================

export async function getAllAITools() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(aiTools).where(eq(aiTools.deprecated, false)).orderBy(desc(aiTools.reliabilityScore));
}

export async function getAIToolById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(aiTools).where(eq(aiTools.id, id)).limit(1);
  return result[0];
}

export async function searchAITools(filters: {
  category?: string;
  skillLevel?: string;
  budgetTier?: string;
  minReliability?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(aiTools).where(eq(aiTools.deprecated, false));
  
  // Apply filters (simplified - in production use proper query building)
  const results = await query;
  
  return results.filter(tool => {
    if (filters.category && tool.category !== filters.category) return false;
    if (filters.skillLevel && tool.skillLevel !== filters.skillLevel) return false;
    if (filters.budgetTier && tool.budgetTier !== filters.budgetTier) return false;
    if (filters.minReliability && (tool.reliabilityScore || 0) < filters.minReliability) return false;
    return true;
  });
}

export async function createAITool(data: InsertAITool) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(aiTools).values(data);
  return await getAIToolById(Number(result[0].insertId));
}

export async function updateAITool(id: number, data: Partial<InsertAITool>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(aiTools).set(data).where(eq(aiTools.id, id));
  return await getAIToolById(id);
}

export async function deleteAITool(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(aiTools).where(eq(aiTools.id, id));
  return { success: true };
}

// ============================================================================
// TOOL REVIEWS HELPERS
// ============================================================================

export async function createToolReview(data: InsertToolReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(toolReviews).values(data);
  return await getToolReviewById(Number(result[0].insertId));
}

export async function getToolReviewById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(toolReviews).where(eq(toolReviews.id, id)).limit(1);
  return result[0];
}

export async function getToolReviewsByToolId(toolId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(toolReviews).where(eq(toolReviews.toolId, toolId)).orderBy(desc(toolReviews.dateReviewed));
}

export async function getToolReviewsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(toolReviews).where(eq(toolReviews.userId, userId)).orderBy(desc(toolReviews.dateReviewed));
}

export async function deleteToolReview(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(toolReviews).where(eq(toolReviews.id, id));
  return { success: true };
}

// ============================================================================
// REVIEW MODERATION HELPERS
// ============================================================================

export async function createReviewFlag(data: { reviewId: number; flaggedBy: number; reason: string; status: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(reviewFlags).values({
    reviewId: data.reviewId,
    userId: data.flaggedBy,
    reason: data.reason,
    status: data.status,
  });
  return { success: true };
}

export async function getFlaggedReviews() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(reviewFlags).where(eq(reviewFlags.status, "pending")).orderBy(desc(reviewFlags.flaggedAt));
}

export async function getReviewFlagById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(reviewFlags).where(eq(reviewFlags.id, id)).limit(1);
  return result[0] || null;
}

export async function updateReviewFlag(id: number, data: Partial<{ status: string; moderatedBy: number; moderatorNotes: string | undefined; moderatedAt: Date }>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reviewFlags).set(data).where(eq(reviewFlags.id, id));
  return { id, ...data };
}

// ============================================================================
// STACK BUILDER HELPERS
// ============================================================================

export async function getProjectStacksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projectStacks).where(eq(projectStacks.userId, userId)).orderBy(desc(projectStacks.updatedAt));
}

export async function getProjectStackById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projectStacks).where(eq(projectStacks.id, id)).limit(1);
  return result[0];
}

export async function createProjectStack(data: InsertProjectStack) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projectStacks).values(data);
  return await getProjectStackById(Number(result[0].insertId));
}

export async function updateProjectStack(id: number, data: Partial<InsertProjectStack>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectStacks).set(data).where(eq(projectStacks.id, id));
  return await getProjectStackById(id);
}

export async function deleteProjectStack(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(stackTools).where(eq(stackTools.stackId, id));
  await db.delete(projectStacks).where(eq(projectStacks.id, id));
  return { success: true };
}

export async function getStackToolsByStackId(stackId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(stackTools).where(eq(stackTools.stackId, stackId));
}

export async function addToolToStack(data: InsertStackTool) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(stackTools).values(data);
  return result;
}

// ============================================================================
// PROMPT LIBRARY HELPERS
// ============================================================================

export async function getAllPrompts() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(promptLibrary).where(eq(promptLibrary.isActive, true)).orderBy(desc(promptLibrary.createdAt));
}

export async function getPromptById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(promptLibrary).where(eq(promptLibrary.id, id)).limit(1);
  return result[0];
}

export async function getPromptsByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(promptLibrary).where(eq(promptLibrary.category, category)).orderBy(desc(promptLibrary.createdAt));
}

export async function createPrompt(data: InsertPromptLibrary) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(promptLibrary).values(data);
  return await getPromptById(Number(result[0].insertId));
}

export async function createPromptExecution(data: InsertPromptExecution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(promptExecutions).values(data);
  return result;
}


// ============================================================================
// TAX DOCUMENT HELPERS
// ============================================================================

export async function createTaxDocument(data: InsertTaxDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(taxDocuments).values(data);
  return await getTaxDocumentById(Number(result[0].insertId));
}

export async function getTaxDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(taxDocuments).where(eq(taxDocuments.id, id)).limit(1);
  return result[0];
}

export async function updateTaxDocument(id: number, data: Partial<InsertTaxDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(taxDocuments).set(data).where(eq(taxDocuments.id, id));
  return await getTaxDocumentById(id);
}

export async function getUserTaxDocuments(
  userId: number,
  filters?: {
    taxYear?: number;
    documentType?: string;
    status?: "uploaded" | "processing" | "extracted" | "verified" | "failed";
  }
) {
  const db = await getDb();
  if (!db) return [];

  // Build conditions array
  const conditions = [eq(taxDocuments.userId, userId)];
  
  if (filters?.taxYear) {
    conditions.push(eq(taxDocuments.taxYear, filters.taxYear));
  }
  if (filters?.documentType) {
    conditions.push(eq(taxDocuments.documentType, filters.documentType));
  }
  if (filters?.status) {
    conditions.push(eq(taxDocuments.status, filters.status));
  }

  return await db
    .select()
    .from(taxDocuments)
    .where(and(...conditions))
    .orderBy(desc(taxDocuments.createdAt));
}

// ============================================================================
// W-2 DATA HELPERS
// ============================================================================

export async function createW2Data(data: InsertW2Data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(w2Data).values(data);
  return await getW2DataById(Number(result[0].insertId));
}

export async function getW2DataById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(w2Data).where(eq(w2Data.id, id)).limit(1);
  return result[0];
}

export async function getW2DataByDocumentId(taxDocumentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(w2Data)
    .where(eq(w2Data.taxDocumentId, taxDocumentId))
    .limit(1);
  return result[0];
}

export async function getUserW2Data(userId: number, taxYear?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(w2Data.userId, userId)];
  if (taxYear) {
    conditions.push(eq(w2Data.taxYear, taxYear));
  }

  return await db
    .select()
    .from(w2Data)
    .where(and(...conditions))
    .orderBy(desc(w2Data.createdAt));
}

// ============================================================================
// 1099 DATA HELPERS
// ============================================================================

export async function create1099Data(data: InsertForm1099Data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(form1099Data).values(data);
  return await get1099DataById(Number(result[0].insertId));
}

export async function get1099DataById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(form1099Data).where(eq(form1099Data.id, id)).limit(1);
  return result[0];
}

export async function get1099DataByDocumentId(taxDocumentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(form1099Data)
    .where(eq(form1099Data.taxDocumentId, taxDocumentId))
    .limit(1);
  return result[0];
}

export async function getUser1099Data(userId: number, taxYear?: number, formType?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(form1099Data.userId, userId)];
  if (taxYear) {
    conditions.push(eq(form1099Data.taxYear, taxYear));
  }
  if (formType) {
    conditions.push(eq(form1099Data.formType, formType));
  }

  return await db
    .select()
    .from(form1099Data)
    .where(and(...conditions))
    .orderBy(desc(form1099Data.createdAt));
}

// ============================================================================
// K-1 DATA HELPERS
// ============================================================================

export async function createK1Data(data: InsertK1Data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(k1Data).values(data);
  return await getK1DataById(Number(result[0].insertId));
}

export async function getK1DataById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(k1Data).where(eq(k1Data.id, id)).limit(1);
  return result[0];
}

export async function getK1DataByDocumentId(taxDocumentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(k1Data)
    .where(eq(k1Data.taxDocumentId, taxDocumentId))
    .limit(1);
  return result[0];
}

export async function getUserK1Data(userId: number, taxYear?: number, formType?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(k1Data.userId, userId)];
  if (taxYear) {
    conditions.push(eq(k1Data.taxYear, taxYear));
  }
  if (formType) {
    conditions.push(eq(k1Data.formType, formType));
  }

  return await db
    .select()
    .from(k1Data)
    .where(and(...conditions))
    .orderBy(desc(k1Data.createdAt));
}

// ============================================================================
// DOCUMENT VERIFICATION HELPERS
// ============================================================================

export async function createDocumentVerification(data: InsertDocumentVerification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documentVerifications).values(data);
  return result;
}

export async function getDocumentVerifications(taxDocumentId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(documentVerifications)
    .where(eq(documentVerifications.taxDocumentId, taxDocumentId))
    .orderBy(desc(documentVerifications.createdAt));
}


// ============================================================================
// TAX DOCUMENT DELETE FUNCTIONS
// ============================================================================

export async function deleteTaxDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(taxDocuments).where(eq(taxDocuments.id, id));
}


// ============================================================================
// TRUST ACCOUNTING FUNCTIONS
// ============================================================================

export async function createTrustAccount(data: InsertTrustAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(trustAccounts).values(data);
  return await getTrustAccountById(Number(result[0].insertId));
}

export async function getTrustAccountById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(trustAccounts).where(eq(trustAccounts.id, id)).limit(1);
  return result[0];
}

export async function getTrustAccountsByUserId(userId: number, taxYear?: number, status?: "active" | "terminated" | "archived") {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(trustAccounts.userId, userId)];
  if (taxYear) {
    conditions.push(eq(trustAccounts.taxYear, taxYear));
  }
  if (status) {
    conditions.push(eq(trustAccounts.status, status));
  }

  return await db
    .select()
    .from(trustAccounts)
    .where(and(...conditions))
    .orderBy(desc(trustAccounts.createdAt));
}

// Create default chart of accounts for a trust
export async function createDefaultChartOfAccounts(trustAccountId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const defaultAccounts = [
    // Assets
    { accountNumber: "1000", accountName: "Cash - Operating", accountType: "asset", normalBalance: "debit", accountCategory: "Cash" },
    { accountNumber: "1100", accountName: "Cash - Investment", accountType: "asset", normalBalance: "debit", accountCategory: "Cash" },
    { accountNumber: "1200", accountName: "Marketable Securities", accountType: "asset", normalBalance: "debit", accountCategory: "Investments" },
    { accountNumber: "1300", accountName: "Real Estate", accountType: "asset", normalBalance: "debit", accountCategory: "Investments" },
    { accountNumber: "1400", accountName: "Other Assets", accountType: "asset", normalBalance: "debit", accountCategory: "Other" },
    
    // Liabilities
    { accountNumber: "2000", accountName: "Accounts Payable", accountType: "liability", normalBalance: "credit", accountCategory: "Current Liabilities" },
    { accountNumber: "2100", accountName: "Taxes Payable", accountType: "liability", normalBalance: "credit", accountCategory: "Taxes" },
    
    // Equity
    { accountNumber: "3000", accountName: "Principal (Corpus)", accountType: "equity", normalBalance: "credit", accountCategory: "Trust Principal" },
    { accountNumber: "3100", accountName: "Undistributed Income", accountType: "equity", normalBalance: "credit", accountCategory: "Income" },
    
    // Income
    { accountNumber: "4000", accountName: "Interest Income", accountType: "income", normalBalance: "credit", accountCategory: "Investment Income" },
    { accountNumber: "4100", accountName: "Dividend Income", accountType: "income", normalBalance: "credit", accountCategory: "Investment Income" },
    { accountNumber: "4200", accountName: "Capital Gains", accountType: "income", normalBalance: "credit", accountCategory: "Investment Income" },
    { accountNumber: "4300", accountName: "Rental Income", accountType: "income", normalBalance: "credit", accountCategory: "Rental" },
    { accountNumber: "4900", accountName: "Other Income", accountType: "income", normalBalance: "credit", accountCategory: "Other" },
    
    // Expenses
    { accountNumber: "5000", accountName: "Fiduciary Fees", accountType: "expense", normalBalance: "debit", accountCategory: "Administrative" },
    { accountNumber: "5100", accountName: "Accounting Fees", accountType: "expense", normalBalance: "debit", accountCategory: "Professional Fees" },
    { accountNumber: "5200", accountName: "Legal Fees", accountType: "expense", normalBalance: "debit", accountCategory: "Professional Fees" },
    { accountNumber: "5300", accountName: "Investment Advisory Fees", accountType: "expense", normalBalance: "debit", accountCategory: "Investment" },
    { accountNumber: "5400", accountName: "Tax Preparation Fees", accountType: "expense", normalBalance: "debit", accountCategory: "Professional Fees" },
    { accountNumber: "5500", accountName: "Distributions to Beneficiaries", accountType: "expense", normalBalance: "debit", accountCategory: "Distributions" },
    { accountNumber: "5900", accountName: "Other Expenses", accountType: "expense", normalBalance: "debit", accountCategory: "Other" },
  ];

  for (const account of defaultAccounts) {
    await db.insert(ledgerAccounts).values({
      trustAccountId,
      ...account,
    } as any);
  }

  return true;
}

export async function getLedgerAccountsByTrustId(trustAccountId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(ledgerAccounts)
    .where(eq(ledgerAccounts.trustAccountId, trustAccountId))
    .orderBy(ledgerAccounts.accountNumber);
}

export async function createJournalEntry(data: InsertJournalEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(journalEntries).values(data);
  return await getJournalEntryById(Number(result[0].insertId));
}

export async function getJournalEntryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(journalEntries).where(eq(journalEntries.id, id)).limit(1);
  return result[0];
}

export async function getJournalEntryCountByTrustId(trustAccountId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(journalEntries).where(eq(journalEntries.trustAccountId, trustAccountId));
  return result.length;
}

export async function getJournalEntriesByTrustId(
  trustAccountId: number,
  startDate?: Date,
  endDate?: Date,
  isPosted?: boolean
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(journalEntries.trustAccountId, trustAccountId)];
  
  if (startDate) {
    conditions.push(gte(journalEntries.entryDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(journalEntries.entryDate, endDate));
  }
  if (isPosted !== undefined) {
    conditions.push(eq(journalEntries.isPosted, isPosted));
  }

  return await db
    .select()
    .from(journalEntries)
    .where(and(...conditions))
    .orderBy(desc(journalEntries.entryDate));
}

export async function createJournalEntryLine(data: InsertJournalEntryLine) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(journalEntryLines).values(data);
  return true;
}

export async function getJournalEntryLinesByEntryId(journalEntryId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(journalEntryLines)
    .where(eq(journalEntryLines.journalEntryId, journalEntryId));
}

export async function calculateTrialBalance(
  trustAccountId: number,
  asOfDate: Date,
  basis: "book" | "tax" | "both"
) {
  const db = await getDb();
  if (!db) return [];

  // Get all accounts
  const accounts = await getLedgerAccountsByTrustId(trustAccountId);

  // Get all posted journal entries up to asOfDate
  const entries = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.trustAccountId, trustAccountId),
        eq(journalEntries.isPosted, true),
        lte(journalEntries.entryDate, asOfDate),
        basis === "both" ? undefined : eq(journalEntries.basis, basis)
      )
    );

  const entryIds = entries.map(e => e.id);
  if (entryIds.length === 0) {
    return accounts.map(account => ({
      ...account,
      debitBalance: 0,
      creditBalance: 0,
      netBalance: 0,
    }));
  }

  // Get all lines for those entries
  const lines = await db
    .select()
    .from(journalEntryLines)
    .where(inArray(journalEntryLines.journalEntryId, entryIds));

  // Calculate balances for each account
  const balances = accounts.map(account => {
    const accountLines = lines.filter(l => l.ledgerAccountId === account.id);
    const totalDebits = accountLines
      .filter(l => l.lineType === "debit")
      .reduce((sum, l) => sum + l.amountInCents, 0);
    const totalCredits = accountLines
      .filter(l => l.lineType === "credit")
      .reduce((sum, l) => sum + l.amountInCents, 0);

    let netBalance = 0;
    if (account.normalBalance === "debit") {
      netBalance = totalDebits - totalCredits;
    } else {
      netBalance = totalCredits - totalDebits;
    }

    return {
      ...account,
      debitBalance: totalDebits,
      creditBalance: totalCredits,
      netBalance,
    };
  });

  return balances;
}

export async function createDNICalculation(data: InsertDNICalculation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dniCalculations).values(data);
  return await getDNICalculationById(Number(result[0].insertId));
}

export async function getDNICalculationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dniCalculations).where(eq(dniCalculations.id, id)).limit(1);
  return result[0];
}

export async function getDNICalculationsByTrustId(trustAccountId: number, taxYear?: number) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(dniCalculations.trustAccountId, trustAccountId)];
  if (taxYear) {
    conditions.push(eq(dniCalculations.taxYear, taxYear));
  }

  return await db
    .select()
    .from(dniCalculations)
    .where(and(...conditions))
    .orderBy(desc(dniCalculations.createdAt));
}


// ============================================================================
// PAYMENT TRANSACTIONS
// ============================================================================

export async function createPaymentTransaction(data: InsertPaymentTransaction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(paymentTransactions).values(data);
  return await getPaymentTransactionById(Number(result[0].insertId));
}

export async function getPaymentTransactionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id)).limit(1);
  return result[0];
}

export async function getPaymentTransactionByStripeId(stripePaymentIntentId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.stripePaymentIntentId, stripePaymentIntentId))
    .limit(1);
  return result[0];
}

export async function getUserPaymentTransactions(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.userId, userId))
    .orderBy(desc(paymentTransactions.createdAt))
    .limit(limit);
}

export async function getTrustPaymentTransactions(trustAccountId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.trustAccountId, trustAccountId))
    .orderBy(desc(paymentTransactions.createdAt));
}

export async function updatePaymentTransaction(id: number, data: Partial<InsertPaymentTransaction>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(paymentTransactions).set(data).where(eq(paymentTransactions.id, id));
  return await getPaymentTransactionById(id);
}


// ============================================================================
// CPA REVIEWS
// ============================================================================

export async function createCPAReview(data: InsertCPAReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cpaReviews).values(data);
  return await getCPAReviewById(Number(result[0].insertId));
}

export async function getCPAReviewById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cpaReviews).where(eq(cpaReviews.id, id)).limit(1);
  return result[0];
}

export async function getTrustCPAReviews(trustAccountId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(cpaReviews)
    .where(eq(cpaReviews.trustAccountId, trustAccountId))
    .orderBy(desc(cpaReviews.createdAt));
}

export async function getCPAReviewsByStatus(status: "pending" | "in_review" | "changes_requested" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(cpaReviews)
    .where(eq(cpaReviews.status, status))
    .orderBy(desc(cpaReviews.createdAt));
}

export async function updateCPAReview(id: number, data: Partial<InsertCPAReview>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cpaReviews).set(data).where(eq(cpaReviews.id, id));
  return await getCPAReviewById(id);
}


// ============================================================================
// CPA REVIEW COMMENTS
// ============================================================================

export async function createCPAReviewComment(data: InsertCPAReviewComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cpaReviewComments).values(data);
  return await getCPAReviewCommentById(Number(result[0].insertId));
}

export async function getCPAReviewCommentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cpaReviewComments).where(eq(cpaReviewComments.id, id)).limit(1);
  return result[0];
}

export async function getReviewComments(reviewId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(cpaReviewComments)
    .where(eq(cpaReviewComments.reviewId, reviewId))
    .orderBy(cpaReviewComments.createdAt);
}

export async function updateCPAReviewComment(id: number, data: Partial<InsertCPAReviewComment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cpaReviewComments).set(data).where(eq(cpaReviewComments.id, id));
  return await getCPAReviewCommentById(id);
}

export async function deleteCPAReviewComment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cpaReviewComments).where(eq(cpaReviewComments.id, id));
}


// ============================================================================
// DISPUTES
// ============================================================================

export async function createDispute(data: InsertDispute) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(disputes).values(data);
  return await getDisputeById(Number(result[0].insertId));
}

export async function getDisputeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(disputes).where(eq(disputes.id, id)).limit(1);
  return result[0];
}

export async function getUserDisputes(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(disputes)
    .where(eq(disputes.userId, userId))
    .orderBy(desc(disputes.createdAt));
}

export async function updateDispute(id: number, data: Partial<InsertDispute>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(disputes).set(data).where(eq(disputes.id, id));
  return await getDisputeById(id);
}

// ============================================================================
// DISPUTE EVIDENCE
// ============================================================================

export async function createDisputeEvidence(data: InsertDisputeEvidence) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(disputeEvidence).values(data);
  return await getDisputeEvidenceById(Number(result[0].insertId));
}

export async function getDisputeEvidenceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(disputeEvidence).where(eq(disputeEvidence.id, id)).limit(1);
  return result[0];
}

export async function getDisputeEvidence(disputeId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(disputeEvidence)
    .where(eq(disputeEvidence.disputeId, disputeId))
    .orderBy(disputeEvidence.uploadedAt);
}

// ============================================================================
// AUTONOMOUS TASKS
// ============================================================================

export async function createAutonomousTask(data: {
  userId: string;
  title: string;
  description?: string;
  objective?: string;
  priority?: "low" | "medium" | "high" | "critical";
  status?: "pending" | "running" | "completed" | "failed" | "queued";
  context?: string;
  assignedAgentId?: string;
  executionPlan?: any;
  result?: any;
  aiTokensUsed?: number;
  executionTimeMs?: number;
  startedAt?: Date;
  completedAt?: Date;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db.execute(
      sql`INSERT INTO autonomous_tasks (
        user_id, title, description, objective, priority, status, context,
        assigned_agent_id, execution_plan, result, ai_tokens_used, execution_time_ms,
        started_at, completed_at, tags, created_at, updated_at
      ) VALUES (
        ${data.userId}, ${data.title}, ${data.description || null}, ${data.objective || null},
        ${data.priority || "medium"}, ${data.status || "pending"}, ${data.context || null},
        ${data.assignedAgentId || null}, ${data.executionPlan ? JSON.stringify(data.executionPlan) : null},
        ${data.result ? JSON.stringify(data.result) : null}, ${data.aiTokensUsed || null},
        ${data.executionTimeMs || null}, ${data.startedAt || null}, ${data.completedAt || null},
        ${data.tags ? JSON.stringify(data.tags) : null}, ${new Date()}, ${new Date()}
      )`
    );
    const id = (result[0] as any).insertId;
    return await getAutonomousTaskById(Number(id));
  } catch (error) {
    console.error("Error creating autonomous task:", error);
    throw error;
  }
}

export async function getAutonomousTaskById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  try {
    const result = await db.execute(
      sql`SELECT * FROM autonomous_tasks WHERE id = ${id} LIMIT 1`
    );

    if ((result as any).rows && (result as any).rows.length > 0) {
      const row = (result as any).rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        description: row.description,
        objective: row.objective,
        priority: row.priority,
        status: row.status,
        context: row.context,
        assignedAgentId: row.assigned_agent_id,
        executionPlan: row.execution_plan ? JSON.parse(row.execution_plan) : null,
        result: row.result ? JSON.parse(row.result) : null,
        aiTokensUsed: row.ai_tokens_used,
        executionTimeMs: row.execution_time_ms,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        tags: row.tags ? JSON.parse(row.tags) : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
    return undefined;
  } catch (error) {
    console.error("Error getting autonomous task:", error);
    return undefined;
  }
}

export async function getAutonomousTasksByUserId(userId: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const result = await db.execute(
      sql`SELECT * FROM autonomous_tasks WHERE user_id = ${userId} ORDER BY created_at DESC`
    );

    if (!(result as any).rows) return [];

    return (result as any).rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description,
      objective: row.objective,
      priority: row.priority,
      status: row.status,
      context: row.context,
      assignedAgentId: row.assigned_agent_id,
      executionPlan: row.execution_plan ? JSON.parse(row.execution_plan) : null,
      result: row.result ? JSON.parse(row.result) : null,
      aiTokensUsed: row.ai_tokens_used,
      executionTimeMs: row.execution_time_ms,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error("Error getting autonomous tasks for user:", error);
    return [];
  }
}

export async function updateAutonomousTask(
  id: number,
  data: Partial<{
    title: string;
    description: string;
    objective: string;
    priority: "low" | "medium" | "high" | "critical";
    status: "pending" | "running" | "completed" | "failed" | "queued";
    context: string;
    assignedAgentId: string;
    executionPlan: any;
    result: any;
    aiTokensUsed: number;
    executionTimeMs: number;
    startedAt: Date;
    completedAt: Date;
    tags: string[];
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const setClauses: string[] = [];
    const params: any[] = [];

    Object.entries(data).forEach(([key, value]) => {
      const columnName =
        key === "userId"
          ? "user_id"
          : key === "assignedAgentId"
            ? "assigned_agent_id"
            : key === "executionPlan"
              ? "execution_plan"
              : key === "aiTokensUsed"
                ? "ai_tokens_used"
                : key === "executionTimeMs"
                  ? "execution_time_ms"
                  : key === "startedAt"
                    ? "started_at"
                    : key === "completedAt"
                      ? "completed_at"
                      : key;

      if (typeof value === "object" && !(value instanceof Date)) {
        setClauses.push(`${columnName} = ?`);
        params.push(JSON.stringify(value));
      } else {
        setClauses.push(`${columnName} = ?`);
        params.push(value);
      }
    });

    if (setClauses.length > 0) {
      setClauses.push("updated_at = NOW()");
      params.push(id);

      const query = `UPDATE autonomous_tasks SET ${setClauses.join(", ")} WHERE id = ?`;
      await db.execute(sql.raw(query), params);
    }

    return await getAutonomousTaskById(id);
  } catch (error) {
    console.error("Error updating autonomous task:", error);
    throw error;
  }
}

export async function deleteAutonomousTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.execute(sql`DELETE FROM autonomous_tasks WHERE id = ${id}`);
  } catch (error) {
    console.error("Error deleting autonomous task:", error);
    throw error;
  }
}
