import { getDb } from "../db";
import { chatConversations, chatMessages, type InsertChatConversation, type InsertChatMessage } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

// ============================================================================
// CHAT CONVERSATIONS
// ============================================================================

export async function createConversation(data: InsertChatConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [conversation] = await db.insert(chatConversations).values(data).$returningId();
  return conversation.id;
}

export async function getConversation(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [conversation] = await db.select().from(chatConversations).where(eq(chatConversations.id, id));
  return conversation || null;
}

export async function getUserConversations(userId: number, caseId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = caseId
    ? and(eq(chatConversations.userId, userId), eq(chatConversations.caseId, caseId))
    : eq(chatConversations.userId, userId);
  
  return db.select().from(chatConversations)
    .where(conditions)
    .orderBy(desc(chatConversations.lastMessageAt));
}

export async function updateConversationTitle(id: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(chatConversations)
    .set({ title, updatedAt: new Date() })
    .where(eq(chatConversations.id, id));
}

export async function updateConversationLastMessage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(chatConversations)
    .set({ lastMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(chatConversations.id, id));
}

export async function deleteConversation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete all messages first
  await db.delete(chatMessages).where(eq(chatMessages.conversationId, id));
  
  // Delete conversation
  await db.delete(chatConversations).where(eq(chatConversations.id, id));
}

// ============================================================================
// CHAT MESSAGES
// ============================================================================

export async function addMessage(data: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [message] = await db.insert(chatMessages).values(data).$returningId();
  
  // Update conversation's last message timestamp
  await updateConversationLastMessage(data.conversationId);
  
  return message.id;
}

export async function getConversationMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(chatMessages.createdAt);
}

export async function deleteMessage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(chatMessages).where(eq(chatMessages.id, id));
}
