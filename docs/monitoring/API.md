# Credit Monitoring System — API Reference

TypeScript API documentation for the SintraPrime Credit Monitoring System modules.

---

## Table of Contents

1. [types.ts](#typests) - Core type definitions
2. [severity-classifier.ts](#severity-classifierts) - Run classification
3. [run-logger.ts](#run-loggerts) - Audit trail logging
4. [case-manager.ts](#case-managerts) - Case creation and management
5. [slack-alert-formatter.ts](#slack-alert-formatterts) - Alert message formatting
6. [credit-aggregator.ts](#credit-aggregatorts) - Weekly reporting
7. [baseline-calculator.ts](#baseline-calculatorts) - Baseline calculation

---

## types.ts

Core type definitions matching Notion schemas and policy configuration.

### Enums

#### `SeverityLevel`
Classification levels for run assessment.

```typescript
enum SeverityLevel {
  SEV0 = "SEV0",  // Critical - PII/Regulatory exposure
  SEV1 = "SEV1",  // High - Significant credit spike
  SEV2 = "SEV2",  // Medium - Moderate variance
  SEV3 = "SEV3",  // Low - Minor variance
  SEV4 = "SEV4",  // Info - Normal operation
}
```

#### `JobType`
Automation job categories.

```typescript
enum JobType {
  BINDER_EXPORT = "BINDER_EXPORT",
  RECONCILE_BACKFILL = "RECONCILE_BACKFILL",
  ANALYSIS = "ANALYSIS",
  OTHER = "OTHER",
}
```

#### `RunStatus`
Run execution outcome.

```typescript
enum RunStatus {
  Success = "Success",
  Failed = "Failed",
  Quarantined = "Quarantined",
  Escalated = "Escalated",
}
```

#### `MisconfigLikelihood`
Probability assessment for misconfiguration.

```typescript
enum MisconfigLikelihood {
  High = "High",      // Net misconfig score ≥6
  Medium = "Medium",  // Net misconfig score ≥3
  Low = "Low",        // Net misconfig score <3
}
```

#### `CaseCategory`
Case type classifications.

```typescript
enum CaseCategory {
  CostCredits = "Cost/Credits",
  DataPII = "Data/PII",
  DeliveryEmail = "Delivery/Email",
  FilingRegulatory = "Filing/Regulatory",
  Reliability = "Reliability",
  Other = "Other",
}
```

#### `CaseStatus`
Case lifecycle states.

```typescript
enum CaseStatus {
  Open = "Open",
  Investigating = "Investigating",
  Mitigating = "Mitigating",
  Resolved = "Resolved",
}
```

#### `ExposureBand`
Risk exposure categories.

```typescript
enum ExposureBand {
  Regulatory = "Regulatory",     // SEV0 with regulatory_data
  Financial = "Financial",       // SEV0/SEV1 credit spikes
  Privacy = "Privacy",           // PII exposure
  Operational = "Operational",   // SEV2/SEV3 issues
}
```

#### `RootCause`
Root cause classifications for cases.

```typescript
enum RootCause {
  Misconfig = "Misconfig",                   // Configuration error
  LegitLoad = "Legit Load",                  // Expected high load
  ExternalDependency = "External Dependency", // Third-party issue
  Unknown = "Unknown",                        // Under investigation
}
```

### Type Aliases

#### `RiskFlag`
Risk indicators for run analysis.

```typescript
type RiskFlag =
  // Misconfig signals
  | "retry_loop"              // Excessive retries (>5)
  | "unbounded_iterator"      // No max_items limit
  | "missing_idempotency"     // No idempotency key
  | "sudden_prompt_growth"    // Prompt expansion without testing
  | "deployment_correlation"  // Spike after recent deploy
  
  // Legit signals
  | "batch_job"               // Batch processing job
  | "backfill_mode"           // Historical data reprocessing
  | "linear_scaling"          // Credits scale linearly with input
  
  // Critical signals
  | "pii_exposure"            // PII data accessed
  | "regulatory_data";        // Regulatory data accessed
```

#### `PolicyAction`
Automated actions triggered by severity.

```typescript
type PolicyAction =
  | "quarantine"                  // Move to runs/QUARANTINE/
  | "block_dispatch"              // Prevent downstream propagation
  | "create_case"                 // Create Notion case
  | "page_lock"                   // Lock Notion page (read-only)
  | "slack_escalate"              // Send to #ops-critical
  | "slack_alert"                 // Send to severity-specific channel
  | "require_ack_before_rerun"    // Block rerun until O2 approval
  | "log_case_optional"           // Case creation at operator discretion
  | "weekly_review"               // Include in weekly forensics
  | "ledger_only"                 // Log only, no actions
  | "weekly_review_optional";     // Optional weekly review
```

### Interfaces

#### `RunRecord`
Complete run record matching Notion RUNS_LEDGER schema.

```typescript
interface RunRecord {
  // Identifiers
  Run_ID: string;                          // Unique run identifier
  Timestamp: string;                       // ISO 8601 date-time
  Scenario_Name: string;                   // Human-readable scenario name
  Scenario_ID?: string;                    // Unique scenario identifier
  
  // Job metadata
  Job_Type: JobType;                       // Job category
  Status: RunStatus;                       // Execution outcome
  
  // Credit metrics
  Credits_Total: number;                   // Total credits consumed
  Credits_In?: number;                     // Input processing credits
  Credits_Out?: number;                    // Output generation credits
  
  // Model details
  Model?: string;                          // LLM model used
  Input_Tokens?: number;                   // Input token count
  Output_Tokens?: number;                  // Output token count
  
  // Artifacts
  Artifacts_Link?: string;                 // URL to run artifacts
  
  // Classification (populated by severity-classifier)
  Severity: SeverityLevel;                 // SEV0-4 classification
  Risk_Flags?: RiskFlag[];                 // Detected risk signals
  Risk_Summary?: string;                   // Human-readable summary
  Misconfig_Likelihood: MisconfigLikelihood;
  Baseline_Expected_Credits?: number;      // Baseline for comparison
  Variance_Multiplier: number;             // actual / baseline
  
  // Additional metadata (not in Notion)
  retry_count?: number;                    // Number of retries
  has_max_items_config?: boolean;          // Iterator bound check
  has_idempotency_key?: boolean;           // Idempotency check
  prompt_version?: string;                 // Prompt version identifier
  deployment_timestamp?: string;           // Recent deployment time
  is_batch_job?: boolean;                  // Batch job flag
  is_backfill?: boolean;                   // Backfill mode flag
  input_item_count?: number;               // Number of items processed
}
```

**Example:**
```typescript
const run: RunRecord = {
  Run_ID: "RUN-20240123-ABC123",
  Timestamp: "2024-01-23T14:30:00Z",
  Scenario_Name: "BINDER_EXPORT_WEEKLY",
  Scenario_ID: "binder_export_v1",
  Job_Type: JobType.BINDER_EXPORT,
  Status: RunStatus.Success,
  Credits_Total: 6250,
  Credits_In: 2500,
  Credits_Out: 3750,
  Model: "gpt-4",
  Input_Tokens: 125000,
  Output_Tokens: 187500,
  Artifacts_Link: "https://example.com/artifacts/RUN-20240123-ABC123",
  Severity: SeverityLevel.SEV1,
  Risk_Flags: ["unbounded_iterator", "retry_loop"],
  Risk_Summary: "Variance: 5.00× | Misconfig likelihood: Medium | Misconfig signals: unbounded_iterator, retry_loop",
  Misconfig_Likelihood: MisconfigLikelihood.Medium,
  Baseline_Expected_Credits: 1250,
  Variance_Multiplier: 5.0,
  retry_count: 7,
  has_max_items_config: false,
  has_idempotency_key: true,
};
```

#### `CaseRecord`
Case record matching Notion CASES schema.

```typescript
interface CaseRecord {
  // Identifiers
  Case_ID: string;                         // Format: CASE-YYYYMMDD-XXXXXX
  Title: string;                           // Case title
  
  // Classification
  Category: CaseCategory;                  // Case type
  Severity: SeverityLevel;                 // Inherited from run
  Exposure_Band: ExposureBand;             // Risk exposure level
  Status: CaseStatus;                      // Lifecycle state
  
  // Links
  Slack_Thread_URL?: string;               // Slack thread for discussion
  
  // Analysis
  Root_Cause?: RootCause;                  // Root cause classification
  
  // Relations (Notion)
  Primary_Run_ID?: string;                 // Triggering run
  Related_Run_IDs?: string[];              // Additional related runs
  
  // Timestamps
  Created_At?: string;                     // ISO 8601
  Updated_At?: string;                     // ISO 8601
  Resolved_At?: string;                    // ISO 8601
  
  // Notion integration
  notion_url?: string;                     // Notion page URL
}
```

**Example:**
```typescript
const case: CaseRecord = {
  Case_ID: "CASE-20240123-A1B2C3",
  Title: "SEV1 • Credit Spike • BINDER_EXPORT_WEEKLY",
  Category: CaseCategory.CostCredits,
  Severity: SeverityLevel.SEV1,
  Exposure_Band: ExposureBand.Financial,
  Status: CaseStatus.Investigating,
  Slack_Thread_URL: "https://workspace.slack.com/archives/C123/p1234567890",
  Root_Cause: RootCause.Misconfig,
  Primary_Run_ID: "RUN-20240123-ABC123",
  Related_Run_IDs: ["RUN-20240123-ABC123"],
  Created_At: "2024-01-23T14:35:00Z",
  Updated_At: "2024-01-23T15:00:00Z",
  notion_url: "https://notion.so/case-CASE-20240123-A1B2C3",
};
```

#### `Classification`
Result of severity classification.

```typescript
interface Classification {
  severity: SeverityLevel;                 // SEV0-4 classification
  misconfigLikelihood: MisconfigLikelihood;
  riskFlags: RiskFlag[];                   // Detected risk signals
  varianceMultiplier: number;              // actual / baseline
  misconfigScore: number;                  // Misconfig signal weight sum
  legitScore: number;                      // Legit signal weight sum
  actions: PolicyAction[];                 // Actions to execute
}
```

#### `MisconfigAssessment`
Detailed misconfig scoring.

```typescript
interface MisconfigAssessment {
  likelihood: MisconfigLikelihood;
  score: number;                           // Net score (misconfig - legit)
  signals: {
    misconfig: Array<{
      flag: RiskFlag;
      weight: number;
    }>;
    legit: Array<{
      flag: RiskFlag;
      weight: number;
    }>;
  };
}
```

#### `BaselineData`
Baseline credit data for a scenario.

```typescript
interface BaselineData {
  scenario_id: string;                     // Scenario identifier
  median_credits: number;                  // Median of healthy runs
  calculated_at: string;                   // ISO 8601 timestamp
  sample_size: number;                     // Number of runs in calculation
  last_updated: string;                    // ISO 8601 timestamp
}
```

#### `ScenarioSummary`
Scenario credit summary for reports.

```typescript
interface ScenarioSummary {
  scenario_id: string;
  total_credits: number;                   // Sum over period
  run_count: number;                       // Number of runs
  avg_credits: number;                     // Average per run
  baseline: number;                        // Expected baseline
  variance_multiplier: number;             // avg / baseline
  p95_credits?: number;                    // 95th percentile
  max_credits?: number;                    // Maximum credit spend
}
```

#### `CreditReport`
Weekly credit review report.

```typescript
interface CreditReport {
  report_id: string;                       // Format: CREDIT_REVIEW_YYYY-MM-DD
  period_start: string;                    // ISO 8601
  period_end: string;                      // ISO 8601
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
```

#### `PolicyConfig`
Policy configuration structure (loaded from `config/sintraprime-policy.json`).

```typescript
interface PolicyConfig {
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
```

#### Slack Types

```typescript
interface SlackMessage {
  blocks: SlackBlock[];
  text?: string;  // Fallback text for notifications
}

type SlackBlock =
  | SlackHeaderBlock
  | SlackSectionBlock
  | SlackActionsBlock
  | SlackContextBlock
  | SlackDividerBlock;

interface SlackHeaderBlock {
  type: "header";
  text: {
    type: "plain_text";
    text: string;
    emoji?: boolean;
  };
}

interface SlackSectionBlock {
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

interface SlackActionsBlock {
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
```

---

## severity-classifier.ts

Assigns severity level and misconfig likelihood to automation runs.

### Functions

#### `classifyRun()`
Main classification function.

```typescript
function classifyRun(
  runData: RunRecord,
  baseline: number,
  policyConfig: PolicyConfig
): Classification
```

**Parameters:**
- `runData` - Complete run record with credit metrics
- `baseline` - Expected baseline credits for this scenario
- `policyConfig` - Policy configuration from `config/sintraprime-policy.json`

**Returns:** `Classification` object with severity, risk flags, and policy actions.

**Algorithm:**
1. Calculate `varianceMultiplier = runData.Credits_Total / baseline`
2. Identify risk flags based on run metadata
3. Score misconfig likelihood (weighted sum of signals)
4. Determine severity based on variance and flags
5. Look up policy actions from config

**Example:**
```typescript
import { classifyRun } from "./severity-classifier.js";
import { getBaseline } from "./baseline-calculator.js";
import policyConfig from "../config/sintraprime-policy.json";

const runData: RunRecord = {
  Run_ID: "RUN-20240123-ABC123",
  Credits_Total: 6250,
  Scenario_ID: "binder_export_v1",
  retry_count: 7,
  has_max_items_config: false,
  // ... other fields
};

const baseline = getBaseline("binder_export_v1"); // 1250
const classification = classifyRun(runData, baseline, policyConfig);

console.log(classification.severity);  // "SEV1"
console.log(classification.varianceMultiplier);  // 5.0
console.log(classification.misconfigLikelihood);  // "Medium"
console.log(classification.riskFlags);  // ["retry_loop", "unbounded_iterator"]
console.log(classification.actions);  // ["create_case", "slack_alert", "require_ack_before_rerun"]
```

#### `generateRiskSummary()`
Generate human-readable risk summary text.

```typescript
function generateRiskSummary(classification: Classification): string
```

**Parameters:**
- `classification` - Classification result from `classifyRun()`

**Returns:** Summary string for logging and display.

**Example:**
```typescript
const summary = generateRiskSummary(classification);
// "Variance: 5.00× | Misconfig likelihood: Medium | Misconfig signals: retry_loop, unbounded_iterator"
```

### Internal Functions

#### `assessMisconfig()`
Calculate misconfig likelihood score.

```typescript
function assessMisconfig(
  riskFlags: RiskFlag[],
  policyConfig: PolicyConfig
): MisconfigAssessment
```

#### `determineSeverity()`
Assign severity level based on variance and flags.

```typescript
function determineSeverity(
  varianceMultiplier: number,
  riskFlags: RiskFlag[],
  policyConfig: PolicyConfig
): SeverityLevel
```

#### `getPolicyActions()`
Look up policy actions for a severity level.

```typescript
function getPolicyActions(
  severity: SeverityLevel,
  policyConfig: PolicyConfig
): string[]
```

---

## run-logger.ts

Writes run records to local audit trail and optionally syncs to Notion.

### Functions

#### `logRun()`
Log a run to the audit trail.

```typescript
async function logRun(runData: RunRecord): Promise<void>
```

**Parameters:**
- `runData` - Complete run record with classification

**Side Effects:**
1. Writes `runs/CREDIT_MONITORING/<date>/run_<RUN_ID>.json`
2. Generates `.sha256` sidecar for integrity verification
3. Appends to `runs/CREDIT_MONITORING/ledger.jsonl`
4. Optionally syncs to Notion (if `NOTION_RUNS_LEDGER_DB_ID` set)

**Example:**
```typescript
import { logRun } from "./run-logger.js";

const runData: RunRecord = {
  Run_ID: "RUN-20240123-ABC123",
  Timestamp: new Date().toISOString(),
  Credits_Total: 6250,
  Severity: SeverityLevel.SEV1,
  // ... other fields
};

await logRun(runData);
// Output:
// [run-logger] Logged run RUN-20240123-ABC123 to runs/CREDIT_MONITORING/2024-01-23/run_RUN-20240123-ABC123.json
// [run-logger] SHA-256: a3f5d9c2e1b8...
```

#### `readRunsFromLedger()`
Read runs from ledger within a date range.

```typescript
function readRunsFromLedger(
  startDate: Date,
  endDate: Date
): RunRecord[]
```

**Parameters:**
- `startDate` - Start of date range (inclusive)
- `endDate` - End of date range (inclusive)

**Returns:** Array of `RunRecord` objects within the date range.

**Example:**
```typescript
import { readRunsFromLedger } from "./run-logger.js";

const startDate = new Date("2024-01-16");
const endDate = new Date("2024-01-23");
const runs = readRunsFromLedger(startDate, endDate);

console.log(`Found ${runs.length} runs`);
```

#### `getRunsByScenario()`
Get all runs for a specific scenario.

```typescript
function getRunsByScenario(
  scenarioId: string,
  limit?: number
): RunRecord[]
```

**Parameters:**
- `scenarioId` - Scenario identifier
- `limit` - Optional maximum number of runs to return

**Returns:** Array of `RunRecord` objects for the scenario.

**Example:**
```typescript
import { getRunsByScenario } from "./run-logger.js";

const runs = getRunsByScenario("binder_export_v1", 10);
console.log(`Last 10 runs for binder_export_v1`);
```

#### `verifyRunArtifact()`
Verify SHA-256 integrity of a run artifact.

```typescript
function verifyRunArtifact(runId: string, dateStr: string): boolean
```

**Parameters:**
- `runId` - Run identifier (e.g., "RUN-20240123-ABC123")
- `dateStr` - Date string in YYYY-MM-DD format

**Returns:** `true` if SHA-256 matches, `false` otherwise.

**Example:**
```typescript
import { verifyRunArtifact } from "./run-logger.js";

const isValid = verifyRunArtifact("RUN-20240123-ABC123", "2024-01-23");
if (isValid) {
  console.log("Run artifact integrity verified");
} else {
  console.error("SHA-256 mismatch - artifact may be tampered");
}
```

---

## case-manager.ts

Creates and manages Notion CASES for runs requiring investigation.

### Functions

#### `createCase()`
Create a new case for a run.

```typescript
async function createCase(
  runRecord: RunRecord,
  severity: SeverityLevel,
  riskFlags: RiskFlag[]
): Promise<CaseRecord>
```

**Parameters:**
- `runRecord` - Run that triggered case creation
- `severity` - Severity level (SEV0-2)
- `riskFlags` - Risk flags detected during classification

**Returns:** Created `CaseRecord` with generated Case_ID and Notion URL.

**Side Effects:**
- Generates unique Case_ID (format: `CASE-YYYYMMDD-XXXXXX`)
- Writes to Notion CASES database
- Links run to case via Primary_Run_ID

**Example:**
```typescript
import { createCase } from "./case-manager.js";

const caseRecord = await createCase(
  runRecord,
  SeverityLevel.SEV1,
  ["retry_loop", "unbounded_iterator"]
);

console.log(`Created case: ${caseRecord.Case_ID}`);
console.log(`Notion URL: ${caseRecord.notion_url}`);
```

#### `linkRunToCase()`
Link an additional run to an existing case.

```typescript
async function linkRunToCase(
  runId: string,
  caseId: string
): Promise<void>
```

**Parameters:**
- `runId` - Run identifier to link
- `caseId` - Existing case identifier

**Side Effects:**
- Updates Notion case page to add run to `Related_Run_IDs`

**Example:**
```typescript
import { linkRunToCase } from "./case-manager.js";

await linkRunToCase("RUN-20240124-XYZ789", "CASE-20240123-A1B2C3");
```

#### `updateCaseStatus()`
Update case status and optionally set root cause.

```typescript
async function updateCaseStatus(
  caseId: string,
  status: CaseStatus,
  rootCause?: RootCause
): Promise<void>
```

**Parameters:**
- `caseId` - Case identifier
- `status` - New status (Open, Investigating, Mitigating, Resolved)
- `rootCause` - Optional root cause classification

**Side Effects:**
- Updates Notion case page with new status
- Sets `Resolved_At` timestamp if status is "Resolved"

**Example:**
```typescript
import { updateCaseStatus, CaseStatus, RootCause } from "./case-manager.js";

// Mark case as under investigation
await updateCaseStatus("CASE-20240123-A1B2C3", CaseStatus.Investigating);

// Resolve case with root cause
await updateCaseStatus(
  "CASE-20240123-A1B2C3",
  CaseStatus.Resolved,
  RootCause.Misconfig
);
```

#### `updateCaseSlackThread()`
Add Slack thread URL to case.

```typescript
async function updateCaseSlackThread(
  caseId: string,
  slackThreadUrl: string
): Promise<void>
```

**Parameters:**
- `caseId` - Case identifier
- `slackThreadUrl` - Slack thread URL (permalink format)

**Side Effects:**
- Updates Notion case page with `Slack_Thread_URL`

**Example:**
```typescript
import { updateCaseSlackThread } from "./case-manager.js";

await updateCaseSlackThread(
  "CASE-20240123-A1B2C3",
  "https://workspace.slack.com/archives/C123/p1234567890"
);
```

---

## slack-alert-formatter.ts

Generates Slack Block Kit messages for credit monitoring alerts.

### Functions

#### `formatAlert()`
Format a run alert for Slack.

```typescript
function formatAlert(
  runRecord: RunRecord,
  classification: Classification,
  caseUrl: string,
  runUrl: string
): SlackMessage
```

**Parameters:**
- `runRecord` - Run that triggered the alert
- `classification` - Classification result with severity and risk flags
- `caseUrl` - URL to Notion case page
- `runUrl` - URL to run details

**Returns:** Slack Block Kit message with header, fields, buttons, and context.

**Example:**
```typescript
import { formatAlert } from "./slack-alert-formatter.js";

const message = formatAlert(
  runRecord,
  classification,
  "https://notion.so/case-CASE-20240123-A1B2C3",
  "https://notion.so/run-RUN-20240123-ABC123"
);

// message.blocks contains formatted Slack blocks
// message.text contains fallback text for notifications
```

**Message Structure:**
```
🔴 SEV1 • Credit Spike • BINDER_EXPORT_WEEKLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Credits: 6,250 (Baseline 1,250) → 5.00×
Job Type: BINDER_EXPORT
Misconfig Likelihood: Medium
Risk Flags: retry_loop, unbounded_iterator
Run ID: RUN-20240123-ABC123
Timestamp: 2024-01-23T14:30:00Z

[Open Case] [View Run] [Artifacts]

Auto-actions: Rerun requires acknowledgment
```

#### `formatWeeklySummary()`
Format a weekly credit review summary for Slack.

```typescript
function formatWeeklySummary(
  reportId: string,
  notionReportUrl: string,
  topScenarios: Array<{
    scenario_id: string;
    total_credits: number;
    variance_multiplier: number;
  }>,
  totalCredits: number,
  sev0Count: number,
  sev1Count: number
): SlackMessage
```

**Parameters:**
- `reportId` - Report identifier (e.g., "CREDIT_REVIEW_2024-01-23")
- `notionReportUrl` - URL to Notion report page
- `topScenarios` - Top 5 scenarios by credit spend
- `totalCredits` - Total credits over review period
- `sev0Count` - Number of SEV0 incidents
- `sev1Count` - Number of SEV1 incidents

**Returns:** Slack Block Kit message with summary stats and top scenarios.

**Example:**
```typescript
import { formatWeeklySummary } from "./slack-alert-formatter.js";

const message = formatWeeklySummary(
  "CREDIT_REVIEW_2024-01-23",
  "https://notion.so/report-2024-01-23",
  [
    { scenario_id: "binder_export_v1", total_credits: 35000, variance_multiplier: 1.2 },
    { scenario_id: "reconcile_daily", total_credits: 28000, variance_multiplier: 1.0 },
    // ...
  ],
  125000,
  1,
  3
);
```

#### `sendSlackAlert()`
Send Slack message to webhook (stub implementation).

```typescript
async function sendSlackAlert(
  message: SlackMessage,
  webhookUrl: string
): Promise<void>
```

**Parameters:**
- `message` - Formatted Slack message
- `webhookUrl` - Slack webhook URL

**Side Effects:**
- POSTs JSON payload to webhook URL
- Logs message to console (in current stub implementation)

**Example:**
```typescript
import { sendSlackAlert } from "./slack-alert-formatter.js";

await sendSlackAlert(
  message,
  process.env.SLACK_WEBHOOK_URL_SEV1!
);
```

---

## credit-aggregator.ts

Generates weekly forensics reports on credit spend by scenario.

### Functions

#### `aggregateCredits()`
Aggregate credits over the last N days.

```typescript
async function aggregateCredits(daysBack = 7): Promise<CreditReport>
```

**Parameters:**
- `daysBack` - Number of days to aggregate (default: 7)

**Returns:** `CreditReport` with scenario summaries, spike runs, and policy violations.

**Algorithm:**
1. Read runs from ledger for date range
2. Group by scenario
3. Calculate per-scenario: total, average, P95, max, variance
4. Identify top 5 scenarios by total credits
5. Identify top 5 spike runs by variance multiplier
6. Find stable scenarios eligible for baseline updates
7. List policy violations (SEV0/SEV1 incidents)

**Example:**
```typescript
import { aggregateCredits } from "./credit-aggregator.js";

const report = await aggregateCredits(7);

console.log(`Total credits: ${report.summary_stats.total_credits}`);
console.log(`Total runs: ${report.summary_stats.total_runs}`);
console.log(`SEV0: ${report.summary_stats.sev0_count}, SEV1: ${report.summary_stats.sev1_count}`);

report.top_scenarios_by_total.forEach((s, i) => {
  console.log(`${i + 1}. ${s.scenario_id}: ${s.total_credits} credits`);
});
```

#### `generateWeeklyReport()`
Generate and save weekly credit review report.

```typescript
async function generateWeeklyReport(): Promise<void>
```

**Side Effects:**
1. Calls `aggregateCredits(7)` to generate report
2. Writes report JSON to `runs/CREDIT_REVIEWS/weekly_<timestamp>.json`
3. Generates `.sha256` sidecar for integrity verification
4. Optionally creates Notion page (if `NOTION_API_TOKEN` set)
5. Optionally sends Slack summary (if `SLACK_WEBHOOK_URL_DEFAULT` set)
6. Prints summary to console

**Example:**
```typescript
import { generateWeeklyReport } from "./credit-aggregator.js";

await generateWeeklyReport();
// Output:
// [credit-aggregator] Generating weekly credit review...
// [credit-aggregator] Report written to runs/CREDIT_REVIEWS/weekly_2024-01-23T12-00-00-000Z.json
// [credit-aggregator] SHA-256: b4e7d8...
//
// === Weekly Credit Review Summary ===
// Period: 2024-01-16T00:00:00Z to 2024-01-23T23:59:59Z
// Total Credits: 125,000
// Total Runs: 450
// SEV0: 1, SEV1: 3, SEV2: 12
//
// Top 5 Scenarios by Credit Spend:
//   1. binder_export_v1: 35,000 credits (1.20× baseline)
//   2. reconcile_daily: 28,000 credits (1.00× baseline)
//   ...
```

---

## baseline-calculator.ts

Calculates "healthy" baseline credit spend per scenario for variance detection.

### Functions

#### `calculateBaseline()`
Calculate baseline credit spend for a scenario.

```typescript
async function calculateBaseline(
  scenarioId: string,
  daysBack = 30
): Promise<number>
```

**Parameters:**
- `scenarioId` - Scenario identifier
- `daysBack` - Number of days to include in calculation (default: 30)

**Returns:** Median credits of healthy runs, or 0 if insufficient data.

**Algorithm:**
1. Get all runs for scenario from ledger
2. Filter to "healthy" runs within date range:
   - Status = "Success"
   - retry_count ≤ 1
3. Calculate median credits (robust to outliers)

**Example:**
```typescript
import { calculateBaseline } from "./baseline-calculator.js";

const baseline = await calculateBaseline("binder_export_v1", 30);
console.log(`Baseline: ${baseline.toFixed(2)} credits`);
// Output: Baseline: 1250.50 credits
```

#### `updateAllBaselines()`
Update baselines for all scenarios.

```typescript
async function updateAllBaselines(): Promise<void>
```

**Side Effects:**
1. Reads all runs from last 30 days
2. Groups by scenario
3. Calculates baseline for each scenario
4. Saves to `config/credit-baselines.json`
5. Prints summary of updates

**Example:**
```typescript
import { updateAllBaselines } from "./baseline-calculator.js";

await updateAllBaselines();
// Output:
// [baseline-calculator] Updating baselines for all scenarios...
// [baseline-calculator] Updated 12 baselines
//   - binder_export_v1: 1250.50 credits (n=28)
//   - reconcile_daily: 875.25 credits (n=35)
//   ...
```

#### `getBaseline()`
Get current baseline for a scenario.

```typescript
function getBaseline(scenarioId: string): number
```

**Parameters:**
- `scenarioId` - Scenario identifier

**Returns:** Baseline credits, or 0 if not found.

**Example:**
```typescript
import { getBaseline } from "./baseline-calculator.js";

const baseline = getBaseline("binder_export_v1");
if (baseline > 0) {
  console.log(`Baseline: ${baseline} credits`);
} else {
  console.warn("No baseline found - using default");
}
```

#### `isScenarioStable()`
Check if a scenario is stable (eligible for baseline update).

```typescript
function isScenarioStable(
  scenarioId: string,
  weeksBack = 2
): boolean
```

**Parameters:**
- `scenarioId` - Scenario identifier
- `weeksBack` - Number of weeks to check (default: 2)

**Returns:** `true` if scenario is stable, `false` otherwise.

**Stability Criteria:**
- No SEV0/SEV1 incidents in the period
- At least 5 runs in the period
- Coefficient of variation < 0.3 (low variance)

**Example:**
```typescript
import { isScenarioStable } from "./baseline-calculator.js";

if (isScenarioStable("binder_export_v1", 2)) {
  console.log("Scenario is stable - eligible for baseline update");
} else {
  console.log("Scenario is unstable - defer baseline update");
}
```

---

## Usage Examples

### Complete Run Processing Pipeline

```typescript
import { classifyRun, generateRiskSummary } from "./severity-classifier.js";
import { logRun } from "./run-logger.js";
import { createCase } from "./case-manager.js";
import { formatAlert, sendSlackAlert } from "./slack-alert-formatter.js";
import { getBaseline } from "./baseline-calculator.js";
import policyConfig from "../config/sintraprime-policy.json";

// 1. Prepare run data
const runData: RunRecord = {
  Run_ID: "RUN-20240123-ABC123",
  Timestamp: new Date().toISOString(),
  Scenario_Name: "BINDER_EXPORT_WEEKLY",
  Scenario_ID: "binder_export_v1",
  Job_Type: JobType.BINDER_EXPORT,
  Status: RunStatus.Success,
  Credits_Total: 6250,
  Credits_In: 2500,
  Credits_Out: 3750,
  Model: "gpt-4",
  retry_count: 7,
  has_max_items_config: false,
  has_idempotency_key: true,
  // ... other fields
};

// 2. Get baseline and classify
const baseline = getBaseline(runData.Scenario_ID);
const classification = classifyRun(runData, baseline, policyConfig);

// 3. Enrich run data with classification
runData.Severity = classification.severity;
runData.Risk_Flags = classification.riskFlags;
runData.Risk_Summary = generateRiskSummary(classification);
runData.Misconfig_Likelihood = classification.misconfigLikelihood;
runData.Baseline_Expected_Credits = baseline;
runData.Variance_Multiplier = classification.varianceMultiplier;

// 4. Log run to audit trail
await logRun(runData);

// 5. Execute policy actions
if (classification.actions.includes("create_case")) {
  const caseRecord = await createCase(
    runData,
    classification.severity,
    classification.riskFlags
  );
  
  if (classification.actions.includes("slack_alert")) {
    const message = formatAlert(
      runData,
      classification,
      caseRecord.notion_url!,
      `https://notion.so/run-${runData.Run_ID}`
    );
    
    const webhookUrl = classification.severity === "SEV0"
      ? process.env.SLACK_WEBHOOK_URL_SEV0!
      : process.env.SLACK_WEBHOOK_URL_SEV1!;
    
    await sendSlackAlert(message, webhookUrl);
  }
}

console.log(`Run ${runData.Run_ID} processed: ${classification.severity}`);
```

### Weekly Review Automation

```typescript
import { generateWeeklyReport } from "./credit-aggregator.js";
import { updateAllBaselines } from "./baseline-calculator.js";

// Run every Monday at 10:00 AM
async function weeklyReviewJob() {
  console.log("Starting weekly credit review...");
  
  // Generate report
  await generateWeeklyReport();
  
  // Update baselines for stable scenarios
  await updateAllBaselines();
  
  console.log("Weekly review complete");
}

// Schedule with cron or similar
weeklyReviewJob();
```

---

## Environment Variables

```bash
# Notion integration
NOTION_TOKEN="secret_..."
NOTION_RUNS_LEDGER_DB_ID="abc123..."
NOTION_CASES_DB_ID="def456..."

# Slack webhooks
SLACK_WEBHOOK_URL_SEV0="https://hooks.slack.com/services/..."
SLACK_WEBHOOK_URL_SEV1="https://hooks.slack.com/services/..."
SLACK_WEBHOOK_URL_SEV2="https://hooks.slack.com/services/..."
SLACK_WEBHOOK_URL_DEFAULT="https://hooks.slack.com/services/..."

# Optional overrides
CREDIT_BASELINES_PATH="./config/credit-baselines.json"
```

---

## Error Handling

All functions follow these error handling conventions:

1. **Local operations** (ledger writes, baseline reads) fail fast with clear errors
2. **External operations** (Notion sync, Slack alerts) log errors and continue
3. **Missing baselines** default to 0 (flags all runs for review)
4. **Missing policy config** fails fast (no silent behavior)
5. **SHA-256 mismatches** throw errors (data integrity critical)

**Example:**
```typescript
try {
  await logRun(runData);
} catch (err) {
  console.error("Failed to log run:", err);
  // Local write failure is critical - stop processing
  throw err;
}

try {
  await sendSlackAlert(message, webhookUrl);
} catch (err) {
  console.error("Failed to send Slack alert:", err);
  // Slack failure is non-critical - continue processing
  // Alert can be retrieved from ledger later
}
```

---

## Version History

- **v1.0 (2024-01):** Initial API documentation
