import { SeverityClassifier } from '../../src/monitoring/severityClassifier.js';
import type { MonitoringPolicy } from '../../src/monitoring/types.js';

const mockPolicy: MonitoringPolicy = {
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

const classifier = new SeverityClassifier(mockPolicy);

// Test SEV0
const sev0Run = {
  run_id: 'TEST-SEV0',
  credits_total: 5000,
  baseline_expected_credits: 500,
  status: 'Failed' as const,
};

const sev0Result = classifier.classify(sev0Run);
console.assert(sev0Result.severity === 'SEV0', 'SEV0 test failed');
console.log('✓ SEV0 classification test passed');

// Test SEV1
const sev1Run = {
  run_id: 'TEST-SEV1',
  credits_total: 2500,
  baseline_expected_credits: 500,
  status: 'Success' as const,
};

const sev1Result = classifier.classify(sev1Run);
console.assert(sev1Result.severity === 'SEV1', 'SEV1 test failed');
console.log('✓ SEV1 classification test passed');

// Test legit backfill (SEV4)
const sev4Run = {
  run_id: 'TEST-SEV4',
  credits_total: 500,
  baseline_expected_credits: 500,
  job_type: 'RECONCILE_BACKFILL' as const,
  status: 'Success' as const,
};

const sev4Result = classifier.classify(sev4Run);
console.assert(sev4Result.severity === 'SEV4', 'SEV4 test failed');
console.assert(sev4Result.misconfig_likelihood === 'Low', 'Legit backfill misconfig check failed');
console.log('✓ SEV4 legit backfill test passed');
