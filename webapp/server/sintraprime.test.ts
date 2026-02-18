/**
 * SintraPrime Integration Tests
 * 
 * Tests for Kilo Code governance, receipt ledger, policy gates, and other SintraPrime features
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createReceipt, verifyReceiptIntegrity, getReceiptChain, logBlockedAction } from './lib/receiptLedger';
import { checkPolicyGate, recordSpending, getSpendingSummary } from './lib/policyGates';
import { getSystemHealth, performForensicAnalysis, classifySeverity } from './lib/monitoring';
import { runDeepThinkAnalysis } from './lib/deepThink';

describe('SintraPrime Integration Tests', () => {
  describe('Receipt Ledger', () => {
    it('should create receipt with cryptographic verification', async () => {
      const receipt = await createReceipt({
        action: 'test_action',
        actor: 'test_user',
        details: { test: 'data' },
        outcome: 'success',
      });
      
      expect(receipt).toBeDefined();
      expect(receipt.receipt_id).toBeDefined();
      expect(receipt.evidence_hash).toBeDefined();
      expect(receipt.signature).toBeDefined();
    });
    
    it('should verify receipt integrity', async () => {
      const receipt = await createReceipt({
        action: 'test_verification',
        actor: 'test_user',
        details: { verify: true },
        outcome: 'success',
      });
      
      const isValid = await verifyReceiptIntegrity(receipt.receipt_id);
      expect(isValid).toBe(true);
    });
    
    it('should retrieve receipt chain', async () => {
      // Create multiple receipts
      await createReceipt({
        action: 'chain_test_1',
        actor: 'test_user',
        details: {},
        outcome: 'success',
      });
      
      await createReceipt({
        action: 'chain_test_2',
        actor: 'test_user',
        details: {},
        outcome: 'success',
      });
      
      const chain = await getReceiptChain({ action: 'chain_test_1' });
      expect(chain.length).toBeGreaterThan(0);
    });
    
    it('should log blocked actions', async () => {
      await logBlockedAction(
        'unauthorized_access',
        'test_user',
        'Access denied: insufficient permissions'
      );
      
      const blockedReceipts = await getReceiptChain({ action: 'blocked:unauthorized_access' });
      expect(blockedReceipts.length).toBeGreaterThan(0);
    });
  });
  
  describe('Policy Gates', () => {
    it('should allow actions within spending limits', async () => {
      const result = await checkPolicyGate(1, 'test_action', 1000); // $10.00
      expect(result.allowed).toBe(true);
    });
    
    it('should block actions exceeding daily limit', async () => {
      const result = await checkPolicyGate(1, 'test_action', 20000); // $200.00 (exceeds $100 daily limit)
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Daily spending limit');
    });
    
    it('should require approval for high-cost actions', async () => {
      const result = await checkPolicyGate(1, 'test_action', 6000); // $60.00 (exceeds $50 approval threshold)
      expect(result.requiresApproval).toBe(true);
    });
    
    it('should record spending', async () => {
      await recordSpending(1, 'test_purchase', 2500); // $25.00
      
      const summary = await getSpendingSummary(1);
      expect(summary.current.daily).toBeGreaterThanOrEqual(2500);
    });
  });
  
  describe('Monitoring & Forensics', () => {
    it('should get system health metrics', async () => {
      const health = await getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.receipts).toBeDefined();
      expect(health.compliance).toBeDefined();
      expect(health.compliance.score).toBeGreaterThanOrEqual(0);
      expect(health.compliance.score).toBeLessThanOrEqual(100);
    });
    
    it('should perform forensic analysis', async () => {
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - 24);
      const endDate = new Date();
      
      const analysis = await performForensicAnalysis(startDate, endDate);
      
      expect(analysis).toBeDefined();
      expect(analysis.totalActions).toBeGreaterThanOrEqual(0);
      expect(analysis.integrityStatus).toBeDefined();
    });
    
    it('should classify action severity', () => {
      const lowSeverity = classifySeverity('read_data', {});
      expect(lowSeverity).toBe('low');
      
      const mediumSeverity = classifySeverity('update_record', {});
      expect(mediumSeverity).toBe('medium');
      
      const highSeverity = classifySeverity('trust_amendment', {});
      expect(highSeverity).toBe('high');
      
      const blockedSeverity = classifySeverity('blocked:unauthorized', {});
      expect(blockedSeverity).toBe('high');
    });
  });
  
  describe('DeepThink Analysis', () => {
    it('should run legal strategy analysis', async () => {
      const result = await runDeepThinkAnalysis({
        userId: 1,
        scenario: 'Test legal scenario for debt collection dispute',
        context: {
          debtor: 'John Doe',
          amount: 5000,
          violations: ['FDCPA', 'FCRA'],
        },
        analysisType: 'legal_strategy',
        depth: 'shallow',
      });
      
      expect(result).toBeDefined();
      expect(result.analysis_id).toBeDefined();
      expect(result.findings).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.risks).toBeInstanceOf(Array);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    }, 30000); // 30 second timeout for LLM call
    
    it('should run financial analysis', async () => {
      const result = await runDeepThinkAnalysis({
        userId: 1,
        scenario: 'Test trust tax optimization scenario',
        context: {
          trust_type: 'irrevocable',
          assets: 500000,
          beneficiaries: 3,
        },
        analysisType: 'financial_analysis',
        depth: 'medium',
      });
      
      expect(result).toBeDefined();
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    }, 30000);
  });
  
  describe('Kilo Code Governance', () => {
    it('should enforce fail-closed operation', async () => {
      // Test that blocked actions are logged
      await logBlockedAction(
        'test_violation',
        'test_user',
        'Governance violation detected'
      );
      
      const blockedReceipts = await getReceiptChain({ action: 'blocked:test_violation' });
      expect(blockedReceipts.length).toBeGreaterThan(0);
      expect(blockedReceipts[0].severity).toBe('high');
    });
    
    it('should maintain audit trail integrity', async () => {
      // Create test receipts
      const receipt1 = await createReceipt({
        action: 'integrity_test_1',
        actor: 'test_user',
        details: {},
        outcome: 'success',
      });
      
      const receipt2 = await createReceipt({
        action: 'integrity_test_2',
        actor: 'test_user',
        details: {},
        outcome: 'success',
      });
      
      // Verify both receipts
      const valid1 = await verifyReceiptIntegrity(receipt1.receipt_id);
      const valid2 = await verifyReceiptIntegrity(receipt2.receipt_id);
      
      expect(valid1).toBe(true);
      expect(valid2).toBe(true);
    });
  });
});
