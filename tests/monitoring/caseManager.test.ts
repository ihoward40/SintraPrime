import { describe, it, expect, beforeEach } from 'vitest';
import { CaseManager } from '../../src/monitoring/caseManager.js';
import type { RunRecord } from '../../src/monitoring/types.js';

describe('CaseManager', () => {
  let caseManager: CaseManager;

  beforeEach(() => {
    caseManager = new CaseManager();
  });

  describe('generateCaseId', () => {
    it('should generate case ID with correct format', () => {
      const caseId = caseManager.generateCaseId();

      expect(caseId).toMatch(/^CASE-\d{8}-[A-Z0-9]{6}$/);
    });

    it('should generate unique case IDs', () => {
      const caseId1 = caseManager.generateCaseId();
      const caseId2 = caseManager.generateCaseId();

      expect(caseId1).not.toBe(caseId2);
    });

    it('should include current date in case ID', () => {
      const caseId = caseManager.generateCaseId();
      const datePart = caseId.split('-')[1];
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

      expect(datePart).toBe(today);
    });
  });

  describe('createCase', () => {
    it('should create case for SEV0 credit spike', () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-001',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Test Scenario',
        scenario_id: 'SCEN-001',
        job_type: 'ANALYSIS',
        status: 'Success',
        credits_total: 5000,
        severity: 'SEV0',
        risk_flags: [],
        misconfig_likelihood: 'High',
        baseline_expected_credits: 500,
        variance_multiplier: 10.0,
        owner: 'test-user',
      };

      const caseRecord = caseManager.createCase(mockRun);

      expect(caseRecord.case_id).toMatch(/^CASE-/);
      expect(caseRecord.title).toContain('SEV0 Credit Spike');
      expect(caseRecord.title).toContain('Test Scenario');
      expect(caseRecord.severity).toBe('SEV0');
      expect(caseRecord.status).toBe('Open');
      expect(caseRecord.primary_run_id).toBe('TEST-001');
      expect(caseRecord.run_timeline_ids).toEqual(['TEST-001']);
    });

    it('should categorize as Cost/Credits for high variance', () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-002',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Cost Test',
        scenario_id: 'SCEN-002',
        job_type: 'ANALYSIS',
        status: 'Success',
        credits_total: 1500,
        severity: 'SEV2',
        risk_flags: [],
        misconfig_likelihood: 'Medium',
        baseline_expected_credits: 500,
        variance_multiplier: 3.0,
        owner: 'test-user',
      };

      const caseRecord = caseManager.createCase(mockRun);

      expect(caseRecord.category).toBe('Cost/Credits');
    });

    it('should categorize as Delivery/Email for EMAIL_SEND job type', () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-003',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Email Test',
        scenario_id: 'SCEN-003',
        job_type: 'EMAIL_SEND',
        status: 'Success',
        credits_total: 600,
        severity: 'SEV4',
        risk_flags: [],
        misconfig_likelihood: 'Low',
        baseline_expected_credits: 500,
        variance_multiplier: 1.2,
        owner: 'test-user',
      };

      const caseRecord = caseManager.createCase(mockRun);

      expect(caseRecord.category).toBe('Delivery/Email');
    });

    it('should categorize as Filing/Regulatory for FILING job type', () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-004',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Filing Test',
        scenario_id: 'SCEN-004',
        job_type: 'FILING',
        status: 'Success',
        credits_total: 550,
        severity: 'SEV4',
        risk_flags: [],
        misconfig_likelihood: 'Low',
        baseline_expected_credits: 500,
        variance_multiplier: 1.1,
        owner: 'test-user',
      };

      const caseRecord = caseManager.createCase(mockRun);

      expect(caseRecord.category).toBe('Filing/Regulatory');
    });

    it('should default to Reliability category', () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-005',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Other Test',
        scenario_id: 'SCEN-005',
        job_type: 'OTHER',
        status: 'Success',
        credits_total: 500,
        severity: 'SEV4',
        risk_flags: [],
        misconfig_likelihood: 'Low',
        baseline_expected_credits: 500,
        variance_multiplier: 1.0,
        owner: 'test-user',
      };

      const caseRecord = caseManager.createCase(mockRun);

      expect(caseRecord.category).toBe('Reliability');
    });

    it('should set Regulatory exposure band for SEV0', () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-006',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Regulatory Test',
        scenario_id: 'SCEN-006',
        job_type: 'ANALYSIS',
        status: 'Failed',
        credits_total: 5000,
        severity: 'SEV0',
        risk_flags: [],
        misconfig_likelihood: 'High',
        baseline_expected_credits: 500,
        variance_multiplier: 10.0,
        owner: 'test-user',
      };

      const caseRecord = caseManager.createCase(mockRun);

      expect(caseRecord.exposure_band).toBe('Regulatory');
    });

    it('should set Financial exposure band for 5x+ variance', () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-007',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Financial Test',
        scenario_id: 'SCEN-007',
        job_type: 'ANALYSIS',
        status: 'Success',
        credits_total: 2500,
        severity: 'SEV1',
        risk_flags: [],
        misconfig_likelihood: 'Medium',
        baseline_expected_credits: 500,
        variance_multiplier: 5.0,
        owner: 'test-user',
      };

      const caseRecord = caseManager.createCase(mockRun);

      expect(caseRecord.exposure_band).toBe('Financial');
    });

    it('should set Operational exposure band for low variance', () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-008',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Operational Test',
        scenario_id: 'SCEN-008',
        job_type: 'ANALYSIS',
        status: 'Success',
        credits_total: 750,
        severity: 'SEV3',
        risk_flags: [],
        misconfig_likelihood: 'Low',
        baseline_expected_credits: 500,
        variance_multiplier: 1.5,
        owner: 'test-user',
      };

      const caseRecord = caseManager.createCase(mockRun);

      expect(caseRecord.exposure_band).toBe('Operational');
    });

    it('should set root_cause to Misconfig for high misconfig likelihood', () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-009',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Misconfig Test',
        scenario_id: 'SCEN-009',
        job_type: 'ANALYSIS',
        status: 'Success',
        credits_total: 5000,
        severity: 'SEV0',
        risk_flags: [],
        misconfig_likelihood: 'High',
        baseline_expected_credits: 500,
        variance_multiplier: 10.0,
        owner: 'test-user',
      };

      const caseRecord = caseManager.createCase(mockRun);

      expect(caseRecord.root_cause).toBe('Misconfig');
    });

    it('should set root_cause to Unknown for non-high misconfig likelihood', () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-010',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Unknown Test',
        scenario_id: 'SCEN-010',
        job_type: 'ANALYSIS',
        status: 'Success',
        credits_total: 500,
        severity: 'SEV4',
        risk_flags: [],
        misconfig_likelihood: 'Low',
        baseline_expected_credits: 500,
        variance_multiplier: 1.0,
        owner: 'test-user',
      };

      const caseRecord = caseManager.createCase(mockRun);

      expect(caseRecord.root_cause).toBe('Unknown');
    });
  });
});
