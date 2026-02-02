# Make.com Integration Guide for Supermemory Scripts (v1)

This guide provides step-by-step instructions for integrating the v1 Supermemory operational scripts into Make.com scenarios with robust version enforcement and error routing.

---

## Overview

The v1 Supermemory scripts (`sm-receipts-summary.ps1` and `restart-supermemory.ps1`) are designed to be Make.com-friendly. They output a single JSON object with no extraneous noise, making them ideal for automation workflows.

**Key Features:**
- **Version field:** All JSON output includes `version: "sm-make-v1"` for routing and schema enforcement.
- **Strict mode:** The `restart-supermemory.ps1` script includes a `-Strict` flag for fail-closed validation.
- **Exit codes:** Different exit codes for different failure types, enabling intelligent routing.

---

## Basic Integration Pattern

### 1. Create a Scheduled Scenario

Create a new Make.com scenario with a scheduled trigger (e.g., every 15 minutes, hourly, or daily).

### 2. Add a PowerShell Execution Module

Use the **HTTP** module or a **PowerShell execution** module (if available) to run the scripts on your server.

**Example HTTP Request (if you have an endpoint that executes PowerShell):**

```
POST https://your-server.com/api/execute-script
Content-Type: application/json

{
  "script": "ops\\restart-supermemory.ps1",
  "args": ["-MakeFriendly", "-Strict"]
}
```

**Alternative:** Use SSH or a remote execution tool to run the script directly.

### 3. Parse the JSON Response

Add a **Parse JSON** module to parse the script's output.

**Expected Schema (restart-supermemory.ps1):**

```json
{
  "version": "sm-make-v1",
  "strict": true,
  "status": "ok",
  "exitCode": 0,
  "hits": {
    "positive": 1,
    "bait": 0
  },
  "p95": 123,
  "receiptFile": "supermemory_receipts_2026-02-02.jsonl"
}
```

**Expected Schema (sm-receipts-summary.ps1):**

```json
{
  "version": "sm-make-v1",
  "status": "ok",
  "exitCode": 0,
  "hits": {
    "attempts": 42,
    "successes": 42,
    "errors": 0
  },
  "p95": 234,
  "receiptFile": "supermemory_receipts_2026-02-02.jsonl"
}
```

---

## Version Enforcement Pattern

### Step 1: Add a Router Module

After parsing the JSON, add a **Router** module with the following routes:

**Route 1: Version Mismatch (Fail Fast)**
- **Condition:** `{{1.version}} ≠ "sm-make-v1"`
- **Action:** Send an alert (email, Slack, etc.) and stop execution.
- **Alert Message:** "Supermemory script version mismatch. Expected 'sm-make-v1', got '{{1.version}}'."

**Route 2: Success**
- **Condition:** `{{1.version}} = "sm-make-v1"` AND `{{1.status}} = "ok"` AND `{{1.exitCode}} = 0`
- **Action:** Log success, update a dashboard, or trigger downstream workflows.

**Route 3: Failure**
- **Condition:** `{{1.version}} = "sm-make-v1"` AND (`{{1.status}} ≠ "ok"` OR `{{1.exitCode}} ≠ 0`)
- **Action:** Send an alert, log to a dead-letter queue, or trigger a remediation workflow.

### Step 2: Optional Strict Mode Enforcement

If you want to enforce that only `-Strict` mode outputs are accepted in production:

**Additional Route: Non-Strict Rejection**
- **Condition:** `{{1.strict}} ≠ true` (for `restart-supermemory.ps1` only)
- **Action:** Send an alert and stop execution.
- **Alert Message:** "Supermemory proof run was not executed in strict mode. Production requires -Strict."

---

## Exit Code Routing Pattern

The `restart-supermemory.ps1` script uses different exit codes for different failure types. You can use these for intelligent routing:

