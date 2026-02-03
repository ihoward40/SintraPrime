import { describe, it, expect, beforeEach } from 'vitest';
import { SeverityClassifier } from '../../src/monitoring/severityClassifier.js';
import type { MonitoringPolicy } from '../../src/monitoring/types.js';

describe('SeverityClassifier', () => {
  let classifier: SeverityClassifier;
  let mockPolicy: MonitoringPolicy;

  beforeEach(() => {
    mockPolicy = {
      version: '1.0.0',
      severity_policy: {},
      risk_flags: {
        retry_loop: { misconfig_weight: 3 },
        unbounded_iterator: { misconfig_weight: 4 },
        missing_idempotency: { misconfig_weight: 4 },
        batch_job: { legit_weight: 3 },
        backfill_mode: { legit_weight: 4 },
      },
      review_windows: {
        credit_review_days: 7,
        baseline_window_days: 30,
        healthy_run_statuses: ['Success'],
      },
      thresholds: {
        max_retries: 5,
        quarantine_credit_multiplier: 10,
        high_misconfig_score: 8,
      },
    };
    classifier = new SeverityClassifier(mockPolicy);
  });

  describe('classify', () => {
    it('should classify SEV0 for 10x+ credit variance', () => {
      const run = {
        run_id: 'TEST-SEV0-001',
        credits_total: 5000,
        baseline_expected_credits: 500,
        status: 'Failed' as const,
      };

      const result = classifier.classify(run);

      expect(result.severity).toBe('SEV0');
      expect(result.misconfig_likelihood).toBe('Low');
      expect(result.risk_flags).toEqual([]);
      expect(result.risk_summary).toContain('10.00× baseline');
    });

    it('should classify SEV1 for 5x-10x credit variance', () => {
      const run = {
        run_id: 'TEST-SEV1-001',
        credits_total: 2500,
        baseline_expected_credits: 500,
        status: 'Success' as const,
      };

      const result = classifier.classify(run);

      expect(result.severity).toBe('SEV1');
      expect(result.misconfig_likelihood).toBe('Low');
      expect(result.risk_summary).toContain('5.00× baseline');
    });

    it('should classify SEV2 for 2x-5x credit variance', () => {
      const run = {
        run_id: 'TEST-SEV2-001',
        credits_total: 1000,
        baseline_expected_credits: 500,
        status: 'Success' as const,
      };

      const result = classifier.classify(run);

      expect(result.severity).toBe('SEV2');
      expect(result.misconfig_likelihood).toBe('Low');
      expect(result.risk_summary).toContain('2.00× baseline');
    });

    it('should classify SEV3 for 1.5x-2x credit variance', () => {
      const run = {
        run_id: 'TEST-SEV3-001',
        credits_total: 750,
        baseline_expected_credits: 500,
        status: 'Success' as const,
      };

      const result = classifier.classify(run);

      expect(result.severity).toBe('SEV3');
      expect(result.misconfig_likelihood).toBe('Low');
      expect(result.risk_summary).toContain('1.50× baseline');
    });

    it('should classify SEV4 for normal variance', () => {
      const run = {
        run_id: 'TEST-SEV4-001',
        credits_total: 500,
        baseline_expected_credits: 500,
        status: 'Success' as const,
      };

      const result = classifier.classify(run);

      expect(result.severity).toBe('SEV4');
      expect(result.misconfig_likelihood).toBe('Low');
      expect(result.risk_summary).toContain('1.00× baseline');
    });

    it('should detect backfill mode and assign legit score', () => {
      const run = {
        run_id: 'TEST-BACKFILL-001',
        credits_total: 500,
        baseline_expected_credits: 500,
        job_type: 'RECONCILE_BACKFILL' as const,
        status: 'Success' as const,
      };

      const result = classifier.classify(run);

      expect(result.risk_flags).toContain('backfill_mode');
      expect(result.misconfig_likelihood).toBe('Low');
      expect(result.severity).toBe('SEV4');
    });

    it('should handle missing baseline credits gracefully', () => {
      const run = {
        run_id: 'TEST-NO-BASELINE-001',
        credits_total: 1000,
        status: 'Success' as const,
      };

      const result = classifier.classify(run);

      expect(result.severity).toBe('SEV4');
      expect(result.risk_summary).toContain('1.00× baseline');
    });

    it('should handle zero baseline credits', () => {
      const run = {
        run_id: 'TEST-ZERO-BASELINE-001',
        credits_total: 1000,
        baseline_expected_credits: 0,
        status: 'Success' as const,
      };

      const result = classifier.classify(run);

      expect(result.severity).toBe('SEV4');
      expect(result.risk_summary).toContain('1.00× baseline');
    });

    it('should include risk flags in summary', () => {
      const run = {
        run_id: 'TEST-FLAGS-001',
        credits_total: 500,
        baseline_expected_credits: 500,
        job_type: 'RECONCILE_BACKFILL' as const,
        status: 'Success' as const,
      };

      const result = classifier.classify(run);

      expect(result.risk_summary).toContain('Flags: backfill_mode');
    });

    it('should handle empty risk flags', () => {
      const run = {
        run_id: 'TEST-NO-FLAGS-001',
        credits_total: 500,
        baseline_expected_credits: 500,
        status: 'Success' as const,
      };

      const result = classifier.classify(run);

      expect(result.risk_flags).toEqual([]);
      expect(result.risk_summary).toContain('Flags: none');
    });
  });

  describe('risk summary generation', () => {
    it('should format variance multiplier to 2 decimal places', () => {
      const run = {
        run_id: 'TEST-FORMAT-001',
        credits_total: 666,
        baseline_expected_credits: 500,
        status: 'Success' as const,
      };

      const result = classifier.classify(run);

      expect(result.risk_summary).toContain('1.33× baseline');
    });

    it('should include misconfig likelihood in summary', () => {
      const run = {
        run_id: 'TEST-LIKELIHOOD-001',
        credits_total: 500,
        baseline_expected_credits: 500,
        status: 'Success' as const,
      };

      const result = classifier.classify(run);

      expect(result.risk_summary).toContain('Misconfig: Low');
    });
  });
});
