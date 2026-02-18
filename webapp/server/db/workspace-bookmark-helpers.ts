import { getDb } from "../db";
import { workspaceBookmarks } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import type { InsertWorkspaceBookmark } from "../../drizzle/schema";

// ============================================================================
// WORKSPACE BOOKMARK OPERATIONS
// ============================================================================

export async function createBookmark(data: InsertWorkspaceBookmark) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workspaceBookmarks).values(data);
  return result;
}

export async function getBookmarksByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workspaceBookmarks).where(eq(workspaceBookmarks.userId, userId)).orderBy(desc(workspaceBookmarks.createdAt));
}

export async function getBookmarkById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [bookmark] = await db.select().from(workspaceBookmarks).where(eq(workspaceBookmarks.id, id));
  return bookmark;
}

export async function updateBookmark(id: number, data: Partial<InsertWorkspaceBookmark>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workspaceBookmarks).set(data).where(eq(workspaceBookmarks.id, id));
  return getBookmarkById(id);
}

export async function deleteBookmark(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(workspaceBookmarks).where(eq(workspaceBookmarks.id, id));
}

export async function getBookmarksByCategory(userId: number, category: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workspaceBookmarks)
    .where(and(eq(workspaceBookmarks.userId, userId), eq(workspaceBookmarks.category, category)))
    .orderBy(desc(workspaceBookmarks.createdAt));
}
