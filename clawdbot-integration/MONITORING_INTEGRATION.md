# ClawdBot Monitoring Integration with SintraPrime

This document describes how to integrate ClawdBot monitoring with SintraPrime's existing Make.com automation system.

## Overview

SintraPrime already has a comprehensive Make.com automation system for monitoring and alerting. ClawdBot should integrate seamlessly with this existing infrastructure.

## Existing Make.com Scenarios

SintraPrime has four main automation scenarios:

1. **Runs Logger** (`automations/make/1-runs-logger.md`) - Monitors runs directory
2. **Severity Classifier** (`automations/make/2-severity-classifier.md`) - Classifies severity
3. **Slack Alerts** (`automations/make/3-slack-alerts.md`) - Sends alerts
4. **Weekly Credit Review** (`automations/make/4-weekly-credit-review.md`) - Usage summaries

## ClawdBot Log Integration

### Log Directory Structure

Configure ClawdBot to write logs to SintraPrime's runs directory:

```bash
runs/
├── clawdbot/
│   ├── runtime/
│   │   ├── CLAWD_20260203_120000/
│   │   │   ├── manifest.json
│   │   │   ├── activity.log
│   │   │   ├── activity.log.sha256
│   │   │   └── metadata.json
│   │   └── ...
│   ├── actions/
│   │   ├── ACTION_20260203_120100/
│   │   │   ├── receipt.json
│   │   │   ├── request.json
│   │   │   ├── response.json
│   │   │   └── evidence.json
│   │   └── ...
│   └── audit/
│       ├── AUDIT_20260203/
│       │   ├── audit.log
│       │   └── summary.json
│       └── ...
```

### ClawdBot Configuration

Add to `.env`:

```bash
# Logging Integration
CLAWDBOT_LOG_DIR=/path/to/SintraPrime/runs/clawdbot
CLAWDBOT_LOG_FORMAT=json
CLAWDBOT_LOG_STRUCTURE=sintraprime
CLAWDBOT_GENERATE_HASHES=true
CLAWDBOT_CREATE_MANIFESTS=true
```

### Log Format

ClawdBot logs should match SintraPrime's format:

```json
{
  "timestamp": "2026-02-03T12:00:00.000Z",
  "run_id": "CLAWD_20260203_120000",
  "type": "action",
  "mode": "research",
  "action": "notion.read",
  "target": "database:policies",
  "user": "clawdbot-agent",
  "status": "success",
  "duration_ms": 234,
  "receipt_id": "ACTION_20260203_120100",
  "metadata": {
    "skill": "notion",
    "version": "1.0.0",
    "policy": "SP-AGENT-MODE-003"
  }
}
```

## Make.com Integration

### Scenario 1: ClawdBot Runs Logger

Extend the existing Runs Logger scenario to monitor `runs/clawdbot/` directory.

**Trigger:** New file in `runs/clawdbot/runtime/` or `runs/clawdbot/actions/`

**Actions:**
1. Read manifest.json
2. Parse activity log
3. Store in Notion (ClawdBot Activity database)
4. Generate activity summary
5. Update dashboards

**Configuration:**
```json
{
  "scenario_name": "ClawdBot Activity Logger",
  "trigger": {
    "type": "directory_watch",
    "path": "runs/clawdbot/",
    "pattern": "**/manifest.json"
  },
  "actions": [
    {
      "type": "read_json",
      "file": "manifest.json"
    },
    {
      "type": "notion_create",
      "database": "ClawdBot Activity",
      "fields": {
        "Run_ID": "{{manifest.run_id}}",
        "Timestamp": "{{manifest.timestamp}}",
        "Mode": "{{manifest.mode}}",
        "Status": "{{manifest.status}}",
        "Actions_Count": "{{manifest.actions_count}}"
      }
    }
  ]
}
```

### Scenario 2: ClawdBot Severity Classifier

Classify ClawdBot actions by severity and risk level.

**Trigger:** New action log in `runs/clawdbot/actions/`

**Classification Rules:**

- **CRITICAL** (Immediate Alert)
  - Execute Mode without receipt
  - Scope violation detected
  - Failed authentication
  - Unexpected outbound traffic
  - File access outside sandbox

- **HIGH** (Alert within 1 hour)
  - Execute Mode action (with receipt)
  - Skill error rate >10%
  - Unusual usage volume (>10x normal)
  - New skill enabled

- **MEDIUM** (Daily summary)
  - Research Mode actions
  - Normal operations
  - Configuration changes

- **LOW** (Weekly summary)
  - Health checks
  - Status queries
  - Read-only operations

