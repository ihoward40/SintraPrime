/**
 * Core TypeScript type definitions for the SintraPrime Credit Monitoring System
 * Matches Notion database schemas and policy configuration
 */

/**
 * Severity levels for run classification
 */
export enum SeverityLevel {
  SEV0 = "SEV0", // Critical - PII/Regulatory exposure
  SEV1 = "SEV1", // High - Significant credit spike
  SEV2 = "SEV2", // Medium - Moderate variance
  SEV3 = "SEV3", // Low - Minor variance
  SEV4 = "SEV4", // Info - Normal operation
}

/**
 * Job types for automation runs
 */
export enum JobType {
  BINDER_EXPORT = "BINDER_EXPORT",
  RECONCILE_BACKFILL = "RECONCILE_BACKFILL",
  ANALYSIS = "ANALYSIS",
  OTHER = "OTHER",
}

/**
 * Run status values
 */
export enum RunStatus {
  Success = "Success",
  Failed = "Failed",
  Quarantined = "Quarantined",
  Escalated = "Escalated",
}

/**
 * Misconfig assessment levels
 */
export enum MisconfigLikelihood {
  High = "High",
  Medium = "Medium",
  Low = "Low",
}

/**
 * Risk flags for run analysis
 */
export type RiskFlag =
  | "retry_loop"
  | "unbounded_iterator"
  | "missing_idempotency"
  | "sudden_prompt_growth"
  | "deployment_correlation"
  | "batch_job"
  | "backfill_mode"
  | "linear_scaling"
  | "pii_exposure"
  | "regulatory_data";

/**
 * Case categories
 */
export enum CaseCategory {
  CostCredits = "Cost/Credits",
  DataPII = "Data/PII",
  DeliveryEmail = "Delivery/Email",
  FilingRegulatory = "Filing/Regulatory",
  Reliability = "Reliability",
  Other = "Other",
}

/**
 * Case status values
 */
export enum CaseStatus {
  Open = "Open",
  Investigating = "Investigating",
  Mitigating = "Mitigating",
  Resolved = "Resolved",
}

/**
 * Exposure bands for cases
 */
export enum ExposureBand {
  Regulatory = "Regulatory",
  Financial = "Financial",
  Privacy = "Privacy",
  Operational = "Operational",
}

/**
 * Root cause classifications
 */
export enum RootCause {
  Misconfig = "Misconfig",
  LegitLoad = "Legit Load",
  ExternalDependency = "External Dependency",
  Unknown = "Unknown",
}

/**
 * Run record matching RUNS_LEDGER Notion schema
 */
export interface RunRecord {
  Run_ID: string;
  Timestamp: string; // ISO 8601 date-time
  Scenario_Name: string;
  Scenario_ID?: string;
  Job_Type: JobType;
  Status: RunStatus;
  Credits_Total: number;
  Credits_In?: number;
  Credits_Out?: number;
  Model?: string;
  Input_Tokens?: number;
  Output_Tokens?: number;
  Artifacts_Link?: string;
  Severity: SeverityLevel;
  Risk_Flags?: RiskFlag[];
  Risk_Summary?: string;
  Misconfig_Likelihood: MisconfigLikelihood;
  Baseline_Expected_Credits?: number;
  Variance_Multiplier: number;
  
  // Additional metadata for analysis (not in Notion)
  retry_count?: number;
  has_max_items_config?: boolean;
  has_idempotency_key?: boolean;
  prompt_version?: string;
  deployment_timestamp?: string;
  is_batch_job?: boolean;
  is_backfill?: boolean;
  input_item_count?: number;
}

/**
 * Case record matching CASES Notion schema
 */
export interface CaseRecord {
  Case_ID: string; // Format: CASE-YYYYMMDD-XXXXXX
  Title: string;
  Category: CaseCategory;
  Severity: SeverityLevel;
  Exposure_Band: ExposureBand;
  Status: CaseStatus;
  Slack_Thread_URL?: string;
  Root_Cause?: RootCause;
  
  // Relations (Notion)
  Primary_Run_ID?: string;
  Related_Run_IDs?: string[];
  
  // Metadata
  Created_At?: string;
  Updated_At?: string;
  Resolved_At?: string;
  
  // Notion page URL
  notion_url?: string;
}

/**
 * Classification result from severity classifier
 */
