import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RunLogger } from '../../src/monitoring/runLogger.js';
import type { RunRecord } from '../../src/monitoring/types.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

describe('RunLogger', () => {
  let logger: RunLogger;
  const testRunsDir = 'runs';

  beforeEach(() => {
    logger = new RunLogger();
    // Clean up test run directories
    if (fs.existsSync(testRunsDir)) {
      const entries = fs.readdirSync(testRunsDir);
      for (const entry of entries) {
        if (entry.startsWith('MONITOR_TEST')) {
          fs.rmSync(path.join(testRunsDir, entry), { recursive: true, force: true });
        }
      }
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(testRunsDir)) {
      const entries = fs.readdirSync(testRunsDir);
      for (const entry of entries) {
        if (entry.startsWith('MONITOR_TEST')) {
          fs.rmSync(path.join(testRunsDir, entry), { recursive: true, force: true });
        }
      }
    }
  });

  describe('logRun', () => {
    it('should create run directory and write run record', async () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-001',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Test Scenario',
        scenario_id: 'SCEN-001',
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

      const runDir = await logger.logRun(mockRun);

      expect(fs.existsSync(runDir)).toBe(true);
      expect(runDir).toContain('MONITOR_TEST-001');
    });

    it('should write run_record.json with correct content', async () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-002',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Test Scenario 2',
        scenario_id: 'SCEN-002',
        job_type: 'ANALYSIS',
        status: 'Success',
        credits_total: 750,
        severity: 'SEV3',
        risk_flags: ['backfill_mode'],
        misconfig_likelihood: 'Low',
        baseline_expected_credits: 500,
        variance_multiplier: 1.5,
        owner: 'test-user',
      };

      const runDir = await logger.logRun(mockRun);
      const recordPath = path.join(runDir, 'run_record.json');

      expect(fs.existsSync(recordPath)).toBe(true);

      const recordContent = JSON.parse(fs.readFileSync(recordPath, 'utf-8'));
      expect(recordContent.run_id).toBe('TEST-002');
      expect(recordContent.severity).toBe('SEV3');
      expect(recordContent.credits_total).toBe(750);
    });

    it('should create SHA-256 sidecar with correct hash', async () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-003',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Test Scenario 3',
        scenario_id: 'SCEN-003',
        job_type: 'ANALYSIS',
        status: 'Success',
        credits_total: 1000,
        severity: 'SEV2',
        risk_flags: [],
        misconfig_likelihood: 'Low',
        baseline_expected_credits: 500,
        variance_multiplier: 2.0,
        owner: 'test-user',
      };

      const runDir = await logger.logRun(mockRun);
      const recordPath = path.join(runDir, 'run_record.json');
      const hashPath = `${recordPath}.sha256`;

      expect(fs.existsSync(hashPath)).toBe(true);

      const recordContent = fs.readFileSync(recordPath, 'utf-8');
      const expectedHash = crypto.createHash('sha256').update(recordContent).digest('hex');
      const actualHash = fs.readFileSync(hashPath, 'utf-8');

      expect(actualHash).toBe(expectedHash);
    });

    it('should create ledger.jsonl with append-only entry', async () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-004',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Test Scenario 4',
        scenario_id: 'SCEN-004',
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

      const runDir = await logger.logRun(mockRun);
      const ledgerPath = path.join(runDir, 'ledger.jsonl');

      expect(fs.existsSync(ledgerPath)).toBe(true);

      const ledgerContent = fs.readFileSync(ledgerPath, 'utf-8');
      const lines = ledgerContent.trim().split('\n');
      expect(lines.length).toBe(1);

      const entry = JSON.parse(lines[0]);
      expect(entry.event).toBe('RUN_LOGGED');
      expect(entry.run_id).toBe('TEST-004');
      expect(entry.severity).toBe('SEV4');
      expect(entry.timestamp).toBeTruthy();
    });

    it('should handle multiple log entries to same ledger', async () => {
      const mockRun1: RunRecord = {
        run_id: 'TEST-005',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Test Scenario 5',
        scenario_id: 'SCEN-005',
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

      const mockRun2 = { ...mockRun1, severity: 'SEV3' as const };

      const runDir1 = await logger.logRun(mockRun1);
      const runDir2 = await logger.logRun(mockRun2);

      // Same run_id should create same directory
      expect(runDir1).toBe(runDir2);

      const ledgerPath = path.join(runDir1, 'ledger.jsonl');
      const ledgerContent = fs.readFileSync(ledgerPath, 'utf-8');
      const lines = ledgerContent.trim().split('\n');

      expect(lines.length).toBe(2);
      const entry1 = JSON.parse(lines[0]);
      const entry2 = JSON.parse(lines[1]);

      expect(entry1.severity).toBe('SEV4');
      expect(entry2.severity).toBe('SEV3');
    });

    it('should return the run directory path', async () => {
      const mockRun: RunRecord = {
        run_id: 'TEST-006',
        timestamp: '2024-01-01T00:00:00Z',
        scenario_name: 'Test Scenario 6',
        scenario_id: 'SCEN-006',
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

      const runDir = await logger.logRun(mockRun);

      expect(runDir).toContain('runs/MONITOR_TEST-006');
    });
  });
});