**Configuration:**
```json
{
  "scenario_name": "ClawdBot Severity Classifier",
  "trigger": {
    "type": "directory_watch",
    "path": "runs/clawdbot/actions/",
    "pattern": "**/receipt.json"
  },
  "classification_rules": [
    {
      "severity": "CRITICAL",
      "conditions": [
        "mode == 'execute' AND receipt_id == null",
        "scope_violation == true",
        "auth_failed == true"
      ]
    },
    {
      "severity": "HIGH",
      "conditions": [
        "mode == 'execute'",
        "skill_error_rate > 0.1",
        "usage_spike > 10"
      ]
    }
  ],
  "actions": [
    {
      "type": "notion_update",
      "database": "ClawdBot Activity",
      "field": "Severity",
      "value": "{{classified_severity}}"
    }
  ]
}
```

### Scenario 3: ClawdBot Slack Alerts

Send alerts for high-severity ClawdBot events.

**Trigger:** High or Critical severity classification

**Alert Templates:**

**CRITICAL Alert:**
```
🚨 CRITICAL: ClawdBot Security Alert

Run ID: {{run_id}}
Issue: {{issue_type}}
Time: {{timestamp}}

Details:
- Mode: {{mode}}
- Action: {{action}}
- Target: {{target}}

Action Required:
- Review logs: runs/clawdbot/{{run_id}}
- Check compliance: GOVERNANCE_COMPLIANCE.md
- Incident response: [Link to playbook]

Policy: {{policy_id}}
```

**HIGH Alert:**
```
⚠️ HIGH: ClawdBot Activity Alert

Run ID: {{run_id}}
Event: {{event_type}}
Time: {{timestamp}}

Summary:
- Mode: {{mode}}
- Actions: {{actions_count}}
- Status: {{status}}

Review: runs/clawdbot/{{run_id}}
```

**Configuration:**
```json
{
  "scenario_name": "ClawdBot Slack Alerts",
  "trigger": {
    "type": "notion_update",
    "database": "ClawdBot Activity",
    "filter": "Severity in ['CRITICAL', 'HIGH']"
  },
  "actions": [
    {
      "type": "slack_message",
      "channel": "#sintraprime-alerts",
      "template": "{{alert_template}}"
    },
    {
      "type": "notion_create",
      "database": "Incidents",
      "fields": {
        "Type": "ClawdBot Alert",
        "Severity": "{{severity}}",
        "Run_ID": "{{run_id}}",
        "Status": "Open"
      }
    }
  ]
}
```

### Scenario 4: ClawdBot Weekly Review

Include ClawdBot usage in weekly credit/usage reviews.

**Trigger:** Weekly (Sunday 11:59 PM)

**Report Contents:**

```markdown
# ClawdBot Weekly Activity Report
Week of {{week_start}} to {{week_end}}

## Summary
- Total Runs: {{total_runs}}
- Research Mode: {{research_count}} ({{research_percent}}%)
- Execute Mode: {{execute_count}} ({{execute_percent}}%)
- Success Rate: {{success_rate}}%

## Mode Breakdown
- Research Mode Actions: {{research_actions}}
  - Browse/Summarize: {{browse_count}}
  - Drafts Created: {{drafts_count}}
  - Files Indexed: {{files_count}}

- Execute Mode Actions: {{execute_actions}}
  - Receipts Generated: {{receipts_count}}
  - Approvals Required: {{approvals_count}}
  - Auto-Reverted: {{reverts_count}}

## Skills Usage
{{#each skills}}
- {{skill_name}}: {{usage_count}} times ({{success_rate}}% success)
{{/each}}

## Alerts
- Critical: {{critical_count}}
- High: {{high_count}}
- Medium: {{medium_count}}

## Compliance
- Receipt Completeness: {{receipt_compliance}}%
- Scope Violations: {{violations_count}}
- Policy Adherence: {{policy_compliance}}%

## Top Actions
{{#each top_actions}}
{{index}}. {{action_type}}: {{count}} times
{{/each}}

## Recommendations
{{recommendations}}
```

**Configuration:**
```json
{
  "scenario_name": "ClawdBot Weekly Review",
  "trigger": {
    "type": "schedule",
    "schedule": "0 23 * * 0"
  },
  "actions": [
    {
      "type": "query_notion",
      "database": "ClawdBot Activity",
      "filter": "created_time > {{week_start}}"
    },
    {
      "type": "aggregate",
      "metrics": [
        "total_runs",
        "mode_breakdown",
        "skills_usage",
        "alerts_summary"
      ]
    },
    {
      "type": "generate_report",
      "template": "weekly_clawdbot_report"
    },
    {
      "type": "slack_message",
      "channel": "#sintraprime-reports",
      "message": "{{report}}"
    },
    {
      "type": "notion_create",
      "database": "Weekly Reports",
      "fields": {
        "Type": "ClawdBot Usage",
        "Week": "{{week_start}}",
        "Report": "{{report}}"
      }
    }
  ]
}
```

## Notion Database Schema

### ClawdBot Activity Database

