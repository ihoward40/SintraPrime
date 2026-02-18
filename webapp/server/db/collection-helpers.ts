import { getDb } from "../db";
import { bookmarkCollections, collectionBookmarks, collectionShares } from "../../drizzle/schema";
import { eq, and, or, desc } from "drizzle-orm";
import type { InsertBookmarkCollection, InsertCollectionBookmark, InsertCollectionShare } from "../../drizzle/schema";

// ============================================================================
// BOOKMARK COLLECTION OPERATIONS
// ============================================================================

export async function createCollection(data: InsertBookmarkCollection) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bookmarkCollections).values(data);
  return result;
}

export async function getCollectionsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get collections owned by user OR shared with user
  const owned = await db
    .select()
    .from(bookmarkCollections)
    .where(eq(bookmarkCollections.userId, userId))
    .orderBy(desc(bookmarkCollections.createdAt));
  
  const shared = await db
    .select({
      id: bookmarkCollections.id,
      userId: bookmarkCollections.userId,
      name: bookmarkCollections.name,
      description: bookmarkCollections.description,
      isPublic: bookmarkCollections.isPublic,
      color: bookmarkCollections.color,
      icon: bookmarkCollections.icon,
      createdAt: bookmarkCollections.createdAt,
      updatedAt: bookmarkCollections.updatedAt,
      permission: collectionShares.permission,
      sharedAt: collectionShares.sharedAt,
    })
    .from(collectionShares)
    .innerJoin(bookmarkCollections, eq(collectionShares.collectionId, bookmarkCollections.id))
    .where(eq(collectionShares.sharedWithUserId, userId))
    .orderBy(desc(collectionShares.sharedAt));
  
  return [...owned, ...shared];
}

export async function getCollectionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [collection] = await db.select().from(bookmarkCollections).where(eq(bookmarkCollections.id, id));
  return collection;
}

export async function updateCollection(id: number, data: Partial<InsertBookmarkCollection>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bookmarkCollections).set(data).where(eq(bookmarkCollections.id, id));
  return getCollectionById(id);
}

export async function deleteCollection(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete all bookmarks in collection
  await db.delete(collectionBookmarks).where(eq(collectionBookmarks.collectionId, id));
  
  // Delete all shares
  await db.delete(collectionShares).where(eq(collectionShares.collectionId, id));
  
  // Delete collection
  await db.delete(bookmarkCollections).where(eq(bookmarkCollections.id, id));
}

// ============================================================================
// COLLECTION BOOKMARK OPERATIONS
// ============================================================================

export async function addBookmarkToCollection(collectionId: number, bookmarkId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(collectionBookmarks).values({ collectionId, bookmarkId });
  return result;
}

export async function removeBookmarkFromCollection(collectionId: number, bookmarkId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(collectionBookmarks)
    .where(and(eq(collectionBookmarks.collectionId, collectionId), eq(collectionBookmarks.bookmarkId, bookmarkId)));
}

export async function getCollectionBookmarks(collectionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(collectionBookmarks).where(eq(collectionBookmarks.collectionId, collectionId));
}

// ============================================================================
// COLLECTION SHARING OPERATIONS
// ============================================================================

export async function shareCollection(data: InsertCollectionShare) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(collectionShares).values(data);
  return result;
}

export async function unshareCollection(collectionId: number, sharedWithUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(collectionShares)
    .where(and(eq(collectionShares.collectionId, collectionId), eq(collectionShares.sharedWithUserId, sharedWithUserId)));
}

export async function getCollectionShares(collectionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(collectionShares).where(eq(collectionShares.collectionId, collectionId));
}

export async function updateSharePermission(collectionId: number, sharedWithUserId: number, permission: "view" | "edit") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(collectionShares)
    .set({ permission })
    .where(and(eq(collectionShares.collectionId, collectionId), eq(collectionShares.sharedWithUserId, sharedWithUserId)));
}
