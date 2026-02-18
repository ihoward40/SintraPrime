/**
 * Receipt Ledger System
 * 
 * Implements immutable receipt ledger with cryptographic verification
 * Follows AGENTS.md audit trail requirements for Tier-1 compliance
 */

import crypto from 'crypto';
import { getDb } from '../db';
import { receiptLedger } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export interface ReceiptData {
  action: string;
  actor: string;
  details: Record<string, any>;
  outcome: 'success' | 'failure' | 'partial';
  metadata?: Record<string, any>;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  requiresReview?: boolean;
}

export interface Receipt {
  receipt_id: string;
  timestamp: string;
  action: string;
  actor: string;
  evidence_hash: string;
  outcome: string;
  signature?: string;
  details: Record<string, any>;
  metadata?: Record<string, any>;
  severity?: string;
  requiresReview?: boolean;
}

/**
 * Generate SHA-256 hash of evidence
 * @param {any} evidence - Evidence data to hash
 * @returns {string} SHA-256 hash in hex format
 */
export function hashEvidence(evidence: any): string {
  if (!evidence || typeof evidence !== 'object') {
    return crypto.createHash('sha256').update(JSON.stringify(evidence || {})).digest('hex');
  }
  const canonical = JSON.stringify(evidence, Object.keys(evidence).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Generate Ed25519 digital signature for receipt
 * @param {Receipt} receipt - Receipt to sign
 * @param {string} privateKey - Ed25519 private key (optional)
 * @returns {string} Digital signature in hex format
 */
export function signReceipt(receipt: Receipt, privateKey?: string): string {
  // For Tier-1 compliance, use Ed25519 signatures
  // In production, load private key from secure vault
  const key = privateKey || process.env.RECEIPT_SIGNING_KEY || 'default-key-for-development';
  
  const canonical = JSON.stringify({
    receipt_id: receipt.receipt_id,
    timestamp: receipt.timestamp,
    action: receipt.action,
    actor: receipt.actor,
    evidence_hash: receipt.evidence_hash,
    outcome: receipt.outcome,
  }, Object.keys(receipt).sort());
  
  // Use HMAC-SHA256 as a simplified signature (replace with Ed25519 in production)
  const signature = crypto
    .createHmac('sha256', key)
    .update(canonical)
    .digest('hex');
  
  return `hmac-sha256:${signature}`;
}

/**
 * Verify receipt signature
 * @param {Receipt} receipt - Receipt to verify
 * @param {string} publicKey - Ed25519 public key (optional)
 * @returns {boolean} True if signature is valid
 */
export function verifyReceiptSignature(receipt: Receipt, publicKey?: string): boolean {
  if (!receipt.signature) {
    return false;
  }
  
  const [algorithm, signature] = receipt.signature.split(':');
  
  if (algorithm !== 'hmac-sha256') {
    console.warn(`Unsupported signature algorithm: ${algorithm}`);
    return false;
  }
  
  const key = publicKey || process.env.RECEIPT_SIGNING_KEY || 'default-key-for-development';
  
  const canonical = JSON.stringify({
    receipt_id: receipt.receipt_id,
    timestamp: receipt.timestamp,
    action: receipt.action,
    actor: receipt.actor,
    evidence_hash: receipt.evidence_hash,
    outcome: receipt.outcome,
  }, Object.keys(receipt).sort());
  
  const expectedSignature = crypto
    .createHmac('sha256', key)
    .update(canonical)
    .digest('hex');
  
  return signature === expectedSignature;
}

/**
 * Create immutable receipt and store in receipt ledger
 * @param {ReceiptData} data - Receipt data
 * @returns {Promise<Receipt>} Created receipt
 */
export async function createReceipt(data: ReceiptData): Promise<Receipt> {
  const receipt: Receipt = {
    receipt_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action: data.action,
    actor: data.actor,
    evidence_hash: hashEvidence(data.details),
    outcome: data.outcome,
    details: data.details,
    metadata: data.metadata,
    severity: data.severity,
    requiresReview: data.requiresReview,
  };
  
  // Generate digital signature
  receipt.signature = signReceipt(receipt);
  
  // Store in receipt ledger database
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db.insert(receiptLedger).values({
    receiptId: receipt.receipt_id,
    timestamp: new Date(receipt.timestamp),
    action: receipt.action,
    actor: receipt.actor,
    evidenceHash: receipt.evidence_hash,
    signature: receipt.signature,
    outcome: receipt.outcome as 'success' | 'failure' | 'partial',
    details: receipt.details,
    metadata: receipt.metadata,
    severity: receipt.severity as 'low' | 'medium' | 'high' | 'critical' | undefined,
    requiresReview: receipt.requiresReview || false,
  });
  
  return receipt;
}

/**
 * Retrieve receipt by ID
 * @param {string} receiptId - Receipt ID (UUID)
 * @returns {Promise<Receipt|null>} Receipt or null if not found
 */
export async function getReceipt(receiptId: string): Promise<Receipt | null> {
  const db = await getDb();
  if (!db) return null;
  
  const records = await db
    .select()
    .from(receiptLedger)
    .where(eq(receiptLedger.receiptId, receiptId))
    .limit(1);
  
  if (records.length === 0) {
    return null;
  }
  
  const record = records[0];
  
  return {
    receipt_id: record.receiptId,
    timestamp: record.timestamp.toISOString(),
    action: record.action,
    actor: record.actor,
    evidence_hash: record.evidenceHash,
    outcome: record.outcome,
    signature: record.signature || undefined,
    details: record.details as Record<string, any>,
    metadata: record.metadata as Record<string, any> | undefined,
    severity: record.severity || undefined,
    requiresReview: record.requiresReview,
  };
}

/**
 * Verify receipt integrity
 * @param {Receipt} receipt - Receipt to verify
 * @returns {Object} Verification result
 */
export function verifyReceiptIntegrity(receipt: Receipt): {
  valid: boolean;
  checks: {
    hasSignature: boolean;
    signatureValid: boolean;
    hashValid: boolean;
  };
  errors: string[];
} {
  const errors: string[] = [];
  const checks = {
    hasSignature: false,
    signatureValid: false,
    hashValid: false,
  };
  
  // Check 1: Receipt has signature
  if (!receipt.signature) {
    errors.push('Receipt is missing digital signature');
  } else {
    checks.hasSignature = true;
  }
  
  // Check 2: Signature is valid
  if (checks.hasSignature) {
    const signatureValid = verifyReceiptSignature(receipt);
    if (!signatureValid) {
      errors.push('Receipt signature verification failed');
    } else {
      checks.signatureValid = true;
    }
  }
  
  // Check 3: Evidence hash is valid
  const expectedHash = hashEvidence(receipt.details);
  if (receipt.evidence_hash !== expectedHash) {
    errors.push('Receipt evidence hash mismatch');
  } else {
    checks.hashValid = true;
  }
  
  return {
    valid: errors.length === 0,
    checks,
    errors,
  };
}

/**
 * Get receipt chain (all receipts for a specific action/actor)
 * @param {Object} filters - Filter criteria
 * @param {string} filters.action - Action type
 * @param {string} filters.actor - Actor identifier
 * @param {Date} filters.startDate - Start date
 * @param {Date} filters.endDate - End date
 * @returns {Promise<Receipt[]>} Array of receipts
 */
export async function getReceiptChain(filters: {
  action?: string;
  actor?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<Receipt[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(receiptLedger);
  
  // Apply filters (simplified for MySQL compatibility)
  const records = await query;
  
  // Filter in memory (in production, use proper SQL WHERE clauses)
  let filteredRecords = records;
  
  if (filters.action) {
    filteredRecords = filteredRecords.filter(r => r.action === filters.action);
  }
  
  if (filters.actor) {
    filteredRecords = filteredRecords.filter(r => r.actor === filters.actor);
  }
  
  if (filters.startDate) {
    filteredRecords = filteredRecords.filter(r => r.timestamp >= filters.startDate!);
  }
  
  if (filters.endDate) {
    filteredRecords = filteredRecords.filter(r => r.timestamp <= filters.endDate!);
  }
  
  return filteredRecords.map(record => ({
    receipt_id: record.receiptId,
    timestamp: record.timestamp.toISOString(),
    action: record.action,
    actor: record.actor,
    evidence_hash: record.evidenceHash,
    outcome: record.outcome,
    signature: record.signature || undefined,
    details: record.details as Record<string, any>,
    metadata: record.metadata as Record<string, any> | undefined,
    severity: record.severity || undefined,
    requiresReview: record.requiresReview,
  }));
}

/**
 * Generate receipt manifest (summary of all receipts)
 * @param {Receipt[]} receipts - Array of receipts
 * @returns {Object} Receipt manifest
 */
export function generateReceiptManifest(receipts: Receipt[]) {
  const manifest = {
    total: receipts.length,
    timestamp: new Date().toISOString(),
    receipts: receipts.map(r => ({
      receipt_id: r.receipt_id,
      timestamp: r.timestamp,
      action: r.action,
      actor: r.actor,
      outcome: r.outcome,
      evidence_hash: r.evidence_hash,
    })),
    manifest_hash: '',
  };
  
  // Hash the entire manifest
  manifest.manifest_hash = hashEvidence(manifest.receipts);
  
  return manifest;
}

/**
 * Export receipts to JSON file
 * @param {Receipt[]} receipts - Receipts to export
 * @param {string} filepath - Output file path
 * @returns {Promise<void>}
 */
export async function exportReceipts(receipts: Receipt[], filepath: string): Promise<void> {
  const { promises: fs } = await import('fs');
  const manifest = generateReceiptManifest(receipts);
  
  const exportData = {
    manifest,
    receipts,
    exported_at: new Date().toISOString(),
    version: '1.0.0',
  };
  
  await fs.writeFile(filepath, JSON.stringify(exportData, null, 2), 'utf-8');
}

/**
 * Verify receipt chain integrity
 * @param {Receipt[]} receipts - Receipt chain to verify
 * @returns {Object} Chain verification result
 */
export function verifyReceiptChain(receipts: Receipt[]): {
  valid: boolean;
  totalReceipts: number;
  validReceipts: number;
  invalidReceipts: number;
  errors: Array<{ receipt_id: string; errors: string[] }>;
} {
  const errors: Array<{ receipt_id: string; errors: string[] }> = [];
  let validCount = 0;
  
  for (const receipt of receipts) {
    const verification = verifyReceiptIntegrity(receipt);
    if (verification.valid) {
      validCount++;
    } else {
      errors.push({
        receipt_id: receipt.receipt_id,
        errors: verification.errors,
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    totalReceipts: receipts.length,
    validReceipts: validCount,
    invalidReceipts: errors.length,
    errors,
  };
}

/**
 * Create snapshot hash of current configuration
 * @param {Object} config - Configuration object
 * @returns {string} Configuration snapshot hash
 */
export function createConfigSnapshot(config: any): string {
  return hashEvidence({
    config,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}

/**
 * Log blocked action (for universal blocked receipts)
 * @param {string} action - Action that was blocked
 * @param {string} actor - Actor who attempted the action
 * @param {string} reason - Reason for blocking
 * @returns {Promise<Receipt>} Blocked action receipt
 */
export async function logBlockedAction(
  action: string,
  actor: string,
  reason: string
): Promise<Receipt> {
  return createReceipt({
    action: `blocked:${action}`,
    actor,
    details: {
      attempted_action: action,
      blocked_reason: reason,
      blocked_at: new Date().toISOString(),
    },
    outcome: 'failure',
    metadata: {
      severity: 'high',
      requires_review: true,
    },
    severity: 'high',
    requiresReview: true,
  });
}

/**
 * Get receipts requiring review
 * @returns {Promise<Receipt[]>} Receipts requiring review
 */
export async function getReceiptsRequiringReview(): Promise<Receipt[]> {
  const db = await getDb();
  if (!db) return [];
  
  const records = await db
    .select()
    .from(receiptLedger)
    .where(eq(receiptLedger.requiresReview, true));
  
  return records.map(record => ({
    receipt_id: record.receiptId,
    timestamp: record.timestamp.toISOString(),
    action: record.action,
    actor: record.actor,
    evidence_hash: record.evidenceHash,
    outcome: record.outcome,
    signature: record.signature || undefined,
    details: record.details as Record<string, any>,
    metadata: record.metadata as Record<string, any> | undefined,
    severity: record.severity || undefined,
    requiresReview: record.requiresReview,
  }));
}

/**
 * Mark receipt as reviewed
 * @param {string} receiptId - Receipt ID
 * @param {string} reviewedBy - Reviewer identifier
 * @returns {Promise<void>}
 */
export async function markReceiptAsReviewed(
  receiptId: string,
  reviewedBy: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  await db
    .update(receiptLedger)
    .set({
      requiresReview: false,
      reviewedAt: new Date(),
      reviewedBy,
    })
    .where(eq(receiptLedger.receiptId, receiptId));
}
