# Credit Monitoring System — Architecture

## Overview

The Credit Monitoring System is an **audit-first**, governance-backed subsystem for tracking, classifying, and alerting on automation credit usage across SintraPrime. It implements a severity-based classification model with automated response actions, Notion-backed case management, and append-only audit trails.

**Design Philosophy:**
- Audit-first: All run data logged locally with SHA-256 integrity before external sync
- Deterministic: Classification and actions based on stable policy configuration
- Observable: Full trail from run → classification → action → case → resolution
- Non-authoritative UI: Notion serves as a view, not a source of truth

## System Components

### 1. Run Logger (`src/monitoring/run-logger.ts`)

**Purpose:** Write run records to local audit trail and optionally sync to Notion.

**Responsibilities:**
- Write run JSON to `runs/CREDIT_MONITORING/<date>/run_<RUN_ID>.json`
- Generate `.sha256` sidecar for integrity verification
- Append to `runs/CREDIT_MONITORING/ledger.jsonl` (append-only)
- Optionally sync to Notion RUNS_LEDGER database

**Audit Trail Structure:**
```
runs/
  CREDIT_MONITORING/
    ledger.jsonl                           # append-only, newline-delimited JSON
    2024-01-23/
      run_RUN-20240123-ABC123.json         # full run record
      run_RUN-20240123-ABC123.json.sha256  # integrity hash
    2024-01-24/
      ...
```

**Key Invariants:**
- Never modify existing run artifacts
- SHA-256 must match JSON content
- Ledger is append-only (no edits)
- Local write always succeeds before Notion sync attempt

### 2. Severity Classifier (`src/monitoring/severity-classifier.ts`)

**Purpose:** Assign severity level (SEV0-4) and misconfig likelihood to each run based on credit variance and risk signals.

**Classification Algorithm:**

1. **Calculate variance multiplier:**
   ```
   variance_multiplier = actual_credits / baseline_credits
   ```

2. **Identify risk flags:**
   - **Misconfig signals:** retry_loop, unbounded_iterator, missing_idempotency, sudden_prompt_growth, deployment_correlation
   - **Legit signals:** batch_job, backfill_mode, linear_scaling
   - **Critical signals:** pii_exposure, regulatory_data

3. **Score misconfig likelihood:**
   - Sum weighted misconfig signals
   - Subtract weighted legit signals
   - Net score → High/Medium/Low likelihood

4. **Determine severity:**
   - **SEV0:** PII/regulatory exposure + variance ≥10×
   - **SEV1:** variance ≥5×
   - **SEV2:** variance ≥2×
   - **SEV3:** variance ≥1.5×
   - **SEV4:** normal operation

5. **Look up policy actions:**
   - Read from `config/sintraprime-policy.json`
   - Return action list (quarantine, create_case, slack_alert, etc.)

**Policy-Driven:**
All thresholds and weights are defined in `config/sintraprime-policy.json`. Changing policy does not require code changes.

### 3. Case Manager (`src/monitoring/case-manager.ts`)

**Purpose:** Create and manage Notion CASES for runs requiring investigation.

**Case Lifecycle:**
```
Run → Classification → [if severity ≥ SEV2 or has PII flag]
  → createCase()
    → Generate CASE-YYYYMMDD-XXXXXX ID
    → Determine category (Cost/Credits, Data/PII, Filing/Regulatory)
    → Determine exposure band (Regulatory, Financial, Privacy, Operational)
    → Write to Notion CASES database
    → Link run to case (Related_Run_IDs)
```

**Case Categories:**
- **Cost/Credits:** Credit spike without data exposure
- **Data/PII:** PII exposure risk
- **Delivery/Email:** Email delivery issues (not currently used for credit monitoring)
- **Filing/Regulatory:** Regulatory data exposure
- **Reliability:** System reliability issues
- **Other:** Miscellaneous

**Exposure Bands:**
- **Regulatory:** SEV0 with regulatory_data flag
- **Financial:** SEV0/SEV1 credit spikes
- **Privacy:** PII exposure
- **Operational:** SEV2/SEV3 issues

### 4. Baseline Calculator (`src/monitoring/baseline-calculator.ts`)

**Purpose:** Calculate "healthy" baseline credit spend per scenario for variance detection.

**Algorithm:**
1. Pull last 30 days of runs for scenario
2. Filter to "healthy" runs:
   - Status = Success
   - retry_count ≤ 1
   - No SEV0/SEV1 classifications
