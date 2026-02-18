/**
 * Monitoring & Forensics
 * 
 * Implements system monitoring, credit tracking, and forensic analysis
 * Provides visibility into system operations and spending
 */

import { getDb } from '../db';
import { getReceiptChain, verifyReceiptChain } from './receiptLedger';
import { getSpendingSummary } from './policyGates';

export interface SystemHealthMetrics {
  timestamp: Date;
  receipts: {
    total: number;
    last24h: number;
    requiresReview: number;
  };
  spending: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  compliance: {
    score: number;
    issues: string[];
  };
}

export interface ForensicAnalysis {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByActor: Record<string, number>;
  failureRate: number;
  blockedActions: number;
  integrityStatus: {
    valid: boolean;
    validReceipts: number;
    invalidReceipts: number;
    errors: Array<{ receipt_id: string; errors: string[] }>;
  };
}

export interface CreditMonitoring {
  userId: number;
  currentBalance: number;
  totalSpent: number;
  projectedMonthlySpend: number;
  alerts: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
  }>;
}

/**
 * Get system health metrics
 * @returns {Promise<SystemHealthMetrics>} System health metrics
 */
export async function getSystemHealth(): Promise<SystemHealthMetrics> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Get all receipts
  const allReceipts = await getReceiptChain({});
  
  // Count receipts in last 24 hours
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);
  const recent = allReceipts.filter(r => new Date(r.timestamp) > yesterday);
  
  // Count receipts requiring review
  const requiresReview = allReceipts.filter(r => r.requiresReview).length;
  
  // Calculate compliance score
  const integrityCheck = verifyReceiptChain(allReceipts);
  const complianceScore = integrityCheck.valid ? 100 : 
    Math.round((integrityCheck.validReceipts / integrityCheck.totalReceipts) * 100);
  
  const issues: string[] = [];
  if (!integrityCheck.valid) {
    issues.push(`${integrityCheck.invalidReceipts} receipts failed integrity check`);
  }
  if (requiresReview > 0) {
    issues.push(`${requiresReview} receipts require review`);
  }
  
  return {
    timestamp: new Date(),
    receipts: {
      total: allReceipts.length,
      last24h: recent.length,
      requiresReview,
    },
    spending: {
      daily: 0, // Placeholder
      weekly: 0,
      monthly: 0,
    },
    compliance: {
      score: complianceScore,
      issues,
    },
  };
}

/**
 * Perform forensic analysis on receipt chain
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<ForensicAnalysis>} Forensic analysis
 */
export async function performForensicAnalysis(
  startDate: Date,
  endDate: Date
): Promise<ForensicAnalysis> {
  // Get receipts in time range
  const receipts = await getReceiptChain({ startDate, endDate });
  
  // Count actions by type
  const actionsByType: Record<string, number> = {};
  receipts.forEach(r => {
    actionsByType[r.action] = (actionsByType[r.action] || 0) + 1;
  });
  
  // Count actions by actor
  const actionsByActor: Record<string, number> = {};
  receipts.forEach(r => {
    actionsByActor[r.actor] = (actionsByActor[r.actor] || 0) + 1;
  });
  
  // Calculate failure rate
  const failures = receipts.filter(r => r.outcome === 'failure').length;
  const failureRate = receipts.length > 0 ? (failures / receipts.length) * 100 : 0;
  
  // Count blocked actions
  const blockedActions = receipts.filter(r => r.action.startsWith('blocked:')).length;
  
  // Verify integrity
  const integrityStatus = verifyReceiptChain(receipts);
  
  return {
    timeRange: {
      start: startDate,
      end: endDate,
    },
    totalActions: receipts.length,
    actionsByType,
    actionsByActor,
    failureRate,
    blockedActions,
    integrityStatus,
  };
}

/**
 * Monitor credit usage for user
 * @param {number} userId - User ID
 * @returns {Promise<CreditMonitoring>} Credit monitoring data
 */
export async function monitorCreditUsage(userId: number): Promise<CreditMonitoring> {
  const spending = await getSpendingSummary(userId);
  
  // Calculate projected monthly spend based on current daily average
  const daysInMonth = 30;
  const projectedMonthlySpend = (spending.current.monthly / new Date().getDate()) * daysInMonth;
  
  // Generate alerts
  const alerts: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    timestamp: Date;
  }> = [];
  
  // Check daily spending
  if (spending.percentages.daily > 90) {
    alerts.push({
      severity: 'critical',
      message: `Daily spending at ${spending.percentages.daily.toFixed(1)}% of limit`,
      timestamp: new Date(),
    });
  } else if (spending.percentages.daily > 75) {
    alerts.push({
      severity: 'high',
      message: `Daily spending at ${spending.percentages.daily.toFixed(1)}% of limit`,
      timestamp: new Date(),
    });
  }
  
  // Check weekly spending
  if (spending.percentages.weekly > 90) {
    alerts.push({
      severity: 'high',
      message: `Weekly spending at ${spending.percentages.weekly.toFixed(1)}% of limit`,
      timestamp: new Date(),
    });
  }
  
  // Check monthly spending
  if (spending.percentages.monthly > 90) {
    alerts.push({
      severity: 'critical',
      message: `Monthly spending at ${spending.percentages.monthly.toFixed(1)}% of limit`,
      timestamp: new Date(),
    });
  }
  
  // Check projected overspend
  if (projectedMonthlySpend > spending.limits.monthly) {
    alerts.push({
      severity: 'high',
      message: `Projected monthly spend ($${(projectedMonthlySpend / 100).toFixed(2)}) exceeds limit`,
      timestamp: new Date(),
    });
  }
  
  return {
    userId,
    currentBalance: spending.limits.monthly - spending.current.monthly,
    totalSpent: spending.current.monthly,
    projectedMonthlySpend,
    alerts,
  };
}

