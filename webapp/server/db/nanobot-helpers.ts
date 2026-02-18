import { getDb } from "../db";
import {
  systemHealthChecks,
  nanobotErrorLogs,
  nanobotRepairs,
  nanobotLearning,
  systemMetrics,
  type InsertSystemHealthCheck,
  type InsertNanobotErrorLog,
  type InsertNanobotRepair,
  type InsertNanobotLearning,
  type InsertSystemMetric,
} from "../../drizzle/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";

// ============================================================================
// HEALTH CHECKS
// ============================================================================

export async function createHealthCheck(data: InsertSystemHealthCheck) {
  const db = await getDb();
  if (!db) return;
  return await db.insert(systemHealthChecks).values(data);
}

export async function getRecentHealthChecks(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(systemHealthChecks)
    .orderBy(desc(systemHealthChecks.createdAt))
    .limit(limit);
}

export async function getHealthChecksByType(checkType: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(systemHealthChecks)
    .where(eq(systemHealthChecks.checkType, checkType))
    .orderBy(desc(systemHealthChecks.createdAt))
    .limit(limit);
}

export async function getSystemHealthStatus() {
  const db = await getDb();
  if (!db) return { overall: 'unknown', healthy: 0, degraded: 0, down: 0, recentChecks: [] };
  const recentChecks = await db
    .select()
    .from(systemHealthChecks)
    .orderBy(desc(systemHealthChecks.createdAt))
    .limit(10);

  const healthyCount = recentChecks.filter(c => c.status === 'healthy').length;
  const degradedCount = recentChecks.filter(c => c.status === 'degraded').length;
  const downCount = recentChecks.filter(c => c.status === 'down').length;

  return {
    overall: downCount > 0 ? 'down' : degradedCount > 2 ? 'degraded' : 'healthy',
    healthy: healthyCount,
    degraded: degradedCount,
    down: downCount,
    recentChecks,
  };
}

// ============================================================================
// ERROR LOGS
// ============================================================================

export async function createErrorLog(data: InsertNanobotErrorLog) {
  const db = await getDb();
  if (!db) return;
  return await db.insert(nanobotErrorLogs).values(data);
}

export async function getUnresolvedErrors(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(nanobotErrorLogs)
    .where(eq(nanobotErrorLogs.resolved, false))
    .orderBy(desc(nanobotErrorLogs.createdAt))
    .limit(limit);
}

export async function getErrorById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(nanobotErrorLogs)
    .where(eq(nanobotErrorLogs.id, id))
    .limit(1);
  return result[0] || null;
}

export async function markErrorResolved(id: number, resolvedBy: string) {
  const db = await getDb();
  if (!db) return;
  return await db
    .update(nanobotErrorLogs)
    .set({
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy,
    })
    .where(eq(nanobotErrorLogs.id, id));
}

export async function getErrorStats() {
  const db = await getDb();
  if (!db) return { total: 0, resolved: 0, unresolved: 0, critical: 0, resolutionRate: 0 };
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentErrors = await db
    .select()
    .from(nanobotErrorLogs)
    .where(gte(nanobotErrorLogs.createdAt, oneDayAgo));

  const totalErrors = recentErrors.length;
  const resolvedErrors = recentErrors.filter(e => e.resolved).length;
  const criticalErrors = recentErrors.filter(e => e.severity === 'critical').length;

  return {
    total: totalErrors,
    resolved: resolvedErrors,
    unresolved: totalErrors - resolvedErrors,
    critical: criticalErrors,
    resolutionRate: totalErrors > 0 ? Math.round((resolvedErrors / totalErrors) * 100) : 0,
  };
}

// ============================================================================
// REPAIRS
// ============================================================================

export async function createRepair(data: InsertNanobotRepair) {
  const db = await getDb();
  if (!db) return;
  return await db.insert(nanobotRepairs).values(data);
}

export async function getRepairHistory(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(nanobotRepairs)
    .orderBy(desc(nanobotRepairs.createdAt))
    .limit(limit);
}

