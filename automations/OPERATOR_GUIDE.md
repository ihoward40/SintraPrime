# SintraPrime Make.com Operator Guide

## Overview

This guide provides step-by-step instructions for non-technical operators to manage the SintraPrime credit forensics system using Make.com's visual interface.

## Table of Contents

1. [Extracting Top 5 Scenarios from Make.com Usage UI](#extracting-top-5-scenarios)
2. [Scenario Setup and Configuration](#scenario-setup)
3. [Monitoring and Troubleshooting](#monitoring)
4. [Common Operations](#common-operations)

---

## Extracting Top 5 Scenarios from Make.com Usage UI

### Purpose

The Weekly Credit Review scenario (Scenario 4) requires identifying the top 5 scenarios consuming Make.com operations. This data is available in the Make.com web interface.

### Step-by-Step Instructions

#### 1. Access Make.com Dashboard

1. Log in to [Make.com](https://www.make.com)
2. Select your organization from the top-left dropdown
3. Navigate to **Organization** → **Usage** in the left sidebar

#### 2. Set Date Range

1. Click the **Date Range** selector at the top
2. Select **Last 7 days** (or custom range for weekly review)
3. Click **Apply**

#### 3. View Scenario Statistics

1. Scroll to the **Scenarios** section
2. You'll see a table with columns:
   - Scenario Name
   - Executions
   - Operations
   - Success Rate
   - Last Run

#### 4. Sort by Operations

1. Click the **Operations** column header
2. Click again to sort descending (highest first)
3. The top 5 scenarios will now be at the top of the list

#### 5. Extract Data

For each of the top 5 scenarios, record:

- **Scenario Name**: e.g., "Runs Logger"
- **Total Operations**: e.g., 4,200
- **Executions**: e.g., 280
- **Operations per Execution**: Calculate as `Total Operations ÷ Executions`

#### 6. Record in Weekly Report

Manually add this data to the weekly report template:

```markdown
#### Top 5 Scenarios by Operations

1. Runs Logger: 4,200 operations (280 executions, 15 ops/run)
2. Severity Classifier: 3,800 operations (250 executions, 15.2 ops/run)
3. Slack Alerts: 2,100 operations (420 executions, 5 ops/run)
4. Weekly Credit Review: 150 operations (1 execution, 150 ops/run)
5. Custom Integration: 1,200 operations (60 executions, 20 ops/run)
```

### Tips

- **Export to CSV**: Click the **Export** button to download full data for analysis
- **Filter by Team**: If multiple teams use Make.com, filter by your team first
- **Compare Periods**: Use the date picker to compare current week vs. previous week
- **Set Alerts**: Configure Make.com to email you when usage exceeds thresholds

---

## Scenario Setup and Configuration

### Prerequisites

- Active Make.com account with appropriate permissions
- Access to SintraPrime repository on the execution machine
- Node.js installed and accessible from Make.com
- Slack webhook URL (for Scenario 3)

### Initial Setup

#### 1. Configure Environment Variables

In Make.com, go to **Organization** → **Variables**:

| Variable Name | Value | Example |
|---------------|-------|---------|
| `repo_path` | Absolute path to repo | `C:\Users\admin\agent-mode-engine` |
| `runs_dir` | Relative path to runs | `runs` |
| `node_path` | Path to Node.js | `C:\Program Files\nodejs\node.exe` |
| `slack_webhook` | Webhook URL (secret) | `https://hooks.slack.com/...` |
| `slack_channel` | Target channel | `#sintraprime-alerts` |
| `severity_threshold` | Minimum severity | `3` |

**Important**: Mark `slack_webhook` as **sensitive** to hide it from logs.

#### 2. Create Data Store

1. Go to **Data Stores** in Make.com
2. Click **Add data store**
3. Name: `sintraprime_runs`
4. Structure:

```json
{
  "run_id": "text",
  "analysis_id": "text",
  "detected_at": "date",
  "manifest_exists": "boolean",
  "manifest_status": "text",
  "has_signature": "boolean",
  "tier": "number",
  "severity": "number",
  "severity_reason": "text",
  "classified": "boolean",
  "classified_at": "date",
  "alerted": "boolean",
  "alerted_at": "date"
}
```

#### 3. Import Scenarios

For each scenario (1-4):

1. Click **Create a new scenario**
2. Follow the module configuration in:
   - `1-runs-logger.md`
   - `2-severity-classifier.md`
   - `3-slack-alerts.md`
   - `4-weekly-credit-review.md`
3. Name the scenario according to the guide
4. Set the schedule as specified
5. **Save** but don't activate yet

#### 4. Test Each Scenario

Before activating:

1. Click **Run once** for each scenario
2. Verify the output in the execution log
3. Check that data store entries are created
4. Confirm Slack alerts are received (Scenario 3)

#### 5. Activate Scenarios

Once tested:

1. Switch each scenario to **On** (green toggle)
2. Scenarios will now run on schedule

---

## Monitoring and Troubleshooting

### Daily Health Checks

#### Check Scenario Status

1. Go to Make.com dashboard
2. Navigate to **Scenarios**
3. Verify all 4 scenarios show:
   - ✅ Status: **On**
   - 🟢 Last run: **Recently** (within expected interval)
   - ✅ Success rate: **> 95%**

#### Check Data Store Growth

1. Go to **Data Stores** → `sintraprime_runs`
2. Click **Browse records**
3. Verify:
   - New entries are being added
   - `classified` field is being updated
   - `alerted` field is being set for high-severity runs

#### Check Slack Alerts

1. Go to Slack channel `#sintraprime-alerts`
2. Verify:
   - Alerts are arriving (if any high-severity runs exist)
   - Message format is correct
   - Links are clickable

### Common Issues

#### Scenario Not Running

**Symptoms**: Last run time is outdated

**Solutions**:
1. Check scenario is **On** (green toggle)
2. Verify schedule is set correctly
3. Check Make.com organization is not paused
4. Review execution history for errors

#### No Data Store Entries

**Symptoms**: Data store is empty or not growing

**Solutions**:
1. Verify `repo_path` variable is correct
2. Check Node.js is accessible from Make.com
3. Confirm `runs/` directory exists and has content
4. Test the "List Directory" module manually

#### Slack Alerts Not Sending

**Symptoms**: High-severity runs detected but no Slack messages

**Solutions**:
1. Verify `slack_webhook` URL is correct
2. Check webhook is not expired or revoked
3. Test webhook with `curl` or Postman
4. Review Scenario 3 execution logs for errors
5. Confirm `severity_threshold` is not too high

#### Operations Consuming Too Fast

**Symptoms**: Make.com operations depleting faster than expected

**Solutions**:
1. Review Weekly Credit Review report
2. Identify top consumer scenarios
3. Increase schedule intervals (e.g., 15min → 30min)
4. Add filters to reduce unnecessary processing
5. Consider upgrading Make.com plan

---

## Common Operations

### Manually Trigger a Scenario

1. Go to **Scenarios**
2. Click on scenario name
3. Click **Run once** button at bottom
4. Watch execution in real-time
5. Review output in execution log

### View Scenario Execution History

1. Go to **Scenarios**
2. Click on scenario name
3. Click **History** tab
4. Filter by:
   - Date range
   - Status (Success, Error, Warning)
   - Execution duration

### Export Data Store

1. Go to **Data Stores** → `sintraprime_runs`
2. Click **Export**
3. Select format: **CSV** or **JSON**
4. Download file
5. Use for offline analysis or backup

### Update Environment Variables

1. Go to **Organization** → **Variables**
2. Click on variable to edit
3. Update value
4. Click **Save**
5. **Important**: Changes take effect immediately for new executions

### Pause All Scenarios

For maintenance or troubleshooting:

1. Go to **Scenarios**
2. For each active scenario:
   - Click scenario name
   - Toggle **Off** (gray)
3. Verify all scenarios show status **Off**

### Resume All Scenarios

After maintenance:

1. Go to **Scenarios**
2. For each paused scenario:
   - Click scenario name
   - Toggle **On** (green)
3. Click **Run once** to verify each is working

### Reset a Scenario

If a scenario is stuck or behaving unexpectedly:

1. Click scenario name
2. Click **Options** (three dots)
3. Select **Clone** to create a backup
4. Delete the original scenario
5. Re-import from documentation
6. Test before activating

### Archive Old Data Store Entries

To keep data store lean:

1. Go to **Data Stores** → `sintraprime_runs`
2. Click **Search**
3. Filter: `detected_at < [30 days ago]`
4. Select all results
5. Click **Delete selected**
6. **Warning**: This is permanent—export first if needed

---

## Best Practices

### Security

- ✅ Store sensitive values (webhook URLs, API keys) in Make.com secrets
- ✅ Use organization-level variables for shared configuration
- ✅ Restrict Make.com access to authorized operators only
- ✅ Regularly audit scenario permissions

### Efficiency

- ✅ Start with conservative schedules (15min+) and optimize later
- ✅ Add filters to reduce unnecessary data processing
- ✅ Archive old data store entries regularly
- ✅ Monitor operations usage weekly

### Reliability

- ✅ Test scenarios individually before activating all
- ✅ Add error handlers to critical paths
- ✅ Set up Slack notifications for scenario failures
- ✅ Keep a backup/clone of each scenario

### Documentation

- ✅ Document any custom modifications to scenarios
- ✅ Keep a changelog of environment variable updates
- ✅ Note any deviations from this guide
- ✅ Share knowledge with team members

---

## Support and Resources

### Documentation

- **Fieldmap**: `automations/fieldmap.manifest.v1.json`
- **Scenario Guides**: `automations/make/1-runs-logger.md` (and 2-4)
- **Main README**: `/README.md`

### External Resources

- [Make.com Documentation](https://www.make.com/en/help/home)
- [Make.com API Reference](https://www.make.com/en/api-documentation)
- [Make.com Community Forum](https://community.make.com/)

### Getting Help

1. Check scenario execution logs for error messages
2. Review this operator guide for troubleshooting steps
3. Test scenarios in isolation to identify root cause
4. Consult with technical team if needed

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-23 | 1.0.0 | Initial operator guide |

---

*This guide is maintained as part of the SintraPrime credit forensics system. For technical implementation details, see the scenario-specific documentation in `automations/make/`.*