| Exit Code | Meaning | Recommended Action |
|-----------|---------|---------------------|
| 0 | Success | Continue workflow |
| 1 | General error | Alert and investigate |
| 2 | Missing API key | Alert ops team, check environment variables |
| 3 | Missing index CLI | Alert dev team, check deployment |
| 4 | Index failure | Alert ops team, check disk space and permissions |
| 5 | Positive control failed | Alert ops team, investigate index corruption |
| 6 | Bait token leaked | **CRITICAL ALERT**, investigate security breach |
| 7 | Missing search CLI | Alert dev team, check deployment |

**Example Router Configuration:**

```
Route 1: Success (exitCode = 0)
  → Log success
  → Update dashboard

Route 2: Missing Key (exitCode = 2)
  → Send Slack alert to #ops
  → Create incident ticket

Route 3: Bait Token Leaked (exitCode = 6)
  → Send CRITICAL alert to #security
  → Page on-call engineer
  → Disable Supermemory integration
  → Create P0 incident

Route 4: Other Failures (exitCode = 1, 3-5, 7)
  → Send alert to #ops
  → Create incident ticket
```

---

## Dead-Letter Queue Pattern

For production robustness, implement a dead-letter queue (DLQ) for failed executions:

### Step 1: Create a Data Store

Create a Make.com **Data Store** (or use an external database like Airtable, Google Sheets, or PostgreSQL) with the following schema:

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | DateTime | When the failure occurred |
| `script` | Text | Which script failed |
| `version` | Text | The version field from the JSON |
| `status` | Text | The status field from the JSON |
| `exitCode` | Number | The exit code |
| `hits` | JSON | The hits object |
| `p95` | Number | The P95 latency |
| `receiptFile` | Text | The receipt file name |
| `rawOutput` | Text | The full JSON output |

### Step 2: Add to Failure Routes

In each failure route, add a **Data Store** module (or HTTP module to your external database) to log the failure.

### Step 3: Create a Monitoring Dashboard

Create a separate Make.com scenario (or external dashboard) that:
- Queries the DLQ data store
- Sends daily summaries of failures
- Alerts if the failure rate exceeds a threshold

---

## Recommended Scenario Structure

Here's a complete scenario structure for production use:

```
1. [Schedule Trigger] Every 15 minutes
   ↓
2. [HTTP] Execute restart-supermemory.ps1 -MakeFriendly -Strict
   ↓
3. [Parse JSON] Parse the script output
   ↓
4. [Router] Route based on version and status
   ├─ Route 1: Version Mismatch
   │   ↓
   │   [Slack] Send alert to #ops
   │   ↓
   │   [Stop]
   │
   ├─ Route 2: Success (exitCode = 0)
   │   ↓
   │   [Data Store] Log success to metrics DB
   │   ↓
   │   [HTTP] Update dashboard
   │
   ├─ Route 3: Bait Token Leaked (exitCode = 6)
   │   ↓
   │   [Slack] Send CRITICAL alert to #security
   │   ↓
   │   [PagerDuty] Page on-call engineer
   │   ↓
   │   [Data Store] Log to DLQ
   │   ↓
   │   [HTTP] Disable Supermemory integration
   │
   └─ Route 4: Other Failures
       ↓
       [Slack] Send alert to #ops
       ↓
       [Data Store] Log to DLQ
       ↓
       [HTTP] Create incident ticket
```

---

## Testing Your Integration

### Step 1: Test in Human Mode First

Before integrating with Make.com, test the scripts in human mode on your server:

```powershell
# Test without strict mode
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\restart-supermemory.ps1

# Test with strict mode
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\restart-supermemory.ps1 -Strict
```

Verify that:
- The script completes successfully
- The positive control hits >= 1
- The bait token hits = 0

### Step 2: Test Make-Friendly Output

