# SintraPrime Credit Monitoring Automation Flows

This document describes the automation workflows for the credit monitoring system using Make.com or n8n.

## Overview

The credit monitoring system integrates with automation platforms to:
1. **Log runs** - Capture credit usage from completed automations
2. **Generate alerts** - Send Slack notifications for incidents
3. **Weekly reviews** - Create forensics reports on a schedule
4. **Update baselines** - Recalculate healthy credit baselines

## Flow 1: Run Logger (Webhook Triggered)

**Trigger:** Webhook from automation completion

**Purpose:** Log each completed automation run and create incidents as needed

**Steps:**

1. **Webhook Trigger**
   - Method: POST
   - Payload:
     ```json
     {
       "run_id": "RUN-20260123-001",
       "timestamp": "2026-01-23T10:30:00Z",
       "scenario_id": "BINDER_EXPORT_v2",
       "scenario_name": "Binder Export Quarterly",
       "job_type": "BINDER_EXPORT",
       "status": "Success",
       "credits_total": 2480,
       "credits_in": 1800,
       "credits_out": 680,
       "model": "gpt-4",
       "input_tokens": 220000,
       "output_tokens": 52000,
       "artifacts_link": "https://drive.google.com/...",
       "retry_count": 0,
       "has_idempotency_key": true
     }
     ```

2. **Call Run Logger CLI**
   - Module: HTTP Request or Exec Command
   - Command:
     ```bash
     tsx src/cli/run-monitoring.ts log \
       --run-id {{run_id}} \
       --credits {{credits_total}} \
       --scenario {{scenario_id}} \
       --scenario-name {{scenario_name}} \
       --job-type {{job_type}} \
       --status {{status}}
     ```
   - Capture: stdout and exit code

3. **Parse CLI Output**
   - Extract: Severity, Case ID (if created)
   - Check: Exit code (0 = success)

4. **Branch on Severity**
   - If Severity ≥ SEV2:
     - Continue to case creation
   - Else:
     - End flow

5. **Send Slack Alert** (SEV0-SEV2 only)
   - Module: Slack Webhook
   - URL: From environment variable based on severity
     - SEV0: `SLACK_WEBHOOK_URL_SEV0`
     - SEV1: `SLACK_WEBHOOK_URL_SEV1`
     - SEV2+: `SLACK_WEBHOOK_URL_DEFAULT`
   - Payload: JSON from CLI output (already formatted as Block Kit)

6. **Log to Audit Trail**
   - Module: Write to Datastore (optional)
   - Store: Flow execution record with timestamps

## Flow 2: Weekly Credit Review (Scheduled)

**Trigger:** Cron schedule (every Monday at 9:00 AM)

**Purpose:** Generate weekly forensics report and distribute to team

**Steps:**

1. **Cron Trigger**
   - Schedule: `0 9 * * 1` (Mondays at 9 AM)
   - Timezone: UTC

2. **Run Weekly Review CLI**
   - Module: Exec Command
   - Command:
     ```bash
     tsx src/cli/run-monitoring.ts weekly-review
     ```
   - Timeout: 120 seconds (report generation can take time)

3. **Parse Report Output**
   - Extract: Report ID, top scenarios, summary stats
   - File path: `runs/CREDIT_REVIEWS/weekly_*.json`

4. **Read Report JSON**
   - Module: Read File
   - Path: From previous step output
   - Parse: JSON

5. **Create Notion Review Page** (Optional)
   - Module: Notion API
   - Database: Credit Reviews (create if needed)
   - Properties:
     - Title: Report ID
     - Period Start: {{report.period_start}}
     - Period End: {{report.period_end}}
     - Total Credits: {{report.summary_stats.total_credits}}
     - Top Scenarios: Embed as table

6. **Send Slack Summary**
   - Module: Slack Webhook
   - URL: `SLACK_WEBHOOK_URL_DEFAULT`
   - Message: Formatted summary with link to Notion page
   - Use: `formatWeeklySummary()` output from CLI

7. **Archive Report** (Optional)
   - Module: Google Drive / S3 Upload
   - Upload: Report JSON and SHA-256 file
   - Folder: Credit Reviews Archive

## Flow 3: Baseline Updates (Weekly)

**Trigger:** Cron schedule (every Sunday at 11:00 PM)

**Purpose:** Recalculate credit baselines for stable scenarios

**Steps:**

1. **Cron Trigger**
   - Schedule: `0 23 * * 0` (Sundays at 11 PM)
   - Timezone: UTC

2. **Run Baseline Update CLI**
   - Module: Exec Command
   - Command:
     ```bash
     tsx src/cli/run-monitoring.ts update-baselines
     ```
   - Timeout: 180 seconds

