import type { Severity, RunRecord, MisconfigLikelihood, MonitoringPolicy } from './types.js';

export class SeverityClassifier {
  constructor(private policy: MonitoringPolicy) {}

  classify(run: Partial<RunRecord>): {
    severity: Severity;
    misconfig_likelihood: MisconfigLikelihood;
    risk_flags: string[];
    risk_summary: string;
  } {
    const risk_flags: string[] = [];
    let misconfig_score = 0;
    let legit_score = 0;

    // Calculate variance multiplier
    const variance_multiplier = 
      run.baseline_expected_credits && 
      run.baseline_expected_credits > 0 && 
      run.credits_total
        ? run.credits_total / run.baseline_expected_credits
        : 1;

    // Detect risk flags
    if (this.detectRetryLoop(run)) {
      risk_flags.push('retry_loop');
      misconfig_score += this.policy.risk_flags.retry_loop?.misconfig_weight ?? 0;
    }

    if (this.detectUnboundedIterator(run)) {
      risk_flags.push('unbounded_iterator');
      misconfig_score += this.policy.risk_flags.unbounded_iterator?.misconfig_weight ?? 0;
    }

    if (this.detectMissingIdempotency(run)) {
      risk_flags.push('missing_idempotency');
      misconfig_score += this.policy.risk_flags.missing_idempotency?.misconfig_weight ?? 0;
    }

    if (run.job_type === 'RECONCILE_BACKFILL') {
      risk_flags.push('backfill_mode');
      legit_score += this.policy.risk_flags.backfill_mode?.legit_weight ?? 0;
    }

    // Determine severity
    let severity: Severity = 'SEV4';

    if (variance_multiplier >= 10 || this.detectPIIExposure(run)) {
      severity = 'SEV0';
    } else if (variance_multiplier >= 5) {
      severity = 'SEV1';
    } else if (variance_multiplier >= 2) {
      severity = 'SEV2';
    } else if (variance_multiplier >= 1.5) {
      severity = 'SEV3';
    }

    // Determine misconfig likelihood
    const misconfig_likelihood: MisconfigLikelihood =
      misconfig_score >= this.policy.thresholds.high_misconfig_score
        ? 'High'
        : misconfig_score > legit_score
        ? 'Medium'
        : 'Low';

    const risk_summary = this.generateRiskSummary(variance_multiplier, misconfig_likelihood, risk_flags);

    return { severity, misconfig_likelihood, risk_flags, risk_summary };
  }
  // Threshold constants for anomaly detection
  private readonly RETRY_LOOP_THRESHOLD = 10000; // Credits spent indicating potential retry loop
  private readonly UNBOUNDED_ITERATOR_THRESHOLD = 50000; // Credits suggesting unbounded iteration

  private detectRetryLoop(run: Partial<RunRecord>): boolean {
    // Check for repeated executions indicating retry loops
    if (!run.credits_total) return false;
    
    // High credit count suggests retry loops
    // Threshold: 10000 credits = ~100 expensive operations being retried
    if (run.credits_total > this.RETRY_LOOP_THRESHOLD) return true;
    
    // Check scenario name for retry-related keywords
    const scenarioName = run.scenario_name?.toLowerCase() || '';
    const creditsSpent = run.credits_total;
    if (scenarioName.includes('retry') || scenarioName.includes('loop')) {
      // If credits > 5000, flag as likely retry loop
      return creditsSpent > 5000;
    }
    
    return false;
  }

  private detectUnboundedIterator(run: Partial<RunRecord>): boolean {
    // Check for scenarios that might have unbounded loops
    if (!run.credits_total) return false;
    
    // Very high credit counts suggest unbounded iteration
    // Threshold: 50000 credits = ~500 iterations without proper bounds
    if (run.credits_total > this.UNBOUNDED_ITERATOR_THRESHOLD) return true;
    
    // Check for iterator-related patterns in scenario name
    const scenarioName = run.scenario_name?.toLowerCase() || '';
    const hasIteratorKeywords = 
      scenarioName.includes('for each') ||
      scenarioName.includes('iterate') ||
      scenarioName.includes('loop') ||
      scenarioName.includes('batch');
    
    // If iterator keywords present and high credits, flag as unbounded
    if (hasIteratorKeywords && run.credits_total > 20000) {
      return true;
    }
    
    return false;
  }

  private detectMissingIdempotency(run: Partial<RunRecord>): boolean {
    // Check if the run might have duplicate processing issues
    if (!run.credits_total) return false;
    
    // Check for payment/financial operations without idempotency
    const scenarioName = run.scenario_name?.toLowerCase() || '';
    const isFinancialOp = 
      scenarioName.includes('payment') ||
      scenarioName.includes('charge') ||
      scenarioName.includes('invoice') ||
      scenarioName.includes('refund') ||
      scenarioName.includes('transaction');
    
    // Financial operations should have relatively low credit counts
    // High counts suggest potential duplicate processing
    if (isFinancialOp && run.credits_total > 5000) {
      return true;
    }
    
    // Check for data modification operations
    const isModifyOp =
      scenarioName.includes('create') ||
      scenarioName.includes('update') ||
      scenarioName.includes('delete') ||
      scenarioName.includes('modify');
    
    // High credit count on modify operations suggests missing idempotency
    if (isModifyOp && run.credits_total > 10000) {
      return true;
    }
    
    return false;
  }

  private detectPIIExposure(run: Partial<RunRecord>): boolean {
    // Check for potential PII exposure in logs or outputs
    const scenarioName = run.scenario_name?.toLowerCase() || '';
    
    // Scenarios dealing with user data should be flagged for review
    const hasPIIKeywords = 
      scenarioName.includes('customer') ||
      scenarioName.includes('user') ||
      scenarioName.includes('email') ||
      scenarioName.includes('phone') ||
      scenarioName.includes('address') ||
      scenarioName.includes('personal') ||
      scenarioName.includes('profile');
    
    // High severity scenarios with PII keywords should be flagged
    const severity = run.severity;
    if (hasPIIKeywords && (severity === 'SEV0' || severity === 'SEV1')) {
      return true;
    }
    
    // Check if scenario involves logging or reporting
    const hasLogging = 
      scenarioName.includes('log') ||
      scenarioName.includes('report') ||
      scenarioName.includes('export') ||
      scenarioName.includes('dump');
    
    // Logging operations with PII keywords are risky
    if (hasPIIKeywords && hasLogging) {
      return true;
    }
    
    return false;
  }

  private generateRiskSummary(
    multiplier: number,
    likelihood: MisconfigLikelihood,
    flags: string[]
  ): string {
    return `${multiplier.toFixed(2)}× baseline | Misconfig: ${likelihood} | Flags: ${flags.join(', ') || 'none'}`;
  }
}
