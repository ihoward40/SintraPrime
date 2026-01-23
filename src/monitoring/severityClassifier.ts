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
    const variance_multiplier = run.baseline_expected_credits
      ? run.credits_total! / run.baseline_expected_credits
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

  private detectRetryLoop(run: Partial<RunRecord>): boolean {
    // Placeholder: integrate with actual retry detection logic
    return run.status === 'Failed';
  }

  private detectUnboundedIterator(run: Partial<RunRecord>): boolean {
    // Placeholder: integrate with scenario config checks
    return false;
  }

  private detectMissingIdempotency(run: Partial<RunRecord>): boolean {
    // Placeholder
    return false;
  }

  private detectPIIExposure(run: Partial<RunRecord>): boolean {
    // Placeholder: integrate with data validation
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