Test the Make-friendly output:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\restart-supermemory.ps1 -MakeFriendly -Strict
```

Verify that:
- The output is a single JSON object
- There are no extraneous lines
- The `version` field is `"sm-make-v1"`
- The `strict` field is `true`

### Step 3: Test in Make.com

Create a test scenario in Make.com that:
1. Executes the script
2. Parses the JSON
3. Logs the output to a data store

Run the scenario manually and verify that the JSON is parsed correctly.

### Step 4: Test Failure Scenarios

Intentionally trigger failures to test your routing:

- **Missing key:** Temporarily rename the `SUPERMEMORY_API_KEY` environment variable.
- **Index failure:** Temporarily make the `src/` directory unreadable.
- **Bait token leak:** (Do NOT test this in production! Only test in a dev environment.)

Verify that:
- The correct exit code is returned
- The Make.com router sends the alert to the correct channel
- The failure is logged to the DLQ

---

## Security Considerations

### 1. Never Log Secrets

The scripts are designed to never print API keys or other secrets. However, you should still ensure that:
- Make.com logs are not publicly accessible
- Data stores containing script output are properly secured
- Alerts do not include sensitive information

### 2. Validate the `version` Field

Always validate the `version` field before processing the JSON. This prevents unexpected behavior if the script is upgraded without updating your Make.com scenarios.

### 3. Use HTTPS for All Requests

If you're using HTTP modules to execute the scripts, always use HTTPS to prevent man-in-the-middle attacks.

### 4. Implement Rate Limiting

If your scripts are triggered by external events (e.g., webhooks), implement rate limiting to prevent abuse.

---

## Monitoring and Alerting

### Key Metrics to Track

1. **Success Rate:** Percentage of script executions that return `exitCode = 0`.
2. **P95 Latency:** 95th percentile latency from the `p95` field.
3. **Failure Rate by Exit Code:** Track which exit codes are most common.
4. **Bait Token Leaks:** Should always be zero. Any non-zero value is a critical security incident.
5. **Version Mismatches:** Track how often the `version` field doesn't match `"sm-make-v1"`.

### Recommended Alerts

1. **Success Rate < 95%:** Send alert to #ops.
2. **P95 Latency > 5000ms:** Send alert to #ops.
3. **Bait Token Leak (exitCode = 6):** Send CRITICAL alert to #security and page on-call.
4. **Version Mismatch:** Send alert to #ops.
5. **No Executions in Last Hour:** Send alert to #ops (scenario may be disabled).

---

## Troubleshooting

### "Version mismatch" alerts

**Cause:** The script is outputting a different version than expected.

**Solution:**
1. Check that you're using the v1 scripts.
2. Verify that the `-MakeFriendly` flag is being used.
3. Check the script output manually to see what version is being returned.

### "Strict mode not enabled" alerts

**Cause:** The script was executed without the `-Strict` flag.

**Solution:**
1. Update your Make.com scenario to include `-Strict` in the script arguments.
2. Verify that the execution command includes `-Strict`.

### "Index CLI JSON output missing" errors

**Cause:** The index CLI is not outputting JSON, and `-Strict` mode is enabled.

**Solution:**
1. Upgrade your index CLI to output JSON (see the "A Note on -Strict and the Index CLI" section in `SUPERMEMORY_INTEGRATION.md`).
2. Alternatively, run without `-Strict` mode (not recommended for production).

### "Bait token leaked" alerts

**Cause:** The bait token was found in the index, which should never happen.

**Solution:**
1. **This is a critical security issue.** Investigate immediately.
2. Check if the indexer is indexing files it shouldn't (e.g., `node_modules`).
3. Review the receipt file to see what was indexed.
4. Consider rotating your Supermemory API key.

---

## Next Steps

1. **Implement the basic integration pattern** with a scheduled trigger.
2. **Add version enforcement** to ensure only `sm-make-v1` outputs are processed.
3. **Set up exit code routing** for intelligent failure handling.
4. **Create a dead-letter queue** for failed executions.
5. **Configure monitoring and alerting** for key metrics.
6. **Test thoroughly** in a dev environment before deploying to production.

---

## Support

For questions or issues with the Supermemory scripts, refer to:
- `docs/SUPERMEMORY_INTEGRATION.md` - Script usage and features
- `QUICK_START.md` - Getting started guide
- `docs/USER_GUIDE.md` - Comprehensive user guide

For Make.com-specific questions, refer to the [Make.com documentation](https://www.make.com/en/help/scenarios).