export interface Classification {
  severity: SeverityLevel;
  misconfigLikelihood: MisconfigLikelihood;
  riskFlags: RiskFlag[];
  varianceMultiplier: number;
  misconfigScore: number;
  legitScore: number;
  actions: PolicyAction[];
}

/**
 * Misconfig assessment with scoring
 */
export interface MisconfigAssessment {
  likelihood: MisconfigLikelihood;
  score: number;
  signals: {
    misconfig: Array<{ flag: RiskFlag; weight: number }>;
    legit: Array<{ flag: RiskFlag; weight: number }>;
  };
}

/**
 * Policy actions to take for a given severity
 */
export type PolicyAction =
  | "quarantine"
  | "block_dispatch"
  | "create_case"
  | "page_lock"
  | "slack_escalate"
  | "slack_alert"
  | "require_ack_before_rerun"
  | "log_case_optional"
  | "weekly_review"
  | "ledger_only"
  | "weekly_review_optional";

/**
 * Severity policy configuration
 */
export interface SeverityPolicyConfig {
  multiplier: number;
  pii_or_regulatory?: boolean;
  action: PolicyAction[];
}

/**
 * Risk flag weighting configuration
 */
export interface RiskFlagConfig {
  misconfig_weight?: number;
  legit_weight?: number;
}

/**
 * Policy configuration structure
 */
export interface PolicyConfig {
  version: string;
  severity_policy: {
    sev0: SeverityPolicyConfig;
    sev1: SeverityPolicyConfig;
    sev2: SeverityPolicyConfig;
    sev3: SeverityPolicyConfig;
    sev4: SeverityPolicyConfig;
  };
  risk_flags: Record<string, RiskFlagConfig>;
  review_windows: {
    credit_review_days: number;
    baseline_window_days: number;
    healthy_run_statuses: string[];
  };
  slack: {
    channels: {
      sev0: string;
      sev1: string;
      sev2: string;
      default: string;
    };
  };
  notion: {
    databases: {
      runs_ledger_id: string;
      cases_id: string;
    };
  };
}

/**
 * Baseline data for a scenario
 */
export interface BaselineData {
  scenario_id: string;
  median_credits: number;
  calculated_at: string;
  sample_size: number;
  last_updated: string;
}

/**
 * Credit report scenario summary
 */
export interface ScenarioSummary {
  scenario_id: string;
  total_credits: number;
  run_count: number;
  avg_credits: number;
  baseline: number;
  variance_multiplier: number;
  p95_credits?: number;
  max_credits?: number;
}

/**
 * Credit report structure
 */
export interface CreditReport {
  report_id: string;
  period_start: string;
  period_end: string;
  top_scenarios_by_total: ScenarioSummary[];
  top_spike_runs: RunRecord[];
  baseline_candidates: ScenarioSummary[];
  policy_violations: Array<{
    run_id: string;
    violation_type: string;
    severity: SeverityLevel;
  }>;
  summary_stats: {
    total_credits: number;
    total_runs: number;
    avg_credits_per_run: number;
    sev0_count: number;
    sev1_count: number;
    sev2_count: number;
  };
}

/**
 * Slack Block Kit message structure
 */
export interface SlackMessage {
  blocks: SlackBlock[];
  text?: string; // Fallback text
}

/**
 * Slack Block Kit block types
 */
export type SlackBlock =
  | SlackHeaderBlock
  | SlackSectionBlock
  | SlackActionsBlock
  | SlackContextBlock
  | SlackDividerBlock;

export interface SlackHeaderBlock {
  type: "header";
  text: {
    type: "plain_text";
    text: string;
    emoji?: boolean;
  };
}

export interface SlackSectionBlock {
  type: "section";
  text?: {
    type: "mrkdwn" | "plain_text";
    text: string;
  };
  fields?: Array<{
    type: "mrkdwn" | "plain_text";
    text: string;
  }>;
}

export interface SlackActionsBlock {
  type: "actions";
  elements: Array<{
    type: "button";
    text: {
      type: "plain_text";
      text: string;
      emoji?: boolean;
    };
    url?: string;
    value?: string;
    style?: "primary" | "danger";
  }>;
}

export interface SlackContextBlock {
  type: "context";
  elements: Array<{
    type: "mrkdwn" | "plain_text" | "image";
    text?: string;
    image_url?: string;
    alt_text?: string;
  }>;
}

export interface SlackDividerBlock {
  type: "divider";
}