3. Calculate **median** credits (not mean, to avoid outlier skew)
4. Store in `config/credit-baselines.json`

**Baseline Update Schedule:**
- Weekly review checks for stable scenarios
- Scenario is "stable" if:
  - No SEV0/SEV1 incidents in last 2 weeks
  - Coefficient of variation < 0.3
  - At least 5 healthy runs
- Only stable scenarios get baseline updates

**Baseline Format:**
```json
{
  "version": "1.0.0",
  "updated_at": "2024-01-23T12:00:00Z",
  "baselines": [
    {
      "scenario_id": "BINDER_EXPORT_WEEKLY",
      "median_credits": 1250.5,
      "calculated_at": "2024-01-23T12:00:00Z",
      "sample_size": 28,
      "last_updated": "2024-01-23T12:00:00Z"
    }
  ]
}
```

### 5. Credit Aggregator (`src/monitoring/credit-aggregator.ts`)

**Purpose:** Generate weekly forensics reports on credit spend by scenario.

**Weekly Review Process:**
1. Pull last 7 days of runs from ledger
2. Group by scenario
3. Calculate per-scenario:
   - Total credits
   - Run count
   - Average, P95, max credits
   - Variance from baseline
4. Identify:
   - Top 5 scenarios by total spend
   - Top 5 spike runs (highest variance)
   - Baseline update candidates (stable scenarios)
   - Policy violations (SEV0/SEV1)
5. Write report to `runs/CREDIT_REVIEWS/weekly_<timestamp>.json` with SHA-256
6. Optionally create Notion page and Slack summary

**Report Structure:**
```json
{
  "report_id": "CREDIT_REVIEW_2024-01-23",
  "period_start": "2024-01-16T00:00:00Z",
  "period_end": "2024-01-23T23:59:59Z",
  "top_scenarios_by_total": [...],
  "top_spike_runs": [...],
  "baseline_candidates": [...],
  "policy_violations": [...],
  "summary_stats": {
    "total_credits": 125000,
    "total_runs": 450,
    "avg_credits_per_run": 277.8,
    "sev0_count": 1,
    "sev1_count": 3,
    "sev2_count": 12
  }
}
```

### 6. Slack Alert Formatter (`src/monitoring/slack-alert-formatter.ts`)

**Purpose:** Generate Slack Block Kit messages for alerts and weekly summaries.

**Alert Format:**
```
🔴 SEV1 • Credit Spike • BINDER_EXPORT_WEEKLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Credits: 6,250 (Baseline 1,250) → 5.00×
Job Type: BINDER_EXPORT
Misconfig Likelihood: Medium
Risk Flags: unbounded_iterator, retry_loop
Run ID: RUN-20240123-ABC123
Timestamp: 2024-01-23T14:30:00Z

[Open Case] [View Run] [Artifacts]

Auto-actions: Quarantined artifacts / Rerun requires acknowledgment
```

**Severity-Based Routing:**
- SEV0 → `#ops-critical` (red alert button)
- SEV1 → `#ops-alerts`
- SEV2 → `#ops-review`
- SEV3/SEV4 → `#ops-monitoring`

## Data Flow

### Run Execution Flow
```
[Automation Run] 
  → Calculate credits (in/out/total)
  → Determine job type, scenario ID
  ↓
[Severity Classifier]
  → Load baseline from config/credit-baselines.json
  → Calculate variance_multiplier
  → Identify risk flags (retry_loop, unbounded_iterator, etc.)
  → Score misconfig vs legit signals
  → Assign severity (SEV0-4)
  → Look up policy actions
  ↓
[Run Logger]
  → Write run JSON with classification
  → Generate .sha256 sidecar
  → Append to ledger.jsonl
  → (Optional) Sync to Notion RUNS_LEDGER
  ↓
[Policy Actions] (based on severity)
  → SEV0: quarantine + block_dispatch + create_case + page_lock + slack_escalate
  → SEV1: create_case + slack_alert + require_ack_before_rerun
  → SEV2: log_case_optional + weekly_review
  → SEV3/SEV4: ledger_only
  ↓
[Case Manager] (if create_case action)
  → Generate CASE-YYYYMMDD-XXXXXX
  → Determine category and exposure band
  → Write to Notion CASES
  → Link run to case
  ↓
[Slack Alert Formatter] (if slack_alert or slack_escalate)
  → Format Block Kit message
  → Include case URL, run URL, artifacts URL
  → Send to appropriate channel
```