3. **Verify Baselines File**
   - Module: Read File
   - Path: `config/credit-baselines.json`
   - Validate: JSON structure

4. **Log to Audit Trail**
   - Module: Append to File
   - File: `runs/CREDIT_MONITORING/baseline_updates.log`
   - Content: Timestamp + updated scenario count

5. **Notify Team** (Optional)
   - Module: Slack Message
   - Channel: `#ops-monitoring`
   - Message: "Baselines updated for {{count}} scenarios"

## Flow 4: Ad-Hoc Classification Test

**Trigger:** Manual button press or webhook

**Purpose:** Test classifier with a fixture file

**Steps:**

1. **Manual Trigger**
   - Button: "Test Classifier"
   - Input: Fixture file path

2. **Run Classify CLI**
   - Module: Exec Command
   - Command:
     ```bash
     tsx src/cli/run-monitoring.ts classify --fixture {{fixture_path}}
     ```

3. **Display Results**
   - Module: Format Output
   - Show: Severity, variance, risk flags, actions

## Flow 5: Evidence Hygiene Task Creator (Notion)

**Trigger:** Notion database watch (Stage-based)

**Purpose:** When a Case enters `Stage = "Wave-1 Sent"`, enforce the `WT Gate For Automation` check, create exactly-one Evidence Hygiene task (idempotent), and write a Run Receipt on every run.

**Spec:** See `automations/make/evidence-hygiene.md` and `automations/make/contracts/evidence-hygiene.contract.json`

## Configuration Variables

All automation flows use these environment variables:

```bash
# Notion
NOTION_TOKEN=
NOTION_RUNS_LEDGER_DB_ID=
NOTION_CASES_DB_ID=

# Slack
SLACK_WEBHOOK_URL_SEV0=
SLACK_WEBHOOK_URL_SEV1=
SLACK_WEBHOOK_URL_DEFAULT=

# Paths
CREDIT_BASELINES_PATH=./config/credit-baselines.json
```

## Make.com Specific Notes

### Modules to Use:
- **Webhook**: Receive Run Logger triggers
- **Tools > Run a Script**: Execute Node.js/TypeScript CLI
- **HTTP**: Make API calls to Notion/Slack
- **JSON**: Parse/format data
- **Router**: Branch logic based on severity

### Error Handling:
- Add error handlers for each CLI call
- Log errors to Slack or email
- Retry failed operations up to 3 times

## n8n Specific Notes

### Nodes to Use:
- **Webhook**: Trigger on POST
- **Execute Command**: Run tsx CLI
- **HTTP Request**: Notion/Slack API calls
- **IF**: Conditional branching
- **Code**: Custom JavaScript for parsing

### Workflow Settings:
- Enable "Continue on Fail" for non-critical steps
- Set timeout to 120s for CLI commands
- Save execution logs for debugging

## Testing Automation Flows

### 1. Test Run Logger Flow

Send a test webhook:

```bash
curl -X POST https://your-make-webhook-url \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "RUN-TEST-001",
    "scenario_id": "TEST_SCENARIO",
    "credits_total": 500,
    "baseline": 300,
    "status": "Success"
  }'
```

### 2. Test Weekly Review Flow

Trigger manually or wait for schedule.

Verify:
- Report JSON created in `runs/CREDIT_REVIEWS/`
- Notion page created
- Slack message sent

### 3. Test Baseline Update Flow

Run CLI manually to verify:

```bash
npm run monitor:baselines
```

Check `config/credit-baselines.json` for updates.

## Monitoring the Automations

### Health Checks

Add a monitoring flow that runs every hour:

1. Check last run logger execution timestamp
2. Verify ledger.jsonl file is growing
3. Alert if no runs logged in 24 hours

### Metrics to Track

- **Run logger calls/day**
- **Average processing time**
- **Failed executions**
- **SEV0/SEV1 alert count**

## Troubleshooting

### CLI command fails

- Check Node.js version (requires >=20)
- Verify tsx is installed: `npm install -g tsx`
- Check file permissions on config/ and runs/
- Review stdout/stderr from command execution

### Slack alerts not sending

- Verify webhook URLs are correct
- Check webhook hasn't been revoked
- Test webhook with curl:
  ```bash
  curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"Test"}'
  ```

### Notion API errors

- Confirm integration has access to databases
- Check database IDs are correct (32-char hex)
- Verify API token hasn't expired

## Security Considerations

- **Never log API tokens** in automation logs
- **Restrict webhook URLs** to trusted sources
- **Use HTTPS** for all webhooks
- **Rotate credentials** quarterly
- **Audit automation access** monthly

## Next Steps

1. Set up Make.com/n8n account
2. Import or recreate flows from this spec
3. Configure environment variables
4. Test each flow individually
5. Enable scheduling for weekly flows
6. Set up monitoring and alerts
