export type Severity = 'SEV0' | 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
export type JobType = 'ANALYSIS' | 'BINDER_EXPORT' | 'EMAIL_SEND' | 'RECONCILE_BACKFILL' | 'FILING' | 'OTHER';
export type RunStatus = 'Success' | 'Failed' | 'Quarantined' | 'Escalated';
export type MisconfigLikelihood = 'High' | 'Medium' | 'Low';
export type CaseCategory = 'Cost/Credits' | 'Data/PII' | 'Delivery/Email' | 'Filing/Regulatory' | 'Reliability' | 'Other';
export type CaseStatus = 'Open' | 'Investigating' | 'Mitigating' | 'Resolved';
export type ExposureBand = 'Regulatory' | 'Financial' | 'Privacy' | 'Operational' | 'None';

export interface RunRecord {
  run_id: string;
  timestamp: string;
  scenario_name: string;
  scenario_id: string;
  job_type: JobType;
  status: RunStatus;
  credits_total: number;
  credits_in?: number;
  credits_out?: number;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  artifacts_link?: string;
  notion_case_id?: string;
  severity: Severity;
  risk_flags: string[];
  risk_summary?: string;
  misconfig_likelihood: MisconfigLikelihood;
  baseline_expected_credits: number;
  variance_multiplier: number;
  owner: string;
}

export interface CaseRecord {
  case_id: string;
  title: string;
  category: CaseCategory;
  severity: Severity;
  exposure_band: ExposureBand;
  status: CaseStatus;
  primary_run_id?: string;
  run_timeline_ids: string[];
  slack_thread_url?: string;
  root_cause?: 'Misconfig' | 'Legit Load' | 'External Dependency' | 'Unknown';
  fix_patch?: string;
  prevent_recurrence_notes?: string;
  prevent_recurrence_complete?: boolean;
}

export interface MonitoringPolicy {
  version: string;
  severity_policy: Record<string, any>;
  risk_flags: Record<string, { misconfig_weight?: number; legit_weight?: number }>;
  review_windows: {
    credit_review_days: number;
    baseline_window_days: number;
    healthy_run_statuses: string[];
  };
  thresholds: {
    max_retries: number;
    quarantine_credit_multiplier: number;
    high_misconfig_score: number;
  };
}