Properties:
- **Run_ID** (Title)
- **Timestamp** (Date)
- **Mode** (Select: Research, Execute)
- **Action_Type** (Select: browse, draft, send, commit, etc.)
- **Target** (Text)
- **Status** (Select: success, failed, blocked)
- **Severity** (Select: LOW, MEDIUM, HIGH, CRITICAL)
- **Duration** (Number - milliseconds)
- **Skill** (Select: notion, github, drive, email, etc.)
- **Receipt** (Relation → Execution Receipts)
- **Policy** (Relation → SintraPrime Policies)
- **Logs_Path** (Text)
- **User** (Text)
- **Error_Message** (Text - if failed)

### ClawdBot Metrics Database

Properties:
- **Date** (Date)
- **Total_Runs** (Number)
- **Research_Runs** (Number)
- **Execute_Runs** (Number)
- **Success_Rate** (Number - percentage)
- **Avg_Duration** (Number - milliseconds)
- **Critical_Alerts** (Number)
- **High_Alerts** (Number)
- **Skills_Active** (Number)
- **Receipts_Generated** (Number)
- **Compliance_Score** (Number - percentage)

## Dashboard Setup

### Real-Time Dashboard

Create a Notion page with embedded views:

1. **Activity Stream** - Last 24 hours of actions
2. **Mode Distribution** - Pie chart (Research vs Execute)
3. **Success Rate** - Line chart over time
4. **Active Skills** - Bar chart of usage
5. **Alert Status** - Count of open alerts
6. **Compliance Score** - Gauge showing compliance percentage

### Weekly Dashboard

1. **Weekly Trends** - Line charts
2. **Top Actions** - Bar chart
3. **Skills Performance** - Table
4. **Alerts Summary** - Stacked bar chart
5. **Compliance Metrics** - Multiple gauges

## Alert Response Playbooks

### CRITICAL: Execute Without Receipt

**Immediate Actions:**
1. Stop ClawdBot (kill process)
2. Review logs in runs/clawdbot/
3. Identify what action attempted
4. Check if action completed
5. Revert if necessary
6. Create incident ticket
7. Review Execute Mode configuration

**Root Cause:**
- Configuration error (gates not enforced)
- Code bug in receipt check
- Operator error (wrong mode selected)

**Prevention:**
- Add pre-flight checks
- Enforce receipt requirement at code level
- Add manual confirmation for Execute Mode

### CRITICAL: Scope Violation

**Immediate Actions:**
1. Stop ClawdBot
2. Review attempted action
3. Check skill configuration
4. Verify no unauthorized access occurred
5. Rotate credentials if compromised
6. Update skill scope restrictions

**Root Cause:**
- Skill configuration too broad
- Bug in scope checking
- Malicious input

**Prevention:**
- Tighten skill scopes
- Add scope validation tests
- Review skill configs regularly

### HIGH: Unusual Usage Spike

**Actions within 1 hour:**
1. Review activity logs
2. Identify cause of spike
3. Check if legitimate (backfill, batch job)
4. Verify no runaway loops
5. Check API rate limits not exceeded

**Root Cause:**
- Legitimate batch operation
- Loop/retry bug
- External trigger rate too high

**Prevention:**
- Rate limiting
- Circuit breakers
- Usage quotas

## Testing the Integration

### Test Checklist

- [ ] ClawdBot logs writing to runs/clawdbot/
- [ ] Manifest files generated correctly
- [ ] SHA-256 hashes computed
- [ ] Make.com scenarios detecting new logs
- [ ] Notion databases populating
- [ ] Severity classification working
- [ ] Slack alerts sending (test mode)
- [ ] Weekly reports generating
- [ ] Dashboard views updating
- [ ] Alert response tested

### Test Scenarios

1. **Research Mode Action**
   - Trigger: Browse and summarize
   - Expected: LOW severity, logged, no alerts

2. **Execute Mode with Receipt**
   - Trigger: Send email with proper receipt
   - Expected: HIGH severity, logged, alert sent

3. **Execute Mode without Receipt**
   - Trigger: Attempt action without receipt
   - Expected: CRITICAL severity, blocked, immediate alert

4. **Scope Violation**
   - Trigger: Attempt to access denied resource
   - Expected: CRITICAL severity, blocked, immediate alert

## Maintenance

### Daily
- Check alert dashboard
- Review any CRITICAL/HIGH alerts
- Verify log ingestion working

### Weekly
- Review weekly report
- Check compliance scores
- Adjust thresholds if needed

### Monthly
- Review all skill configurations
- Update severity classification rules
- Test alert response procedures

## References

- **Make.com Operator Guide:** `/automations/OPERATOR_GUIDE.md`
- **Existing Scenarios:** `/automations/make/`
- **Monitoring README:** `/monitoring/README.md`
- **Field Mapping:** `/automations/fieldmap.manifest.v1.json`

---

**Version:** 1.0  
**Date:** 2026-02-03  
**Status:** Monitoring integration guide for ClawdBot  
**Integration:** Extends existing SintraPrime Make.com automation system
