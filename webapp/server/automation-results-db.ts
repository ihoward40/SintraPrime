import { getDb } from "./db";
import { automationResults, demoUsageMetrics } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export type AutomationResult = typeof automationResults.$inferSelect;
export type NewAutomationResult = typeof automationResults.$inferInsert;
export type DemoUsageMetric = typeof demoUsageMetrics.$inferSelect;

/**
 * Create a new automation result
 */
export async function createAutomationResult(data: NewAutomationResult): Promise<AutomationResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insertResult: any = await db
    .insert(automationResults)
    .values(data);
  
  // Fetch the newly created record using the last insert ID
  const insertId = insertResult.insertId || insertResult[0]?.insertId;
  const [result] = await db
    .select()
    .from(automationResults)
    .where(eq(automationResults.id, insertId))
    .limit(1);
  return result;
}

/**
 * Update automation result status and completion data
 */
export async function updateAutomationResult(
  id: number,
  updates: {
    status?: "running" | "completed" | "failed";
    errorMessage?: string;
    recordingUrl?: string;
    completedAt?: Date;
    duration?: number;
    resultData?: string;
  }
): Promise<AutomationResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(automationResults)
    .set(updates)
    .where(eq(automationResults.id, id));
  
  // Fetch the updated record
  const [result] = await db
    .select()
    .from(automationResults)
    .where(eq(automationResults.id, id))
    .limit(1);
  return result;
}

/**
 * Get automation results for a user
 */
export async function getUserAutomationResults(
  userId: number,
  options?: {
    demoType?: string;
    limit?: number;
    offset?: number;
  }
): Promise<AutomationResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { demoType, limit = 50, offset = 0 } = options || {};
  
  let whereCondition = eq(automationResults.userId, userId);
  
  if (demoType) {
    whereCondition = and(
      eq(automationResults.userId, userId),
      eq(automationResults.demoType, demoType)
    ) as any;
  }
  
  const query = db.select().from(automationResults).where(whereCondition);
  
  const results = await query
    .orderBy(desc(automationResults.startedAt))
    .limit(limit)
    .offset(offset);
    
  return results;
}

/**
 * Get automation results by demo type
 */
export async function getAutomationResultsByType(
  userId: number,
  demoType: string
): Promise<AutomationResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(automationResults)
    .where(and(
      eq(automationResults.userId, userId),
      eq(automationResults.demoType, demoType)
    ))
    .orderBy(desc(automationResults.startedAt))
    .limit(50);
}

/**
 * Track demo usage metrics
 */
export async function trackDemoUsage(
  userId: number,
  demoType: string,
  duration: number,
  success: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if metric exists for this user and demo type
  const [existing] = await db
    .select()
    .from(demoUsageMetrics)
    .where(and(
      eq(demoUsageMetrics.userId, userId),
      eq(demoUsageMetrics.demoType, demoType)
    ))
    .limit(1);
    
  if (existing) {
    // Update existing metric
    if (!db) throw new Error("Database not available");
    await db
      .update(demoUsageMetrics)
      .set({
        totalExecutions: existing.totalExecutions + 1,
        averageDuration: Math.round(((existing.averageDuration || 0) * existing.totalExecutions + duration) / (existing.totalExecutions + 1)),
        successfulExecutions: success ? existing.successfulExecutions + 1 : existing.successfulExecutions,
        failedExecutions: success ? existing.failedExecutions : existing.failedExecutions + 1,
        lastExecutedAt: new Date(),
      })
      .where(eq(demoUsageMetrics.id, existing.id));
  } else {
    // Create new metric
    if (!db) throw new Error("Database not available");
    await db.insert(demoUsageMetrics).values({
      userId,
      demoType,
      totalExecutions: 1,
      averageDuration: duration,
      successfulExecutions: success ? 1 : 0,
      failedExecutions: success ? 0 : 1,
      lastExecutedAt: new Date(),
    });
  }
}

/**
 * Get demo usage metrics for a user
 */
export async function getUserDemoMetrics(userId: number): Promise<DemoUsageMetric[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(demoUsageMetrics)
    .where(eq(demoUsageMetrics.userId, userId))
    .orderBy(desc(demoUsageMetrics.lastExecutedAt));
}
