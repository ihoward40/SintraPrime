# Notion Database Setup Guide

This guide provides step-by-step instructions for setting up the SintraPrime Credit Monitoring System Notion databases.

## Prerequisites

- Notion workspace with admin access
- Notion API integration created (https://www.notion.so/my-integrations)
- Integration granted access to your workspace

## Overview

The credit monitoring system uses two Notion databases:
1. **RUNS_LEDGER** - Tracks all automation runs with credit consumption
2. **CASES** - Manages incidents and investigations

## Step 1: Create Notion Databases

### 1.1 Create RUNS_LEDGER Database

1. In Notion, create a new page titled "Runs Ledger"
2. Add a database (Full Page Database)
3. Configure the following properties:

| Property Name | Type | Configuration |
|--------------|------|---------------|
| Run_ID | Title | Default title field |
| Timestamp | Date | Include time |
| Scenario_Name | Text | - |
| Scenario_ID | Text | - |
| Job_Type | Select | Options: BINDER_EXPORT, RECONCILE_BACKFILL, ANALYSIS, OTHER |
| Status | Select | Options: Success, Failed, Quarantined, Escalated |
| Credits_Total | Number | Format: Number |
| Credits_In | Number | Format: Number |
| Credits_Out | Number | Format: Number |
| Model | Text | - |
| Input_Tokens | Number | Format: Number |
| Output_Tokens | Number | Format: Number |
| Artifacts_Link | URL | - |
| Severity | Select | Options: SEV0, SEV1, SEV2, SEV3, SEV4 (with colors: 🔥red, 🔴red, 🟡yellow, 🔵blue, ⚪gray) |
| Risk_Flags | Multi-select | Options: retry_loop, unbounded_iterator, missing_idempotency, sudden_prompt_growth, deployment_correlation, batch_job, backfill_mode, linear_scaling, pii_exposure, regulatory_data |
| Risk_Summary | Text | - |
| Misconfig_Likelihood | Select | Options: High, Medium, Low |
| Baseline_Expected_Credits | Number | Format: Number |
| Variance_Multiplier | Number | Format: Number with 2 decimals |

4. Share the database with your Notion integration

### 1.2 Create CASES Database

1. In Notion, create a new page titled "Cases"
2. Add a database (Full Page Database)
3. Configure the following properties:

| Property Name | Type | Configuration |
|--------------|------|---------------|
| Case_ID | Title | Default title field (format: CASE-YYYYMMDD-XXXXXX) |
| Title | Text | - |
| Category | Select | Options: Cost/Credits, Data/PII, Delivery/Email, Filing/Regulatory, Reliability, Other |
| Severity | Select | Options: SEV0, SEV1, SEV2, SEV3, SEV4 (same colors as RUNS_LEDGER) |
| Exposure_Band | Select | Options: Regulatory, Financial, Privacy, Operational |
| Status | Select | Options: Open, Investigating, Mitigating, Resolved |
| Slack_Thread_URL | URL | - |
| Root_Cause | Select | Options: Misconfig, Legit Load, External Dependency, Unknown |
| Primary_Run_ID | Text | - |
| Related_Runs | Relation | Link to RUNS_LEDGER database (two-way) |
| Created_At | Date | Include time |

4. Share the database with your Notion integration

### 1.3 Set Up Database Relation

1. In RUNS_LEDGER, add a new property:
   - Name: "Cases"
   - Type: Relation
   - Link to: CASES database
   - Relation type: Two-way (sync "Related_Runs" in CASES)

## Step 2: Import Sample Data

1. Download the CSV files from `notion-templates/`:
   - `RUNS_LEDGER.csv`
   - `CASES.csv`

2. In each Notion database:
   - Click the "..." menu (top right)
   - Select "Import"
   - Choose "CSV"
   - Upload the corresponding CSV file
   - Map columns to properties (should auto-map)
   - Click "Import"

## Step 3: Get Database IDs

### 3.1 Get RUNS_LEDGER Database ID

1. Open the RUNS_LEDGER database in Notion
2. Copy the URL from your browser
3. The database ID is the 32-character code after the workspace name:
   ```
   https://www.notion.so/workspace/DATABASE_ID?v=...
   ```
   The ID looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

### 3.2 Get CASES Database ID

1. Open the CASES database in Notion
2. Copy the URL and extract the database ID (same as above)

### 3.3 Get Notion API Token

1. Go to https://www.notion.so/my-integrations
2. Select your integration
3. Copy the "Internal Integration Token"

## Step 4: Configure Environment Variables

1. Open your `.env` file (create from `.env.example` if needed)
2. Add the following:

```bash
# Notion API
NOTION_TOKEN=secret_YOUR_INTEGRATION_TOKEN_HERE

# Credit Monitoring Databases
NOTION_RUNS_LEDGER_DB_ID=YOUR_RUNS_LEDGER_DATABASE_ID
NOTION_CASES_DB_ID=YOUR_CASES_DATABASE_ID

# Slack Webhooks (optional)
SLACK_WEBHOOK_URL_SEV0=https://hooks.slack.com/services/YOUR/SEV0/WEBHOOK
SLACK_WEBHOOK_URL_SEV1=https://hooks.slack.com/services/YOUR/SEV1/WEBHOOK
SLACK_WEBHOOK_URL_DEFAULT=https://hooks.slack.com/services/YOUR/DEFAULT/WEBHOOK
```

## Step 5: Verify Setup

Run the verification script:

```bash
npm run monitor:log -- --run-id TEST-001 --credits 100 --scenario "Test Scenario"
```

This should:
1. Create a local audit trail in `runs/CREDIT_MONITORING/`
2. Log the run to Notion RUNS_LEDGER
3. Print confirmation with SHA-256 hash

## Step 6: Configure Slack Channels (Optional)

If using Slack alerts:

1. Create channels (if they don't exist):
   - `#ops-critical` (SEV0)
   - `#ops-alerts` (SEV1)
   - `#ops-review` (SEV2)
   - `#ops-monitoring` (default)

2. For each channel:
   - Click channel name → "Integrations" → "Add an app"
   - Add "Incoming Webhooks"
   - Copy webhook URL
   - Add to `.env` file

## Database Maintenance

### Weekly Cleanup

- Archive resolved cases older than 90 days
- Back up ledger data monthly
- Review and update baselines using: `npm run monitor:baselines`

### Monitoring Views

Create filtered views in Notion:

**RUNS_LEDGER Views:**
- **Active Incidents** - Severity is SEV0 or SEV1
- **This Week** - Timestamp is within this week
- **By Scenario** - Group by Scenario_ID

**CASES Views:**
- **Open Cases** - Status is Open or Investigating
- **Critical** - Severity is SEV0
- **By Category** - Group by Category

## Troubleshooting

### Database ID not working

- Ensure the database is shared with your Notion integration
- Check that the ID doesn't include hyphens or URL parameters
- The ID should be exactly 32 hexadecimal characters

### Import fails

- Ensure CSV encoding is UTF-8
- Check that all enum values match exactly (case-sensitive)
- Remove any extra columns not defined in the schema

### API errors

- Verify your integration token is correct
- Check that the integration has "Read content" and "Update content" permissions
- Ensure databases are shared with the integration

## Next Steps

Once Notion is configured:

1. Set up automated weekly reviews: `npm run monitor:weekly`
2. Configure Make.com/n8n automations (see `automations/README.md`)
3. Review operator runbook: `docs/monitoring/RUNBOOK.md`

## Support

For issues or questions:
- Check the API documentation: `docs/monitoring/API.md`
- Review architecture: `docs/monitoring/ARCHITECTURE.md`
- Consult SintraPrime governance docs: `docs/governance/`