export async function getRepairsByErrorId(errorLogId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(nanobotRepairs)
    .where(eq(nanobotRepairs.errorLogId, errorLogId))
    .orderBy(desc(nanobotRepairs.createdAt));
}

export async function getRepairStats() {
  const db = await getDb();
  if (!db) return { total: 0, successful: 0, failed: 0, successRate: 0 };
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentRepairs = await db
    .select()
    .from(nanobotRepairs)
    .where(gte(nanobotRepairs.createdAt, oneDayAgo));

  const totalRepairs = recentRepairs.length;
  const successfulRepairs = recentRepairs.filter(r => r.success).length;

  return {
    total: totalRepairs,
    successful: successfulRepairs,
    failed: totalRepairs - successfulRepairs,
    successRate: totalRepairs > 0 ? Math.round((successfulRepairs / totalRepairs) * 100) : 0,
  };
}

// ============================================================================
// LEARNING DATABASE
// ============================================================================

export async function createLearningEntry(data: InsertNanobotLearning) {
  const db = await getDb();
  if (!db) return;
  return await db.insert(nanobotLearning).values(data);
}

export async function getLearningEntries() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(nanobotLearning)
    .orderBy(desc(nanobotLearning.confidence), desc(nanobotLearning.successRate));
}

export async function updateLearningEntry(id: number, success: boolean) {
  const db = await getDb();
  if (!db) return;
  const entry = await db
    .select()
    .from(nanobotLearning)
    .where(eq(nanobotLearning.id, id))
    .limit(1);

  if (!entry[0]) return;

  const timesApplied = entry[0].timesApplied + 1;
  const successCount = success 
    ? Math.round((entry[0].successRate / 100) * entry[0].timesApplied) + 1
    : Math.round((entry[0].successRate / 100) * entry[0].timesApplied);
  const newSuccessRate = Math.round((successCount / timesApplied) * 100);
  const newConfidence = Math.min(100, entry[0].confidence + (success ? 5 : -10));

  return await db
    .update(nanobotLearning)
    .set({
      timesApplied,
      successRate: newSuccessRate,
      confidence: Math.max(0, newConfidence),
      lastApplied: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(nanobotLearning.id, id));
}

export async function findMatchingLearningEntry(errorMessage: string) {
  const db = await getDb();
  if (!db) return null;
  const entries = await db
    .select()
    .from(nanobotLearning)
    .where(sql`${nanobotLearning.errorPattern} LIKE ${'%' + errorMessage + '%'}`)
    .orderBy(desc(nanobotLearning.confidence))
    .limit(5);

  return entries[0] || null;
}

// ============================================================================
// SYSTEM METRICS
// ============================================================================

export async function createMetric(data: InsertSystemMetric) {
  const db = await getDb();
  if (!db) return;
  return await db.insert(systemMetrics).values(data);
}

export async function getRecentMetrics(metricType: string, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(systemMetrics)
    .where(eq(systemMetrics.metricType, metricType))
    .orderBy(desc(systemMetrics.createdAt))
    .limit(limit);
}

export async function getMetricsSummary() {
  const db = await getDb();
  if (!db) return { totalErrors: 0, totalRequests: 0, errorRate: 0 };
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const recentMetrics = await db
    .select()
    .from(systemMetrics)
    .where(gte(systemMetrics.createdAt, oneHourAgo));

  const errorMetrics = recentMetrics.filter(m => m.metricType === 'errors');
  const requestMetrics = recentMetrics.filter(m => m.metricType === 'requests');

  return {
    totalErrors: errorMetrics.reduce((sum, m) => sum + m.metricValue, 0),
    totalRequests: requestMetrics.reduce((sum, m) => sum + m.metricValue, 0),
    errorRate: requestMetrics.length > 0 
      ? Math.round((errorMetrics.length / requestMetrics.length) * 100)
      : 0,
  };
}
