/**
 * Policy Gates & Spending Controls
 * 
 * Implements spending limits, approval workflows, and policy enforcement
 * Follows AGENTS.md governance requirements
 */

import { getDb } from '../db';
import { createReceipt, logBlockedAction } from './receiptLedger';

export interface SpendingPolicy {
  userId: number;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  requiresApproval: boolean;
  approvalThreshold: number;
}

export interface PolicyGateResult {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
  currentSpending?: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

// In-memory spending tracker (in production, use Redis or database)
const spendingTracker = new Map<string, {
  daily: number;
  weekly: number;
  monthly: number;
  lastReset: {
    daily: Date;
    weekly: Date;
    monthly: Date;
  };
}>();

/**
 * Check if action is allowed under spending policy
 * @param {number} userId - User ID
 * @param {string} action - Action type
 * @param {number} estimatedCost - Estimated cost in cents
 * @returns {Promise<PolicyGateResult>} Policy gate result
 */
export async function checkPolicyGate(
  userId: number,
  action: string,
  estimatedCost: number
): Promise<PolicyGateResult> {
  // Get user's spending policy
  const policy = await getSpendingPolicy(userId);
  
  // Get current spending
  const spending = getSpending(userId);
  
  // Reset periods if needed
  resetSpendingPeriods(userId);
  
  // Check daily limit
  if (spending.daily + estimatedCost > policy.dailyLimit) {
    await logBlockedAction(
      action,
      `user:${userId}`,
      `Daily spending limit exceeded: ${spending.daily + estimatedCost} > ${policy.dailyLimit}`
    );
    
    return {
      allowed: false,
      reason: `Daily spending limit exceeded (${formatCurrency(policy.dailyLimit)})`,
      currentSpending: spending,
    };
  }
  
  // Check weekly limit
  if (spending.weekly + estimatedCost > policy.weeklyLimit) {
    await logBlockedAction(
      action,
      `user:${userId}`,
      `Weekly spending limit exceeded: ${spending.weekly + estimatedCost} > ${policy.weeklyLimit}`
    );
    
    return {
      allowed: false,
      reason: `Weekly spending limit exceeded (${formatCurrency(policy.weeklyLimit)})`,
      currentSpending: spending,
    };
  }
  
  // Check monthly limit
  if (spending.monthly + estimatedCost > policy.monthlyLimit) {
    await logBlockedAction(
      action,
      `user:${userId}`,
      `Monthly spending limit exceeded: ${spending.monthly + estimatedCost} > ${policy.monthlyLimit}`
    );
    
    return {
      allowed: false,
      reason: `Monthly spending limit exceeded (${formatCurrency(policy.monthlyLimit)})`,
      currentSpending: spending,
    };
  }
  
  // Check if approval is required
  if (policy.requiresApproval && estimatedCost >= policy.approvalThreshold) {
    return {
      allowed: false,
      requiresApproval: true,
      reason: `Action requires approval (cost: ${formatCurrency(estimatedCost)} >= threshold: ${formatCurrency(policy.approvalThreshold)})`,
      currentSpending: spending,
    };
  }
  
  return {
    allowed: true,
    currentSpending: spending,
  };
}

/**
 * Record spending after action completes
 * @param {number} userId - User ID
 * @param {string} action - Action type
 * @param {number} actualCost - Actual cost in cents
 * @returns {Promise<void>}
 */
export async function recordSpending(
  userId: number,
  action: string,
  actualCost: number
): Promise<void> {
  const key = `user:${userId}`;
  const spending = spendingTracker.get(key);
  
  if (!spending) {
    initializeSpending(userId);
  }
  
  const current = spendingTracker.get(key)!;
  current.daily += actualCost;
  current.weekly += actualCost;
  current.monthly += actualCost;
  
  // Create audit receipt
  await createReceipt({
    action: 'spending_recorded',
    actor: `user:${userId}`,
    details: {
      action_type: action,
      cost: actualCost,
      daily_total: current.daily,
      weekly_total: current.weekly,
      monthly_total: current.monthly,
    },
    outcome: 'success',
  });
}

/**
 * Get current spending for user
 * @param {number} userId - User ID
 * @returns {Object} Current spending
 */
function getSpending(userId: number): {
  daily: number;
  weekly: number;
  monthly: number;
} {
  const key = `user:${userId}`;
  const spending = spendingTracker.get(key);
  
  if (!spending) {
    initializeSpending(userId);
    return { daily: 0, weekly: 0, monthly: 0 };
  }
  
  return {
    daily: spending.daily,
    weekly: spending.weekly,
    monthly: spending.monthly,
  };
}

/**
 * Initialize spending tracker for user
 * @param {number} userId - User ID
 */
function initializeSpending(userId: number): void {
  const key = `user:${userId}`;
  const now = new Date();
  
  spendingTracker.set(key, {
    daily: 0,
    weekly: 0,
    monthly: 0,
    lastReset: {
      daily: now,
      weekly: now,
      monthly: now,
    },
  });
}

/**
 * Reset spending periods if needed
 * @param {number} userId - User ID
 */
function resetSpendingPeriods(userId: number): void {
  const key = `user:${userId}`;
  const spending = spendingTracker.get(key);
  
  if (!spending) {
    initializeSpending(userId);
    return;
  }
  
  const now = new Date();
  
  // Reset daily if more than 24 hours
  const daysSinceDaily = (now.getTime() - spending.lastReset.daily.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceDaily >= 1) {
    spending.daily = 0;
    spending.lastReset.daily = now;
  }
  
  // Reset weekly if more than 7 days
  const daysSinceWeekly = (now.getTime() - spending.lastReset.weekly.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceWeekly >= 7) {
    spending.weekly = 0;
    spending.lastReset.weekly = now;
  }
  
  // Reset monthly if more than 30 days
  const daysSinceMonthly = (now.getTime() - spending.lastReset.monthly.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceMonthly >= 30) {
    spending.monthly = 0;
    spending.lastReset.monthly = now;
  }
}

/**
 * Get spending policy for user
 * @param {number} userId - User ID
 * @returns {Promise<SpendingPolicy>} Spending policy
 */
async function getSpendingPolicy(userId: number): Promise<SpendingPolicy> {
  // In production, load from database
  // For now, return default policy
  return {
    userId,
    dailyLimit: 10000, // $100.00
    weeklyLimit: 50000, // $500.00
    monthlyLimit: 200000, // $2000.00
    requiresApproval: true,
    approvalThreshold: 5000, // $50.00
  };
}

/**
 * Format currency for display
 * @param {number} cents - Amount in cents
 * @returns {string} Formatted currency
 */
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Create approval request
 * @param {Object} data - Approval request data
 * @returns {Promise<string>} Approval request ID
 */
export async function createApprovalRequest(data: {
  userId: number;
  action: string;
  estimatedCost: number;
  justification: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const approvalId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create audit receipt
  await createReceipt({
    action: 'approval_request_created',
    actor: `user:${data.userId}`,
    details: {
      approval_id: approvalId,
      action_type: data.action,
      estimated_cost: data.estimatedCost,
      justification: data.justification,
      status: 'pending',
    },
    outcome: 'success',
    severity: 'medium',
    requiresReview: true,
    metadata: data.metadata,
  });
  
  return approvalId;
}

/**
 * Approve spending request
 * @param {string} approvalId - Approval request ID
 * @param {number} approvedBy - User ID of approver
 * @returns {Promise<void>}
 */
export async function approveSpending(
  approvalId: string,
  approvedBy: number
): Promise<void> {
  await createReceipt({
    action: 'approval_granted',
    actor: `user:${approvedBy}`,
    details: {
      approval_id: approvalId,
      approved_at: new Date().toISOString(),
    },
    outcome: 'success',
    severity: 'high',
  });
}

/**
 * Reject spending request
 * @param {string} approvalId - Approval request ID
 * @param {number} rejectedBy - User ID of rejector
 * @param {string} reason - Rejection reason
 * @returns {Promise<void>}
 */
export async function rejectSpending(
  approvalId: string,
  rejectedBy: number,
  reason: string
): Promise<void> {
  await createReceipt({
    action: 'approval_rejected',
    actor: `user:${rejectedBy}`,
    details: {
      approval_id: approvalId,
      rejected_at: new Date().toISOString(),
      reason,
    },
    outcome: 'failure',
    severity: 'medium',
  });
}

/**
 * Check idempotency to prevent duplicate executions
 * @param {string} operationId - Unique operation identifier
 * @returns {Promise<boolean>} True if operation already executed
 */
export async function checkIdempotency(operationId: string): Promise<boolean> {
  // In production, check database or Redis
  // For now, use in-memory map
  const executed = idempotencyCache.has(operationId);
  
  if (executed) {
    await logBlockedAction(
      'duplicate_operation',
      'system',
      `Operation ${operationId} already executed (idempotency check)`
    );
  }
  
  return executed;
}

/**
 * Mark operation as executed
 * @param {string} operationId - Unique operation identifier
 * @returns {Promise<void>}
 */
export async function markOperationExecuted(operationId: string): Promise<void> {
  idempotencyCache.set(operationId, Date.now());
  
  // Clean up old entries (older than 24 hours)
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  
  const keysToDelete: string[] = [];
  idempotencyCache.forEach((timestamp, key) => {
    if (now - timestamp > dayInMs) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => idempotencyCache.delete(key));
}

// In-memory idempotency cache (in production, use Redis)
const idempotencyCache = new Map<string, number>();

/**
 * Get spending summary for user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Spending summary
 */
export async function getSpendingSummary(userId: number): Promise<{
  current: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  limits: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  percentages: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}> {
  const policy = await getSpendingPolicy(userId);
  const spending = getSpending(userId);
  
  return {
    current: spending,
    limits: {
      daily: policy.dailyLimit,
      weekly: policy.weeklyLimit,
      monthly: policy.monthlyLimit,
    },
    percentages: {
      daily: (spending.daily / policy.dailyLimit) * 100,
      weekly: (spending.weekly / policy.weeklyLimit) * 100,
      monthly: (spending.monthly / policy.monthlyLimit) * 100,
    },
  };
}
