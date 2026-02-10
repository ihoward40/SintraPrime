import type { CaseRecord, RunRecord, CaseCategory, ExposureBand } from './types.js';

export class CaseManager {
  generateCaseId(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CASE-${date}-${random}`;
  }

  createCase(run: RunRecord): CaseRecord {
    const category = this.determineCategory(run);
    const exposure_band = this.determineExposureBand(run);

    return {
      case_id: this.generateCaseId(),
      title: `${run.severity} Credit Spike: ${run.scenario_name}`,
      category,
      severity: run.severity,
      exposure_band,
      status: 'Open',
      primary_run_id: run.run_id,
      run_timeline_ids: [run.run_id],
      root_cause: run.misconfig_likelihood === 'High' ? 'Misconfig' : 'Unknown',
    };
  }

  private determineCategory(run: RunRecord): CaseCategory {
    if (run.variance_multiplier >= 2) return 'Cost/Credits';
    if (run.job_type === 'EMAIL_SEND') return 'Delivery/Email';
    if (run.job_type === 'FILING') return 'Filing/Regulatory';
    return 'Reliability';
  }

  private determineExposureBand(run: RunRecord): ExposureBand {
    if (run.severity === 'SEV0') return 'Regulatory';
    if (run.variance_multiplier && run.variance_multiplier >= 5) return 'Financial';
    return 'Operational';
  }
}