/**
 * Get severity classification for action
 * @param {string} action - Action type
 * @param {any} details - Action details
 * @returns {'low' | 'medium' | 'high' | 'critical'} Severity level
 */
export function classifySeverity(
  action: string,
  details: any
): 'low' | 'medium' | 'high' | 'critical' {
  // Blocked actions are always high severity
  if (action.startsWith('blocked:')) {
    return 'high';
  }
  
  // Financial actions
  if (action.includes('payment') || action.includes('spending')) {
    if (details.amount && details.amount > 10000) { // > $100
      return 'high';
    }
    return 'medium';
  }
  
  // Trust operations
  if (action.includes('trust') || action.includes('amendment')) {
    return 'high';
  }
  
  // Data modifications
  if (action.includes('delete') || action.includes('update')) {
    return 'medium';
  }
  
  // Default
  return 'low';
}

/**
 * Generate monitoring report
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<string>} Markdown report
 */
export async function generateMonitoringReport(
  startDate: Date,
  endDate: Date
): Promise<string> {
  const forensics = await performForensicAnalysis(startDate, endDate);
  const health = await getSystemHealth();
  
  const report = `# System Monitoring Report

**Report Period:** ${startDate.toISOString()} to ${endDate.toISOString()}

## Executive Summary

- **Total Actions:** ${forensics.totalActions}
- **Failure Rate:** ${forensics.failureRate.toFixed(2)}%
- **Blocked Actions:** ${forensics.blockedActions}
- **Compliance Score:** ${health.compliance.score}%

## Receipt Integrity

- **Total Receipts:** ${forensics.totalActions}
- **Valid Receipts:** ${forensics.integrityStatus.validReceipts}
- **Invalid Receipts:** ${forensics.integrityStatus.invalidReceipts}
- **Status:** ${forensics.integrityStatus.valid ? '✅ PASS' : '❌ FAIL'}

${forensics.integrityStatus.errors.length > 0 ? `
### Integrity Errors

${forensics.integrityStatus.errors.map(e => `- Receipt ${e.receipt_id}: ${e.errors.join(', ')}`).join('\n')}
` : ''}

## Actions by Type

${Object.entries(forensics.actionsByType)
  .sort((a, b) => b[1] - a[1])
  .map(([action, count]) => `- **${action}:** ${count}`)
  .join('\n')}

## Actions by Actor

${Object.entries(forensics.actionsByActor)
  .sort((a, b) => b[1] - a[1])
  .map(([actor, count]) => `- **${actor}:** ${count}`)
  .join('\n')}

## Compliance Issues

${health.compliance.issues.length > 0 ? 
  health.compliance.issues.map(issue => `- ⚠️ ${issue}`).join('\n') : 
  '✅ No compliance issues detected'}

---

*Report generated: ${new Date().toISOString()}*
`;
  
  return report;
}

/**
 * Export monitoring data to JSON
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<string>} JSON data
 */
export async function exportMonitoringData(
  startDate: Date,
  endDate: Date
): Promise<string> {
  const forensics = await performForensicAnalysis(startDate, endDate);
  const health = await getSystemHealth();
  
  const data = {
    report_metadata: {
      generated_at: new Date().toISOString(),
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    },
    system_health: health,
    forensic_analysis: forensics,
  };
  
  return JSON.stringify(data, null, 2);
}

/**
 * Get real-time monitoring dashboard data
 * @returns {Promise<Object>} Dashboard data
 */
export async function getDashboardData(): Promise<{
  health: SystemHealthMetrics;
  recentActions: Array<{
    timestamp: string;
    action: string;
    actor: string;
    outcome: string;
    severity: string;
  }>;
  alerts: Array<{
    severity: string;
    message: string;
    timestamp: Date;
  }>;
}> {
  const health = await getSystemHealth();
  
  // Get recent actions (last 10)
  const recentReceipts = await getReceiptChain({});
  const recentActions = recentReceipts
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)
    .map(r => ({
      timestamp: r.timestamp,
      action: r.action,
      actor: r.actor,
      outcome: r.outcome,
      severity: r.severity || 'low',
    }));
  
  // Generate alerts
  const alerts: Array<{
    severity: string;
    message: string;
    timestamp: Date;
  }> = [];
  
  if (health.compliance.score < 90) {
    alerts.push({
      severity: 'high',
      message: `Compliance score below threshold: ${health.compliance.score}%`,
      timestamp: new Date(),
    });
  }
  
  if (health.receipts.requiresReview > 0) {
    alerts.push({
      severity: 'medium',
      message: `${health.receipts.requiresReview} receipts require review`,
      timestamp: new Date(),
    });
  }
  
  return {
    health,
    recentActions,
    alerts,
  };
}