### Weekly Review Flow
```
[Weekly Cron Job]
  ↓
[Credit Aggregator]
  → Read ledger.jsonl for last 7 days
  → Group by scenario
  → Calculate totals, P95, variance
  → Identify top spenders and spike runs
  → Generate report JSON + .sha256
  → (Optional) Create Notion page
  → (Optional) Send Slack summary to #ops-review
  ↓
[Baseline Calculator]
  → Identify stable scenarios (no SEV0/SEV1, low variance)
  → Recalculate median credits for stable scenarios
  → Update config/credit-baselines.json
```

## Integration Points

### Notion Databases

**RUNS_LEDGER:**
- Primary key: Run_ID (unique)
- Fields match RunRecord interface (see types.ts)
- Optionally synced from local ledger
- **Not the source of truth** (local ledger is)

**CASES:**
- Primary key: Case_ID (format: CASE-YYYYMMDD-XXXXXX)
- Fields match CaseRecord interface
- Relations: Primary_Run_ID, Related_Run_IDs
- Status lifecycle: Open → Investigating → Mitigating → Resolved

### Slack Webhooks

**Environment Variables:**
```bash
SLACK_WEBHOOK_URL_SEV0  # #ops-critical
SLACK_WEBHOOK_URL_SEV1  # #ops-alerts
SLACK_WEBHOOK_URL_SEV2  # #ops-review
SLACK_WEBHOOK_URL_DEFAULT  # #ops-monitoring
```

**Message Format:** Slack Block Kit (see slack-alert-formatter.ts)

### Config Files

**`config/sintraprime-policy.json`:**
- Severity thresholds (multiplier values)
- Risk flag weights (misconfig_weight, legit_weight)
- Policy actions per severity
- Slack channels
- Notion database IDs

**`config/credit-baselines.json`:**
- Per-scenario median credits
- Last updated timestamp
- Sample size for each baseline

## Security Considerations

### 1. PII/Regulatory Flags
- Detected via external metadata (not from credit data alone)
- Triggers SEV0 classification even with modest credit spike
- Requires immediate quarantine and case creation
- Page lock prevents accidental downstream dispatch

### 2. Audit Trail Integrity
- All run records hashed with SHA-256
- Ledger is append-only (no edits allowed)
- Verification script can detect tampering
- Local write always precedes external sync

### 3. Quarantine Actions
- Artifacts moved to `runs/QUARANTINE/<run_id>/`
- Downstream dispatch blocked via feature flag
- Notion page locked (read-only)
- Rerun requires operator acknowledgment

### 4. Secrets Management
- Notion tokens never written to run artifacts
- Slack webhooks stored in environment (not config)
- Redaction applied before audit bundle export

### 5. Authority Model (per CONSTITUTION.v1.md)
- Monitoring system has no authority to approve/deny runs
- Case creation is observational (not authoritative)
- Operator must review and approve actions
- UI is read-only

## Performance Characteristics

### Latency
- **Classification:** <10ms (local compute)
- **Ledger write:** <50ms (local I/O)
- **Notion sync:** 500-2000ms (network bound, async)
- **Slack alert:** 200-1000ms (network bound, async)

### Scalability
- Ledger append is O(1) time
- Baseline calculation is O(n) over 30-day window
- Weekly aggregation is O(n) over 7-day window
- Notion sync can be batched for high-volume scenarios

### Storage
- Run JSON: ~2-5 KB per run
- Ledger: grows by ~50-100 MB/year at 100 runs/day
- Reports: ~50 KB per weekly report
- Baselines: <10 KB for typical scenario count

### Failure Modes
- **Notion unavailable:** Run still logged locally, sync retried later
- **Slack unavailable:** Alert logged, operator can view in ledger
- **Baseline missing:** Defaults to 0 (all runs flagged for review)
- **Policy file missing:** Fails fast with clear error (no silent behavior)

## Monitoring the Monitor

### Health Checks
- Verify ledger.jsonl is append-only (no modifications)
- Check SHA-256 integrity of recent runs
- Ensure baselines are updated weekly
- Monitor Notion sync lag (<5 minutes acceptable)

### Alerts on Alerts
- SEV0 with no case created → escalate to on-call
- Baseline staleness (>14 days) → warning
- Ledger write failure → page operator
- Policy file modification → require approval

## Version History

- **v1.0 (2024-01):** Initial implementation with SEV0-4 classification, Notion integration, weekly reviews
