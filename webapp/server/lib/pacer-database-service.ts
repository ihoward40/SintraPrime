/**
 * PACER Database Service
 * Handles database operations for PACER credentials and docket caching
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { getDb } from "../db";
import { pacerCredentials, pacerDocketCache } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Encryption key (in production, this should be from environment variables)
const ENCRYPTION_KEY = process.env.PACER_ENCRYPTION_KEY || "default-32-character-key-change-me!";
const ALGORITHM = "aes-256-cbc";

export class PACERDatabaseService {
  /**
   * Encrypt password using AES-256
   */
  private encryptPassword(password: string): string {
    const iv = randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32));
    const cipher = createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(password, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    // Return IV + encrypted data
    return iv.toString("hex") + ":" + encrypted;
  }

  /**
   * Decrypt password using AES-256
   */
  private decryptPassword(encryptedData: string): string {
    const parts = encryptedData.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32));
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  }

  /**
   * Save PACER credentials for a user
   */
  async saveCredentials(
    userId: number,
    username: string,
    password: string,
    clientCode?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const encryptedPassword = this.encryptPassword(password);

    // Check if credentials already exist
    const existing = await db
      .select()
      .from(pacerCredentials)
      .where(eq(pacerCredentials.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing credentials
      await db
        .update(pacerCredentials)
        .set({
          username,
          encryptedPassword,
          clientCode,
          updatedAt: new Date(),
        })
        .where(eq(pacerCredentials.userId, userId));
    } else {
      // Insert new credentials
      await db.insert(pacerCredentials).values({
        userId,
        username,
        encryptedPassword,
        clientCode,
      });
    }
  }

  /**
   * Get PACER credentials for a user
   */
  async getCredentials(userId: number): Promise<{
    username: string;
    password: string;
    clientCode?: string;
  } | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db
      .select()
      .from(pacerCredentials)
      .where(eq(pacerCredentials.userId, userId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const creds = result[0];
    return {
      username: creds.username,
      password: this.decryptPassword(creds.encryptedPassword),
      clientCode: creds.clientCode || undefined,
    };
  }

  /**
   * Delete PACER credentials for a user
   */
  async deleteCredentials(userId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    await db.delete(pacerCredentials).where(eq(pacerCredentials.userId, userId));
  }

  /**
   * Update last verified timestamp
   */
  async updateLastVerified(userId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    await db
      .update(pacerCredentials)
      .set({ lastVerified: new Date() })
      .where(eq(pacerCredentials.userId, userId));
  }

  /**
   * Cache docket data
   */
  async cacheDocket(
    courtIdentifierId: number,
    caseNumber: string,
    court: string,
    docketData: any,
    expirationHours: number = 24
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    // Check if cache already exists
    const existing = await db
      .select()
      .from(pacerDocketCache)
      .where(eq(pacerDocketCache.courtIdentifierId, courtIdentifierId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing cache
      await db
        .update(pacerDocketCache)
        .set({
          docketData,
          lastFetched: new Date(),
          expiresAt,
        })
        .where(eq(pacerDocketCache.courtIdentifierId, courtIdentifierId));
    } else {
      // Insert new cache
      await db.insert(pacerDocketCache).values({
        courtIdentifierId,
        caseNumber,
        court,
        docketData,
        expiresAt,
      });
    }
  }

  /**
   * Get cached docket data
   */
  async getCachedDocket(courtIdentifierId: number): Promise<any | null> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db
      .select()
      .from(pacerDocketCache)
      .where(eq(pacerDocketCache.courtIdentifierId, courtIdentifierId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const cache = result[0];
    
    // Check if cache is expired
    if (new Date() > cache.expiresAt) {
      // Delete expired cache
      await db
        .delete(pacerDocketCache)
        .where(eq(pacerDocketCache.courtIdentifierId, courtIdentifierId));
      return null;
    }

    return cache.docketData;
  }

  /**
   * Clear all expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not initialized");
    const now = new Date();
    
    // Note: Drizzle doesn't support lt() directly, so we need to use raw SQL or filter in memory
    const allCache = await db.select().from(pacerDocketCache);
    const expiredIds = allCache
      .filter((cache) => cache.expiresAt < now)
      .map((cache) => cache.id);

    for (const id of expiredIds) {
      await db.delete(pacerDocketCache).where(eq(pacerDocketCache.id, id));
    }
  }
}
