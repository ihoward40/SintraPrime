# Make.com Scenario Setup Guide

This guide walks through creating a Make.com scenario to receive webhooks from Airlock, verify signatures, upload files to Google Drive, create Notion database entries, and send Slack notifications.

## Overview

The Make scenario handles:
1. **Webhook Reception** - Receives sanitized receipts from Airlock
2. **HMAC Verification** - Validates Airlock→Make signature
3. **Router Logic** - Routes verified vs quarantined payloads
4. **Google Drive Upload** - Downloads and uploads PDFs from Airlock
5. **Notion Database** - Creates task entries with metadata
6. **Slack Notification** - Alerts team of new submissions
7. **Idempotency** - Uses Data Store to prevent duplicate processing

## Prerequisites

1. **Make.com account** - Sign up at https://make.com
2. **Airlock deployed** - See AIRLOCK_DEPLOYMENT.md
3. **Google Drive** - Account with folder for uploads
4. **Notion** - Database with appropriate schema
5. **Slack** - Workspace with incoming webhook configured

## Step 1: Create New Scenario

1. Go to https://make.com/dashboard
2. Click **Create a new scenario**
3. Name it: "SintraPrime Airlock → Drive/Notion/Slack"

## Step 2: Add Custom Webhook

### Module: Webhooks → Custom Webhook

1. **Add** the "Webhooks" app
2. Choose **Custom webhook**
3. Click **Create a webhook**
   - **Webhook name**: `Airlock Receipt Handler`
   - Click **Save**
4. **Copy the webhook URL** - This is your `MAKE_WEBHOOK_URL`
   - Example: `https://hook.us1.make.com/abc123def456...`
5. Save this URL - you'll add it to Airlock's `MAKE_WEBHOOK_URL` environment variable

### Data Structure Expected

The webhook will receive:
```json
{
  "task_id": "LOCAL-1738067400123",
  "task_title": "Airlock Handshake Test",
  "portal": "test",
  "source_system": "send_to_airlock.mjs",
  "no_submit_pay": true,
  "files": [
    {
      "name": "document.pdf",
      "mime": "application/pdf",
      "bytes": 12345,
      "sha256": "a1b2c3...",
      "download_url": "https://airlock.example.com/files/LOCAL-1738067400123/document.pdf"
    }
  ],
  "human_summary": "Local handshake test: sending 1 PDF(s)..."
}
```

Plus HMAC headers:
- `x-airlock-timestamp`: Unix timestamp (seconds)
- `x-airlock-signature`: HMAC-SHA256 signature

## Step 3: Add HMAC Verification Module

### Module: Tools → Set Variable

1. **Add** a "Tools → Set variable" module after webhook
2. **Variable name**: `hmac_verified`
3. **Variable value**: Use this formula (adjust based on Make's HMAC function):

**Option 1** (if Make has HMAC function):
```javascript
{{if(
  hmac(
    get("AIRLOCK_SHARED_SECRET"),
    get("x-airlock-timestamp") + "." + toString(webhook.body),
    "sha256",
    "hex"
  ) = get("x-airlock-signature");
  "verified";
  "quarantine"
)}}
```

**Option 2** (if Make requires manual HMAC-SHA256):
Note: Make.com's actual crypto functions may vary. The signature is computed as:
`HMAC-SHA256(secret, "${timestamp}.${json_body}")`

Consult Make.com documentation for the correct crypto module syntax.

**Important**: Store `AIRLOCK_SHARED_SECRET` securely in Make's Data Store or environment variables, never hardcode it in the scenario.

## Step 4: Add Router

### Module: Flow Control → Router

1. **Add** a Router after the HMAC verification
2. Configure two routes:
   - **Route 1**: Verified payloads
   - **Route 2**: Quarantine (suspicious/failed verification)

### Route 1: Verified

**Filter**: `{{hmac_verified}}` = `"verified"`

### Route 2: Quarantine

**Filter**: `{{hmac_verified}}` ≠ `"verified"`

## Step 5: Route 1 - Check Idempotency (Data Store)

### Module: Data Store → Get a record

1. **Add** "Data store → Get a record" on Route 1
2. **Data store**: Create or select `airlock_tasks`
3. **Key**: `{{task_id}}`
4. **If record doesn't exist**: Continue execution (don't throw error)

### Module: Router (Nested)

Add another router after Data Store check:

**Route A**: Record doesn't exist (new task) - Continue processing  
**Filter**: `{{isEmpty(datastore.task_id)}}`

**Route B**: Record exists (duplicate) - Log and skip  
**Filter**: Not Route A

## Step 6: Route 1A - Process Files

### For Each File in `files` Array

Use Make's **Iterator** or **Array aggregator** to loop through files.

### Module: HTTP → Make a request

For each file:

1. **URL**: `{{download_url}}`
2. **Method**: GET
3. **Parse response**: No
4. **Save to variable**: `file_data`

### Module: Google Drive → Upload a File

1. **Drive**: Select your Google Drive
2. **Folder**: Choose destination folder (e.g., "Airlock Receipts")
3. **File name**: `{{task_id}}_{{name}}`
4. **Data**: `{{file_data}}`
5. **Convert to Google Docs format**: No (keep as PDF)

**Output**: Save the `file.id` and `file.webViewLink` for Notion

## Step 7: Route 1A - Create Notion Entry

### Module: Notion → Create a Database Item

1. **Database**: Select your Notion database
2. **Map fields**:

| Notion Field | Make Value |
|--------------|------------|
| **Title** | `{{task_title}}` |
| **Task ID** | `{{task_id}}` |
| **Portal** | `{{portal}}` |
| **Source System** | `{{source_system}}` |
| **Files Count** | `{{length(files)}}` |
| **Human Summary** | `{{human_summary}}` |
| **Drive Links** | Join all `file.webViewLink` with newlines |
| **SHA256 Hashes** | Join all `sha256` with newlines |
| **Received At** | `{{now}}` |
| **Status** | "Received" |

**Notion Database Schema** (create if needed):

- Title (title)
- Task ID (text)
- Portal (select)
- Source System (text)
- Files Count (number)
- Human Summary (text)
- Drive Links (text or URL)
- SHA256 Hashes (text)
- Received At (date)
- Status (select: Received, Processing, Complete, Error)

## Step 8: Route 1A - Store in Data Store (Idempotency)

### Module: Data Store → Add a record

1. **Data store**: `airlock_tasks`
2. **Key**: `{{task_id}}`
3. **Value**: JSON object with task metadata

```json
{
  "task_id": "{{task_id}}",
  "task_title": "{{task_title}}",
  "files_count": "{{length(files)}}",
  "notion_page_id": "{{notion.id}}",
  "processed_at": "{{now}}"
}
```

This prevents duplicate processing if Airlock resends the same task.

## Step 9: Route 1A - Send Slack Notification

### Module: Slack → Send a Message

1. **Channel**: Select your channel (e.g., `#airlock-receipts`)
2. **Message text**:

```
🔒 *New Airlock Receipt*

*Task*: {{task_title}}
*ID*: {{task_id}}
*Portal*: {{portal}}
*Files*: {{length(files)}}

*Summary*:
{{human_summary}}

*Notion*: <link to Notion page>
*Drive*: <link to Drive folder>

✅ Verified and processed successfully
```

**Markdown formatting** supported in Slack.

## Step 10: Route 1B - Duplicate Task Handler

For tasks already processed (idempotency check failed):

### Module: Slack → Send a Message

1. **Channel**: `#airlock-receipts`
2. **Message**:

```
⚠️ *Duplicate Airlock Receipt (Skipped)*

*Task ID*: {{task_id}}
*Already processed at*: {{datastore.processed_at}}

This task was already received and processed. Skipping to prevent duplicates.
```

## Step 11: Route 2 - Quarantine Handler

For failed HMAC verification:

### Module: Slack → Send a Message

1. **Channel**: `#airlock-security-alerts` (create if needed)
2. **Message**:

```
🚨 *SECURITY ALERT: Airlock HMAC Verification Failed*

*Task ID*: {{task_id}}
*Timestamp*: {{x-airlock-timestamp}}
*Expected Signature*: [computed HMAC]
*Received Signature*: {{x-airlock-signature}}

This payload has been QUARANTINED and NOT processed.

⚠️ Possible attack or misconfiguration. Investigate immediately.
```

### Module: Data Store → Add a record

1. **Data store**: `airlock_quarantine`
2. **Key**: `{{task_id}}_{{now}}`
3. **Value**: Full webhook payload for forensics

## Step 12: Error Handling

### Add Error Handler to Entire Scenario

1. Click on the wrench icon in top-right
2. Add **Error handler** route
3. **Module**: Slack → Send a Message

```
❌ *Airlock Scenario Error*

*Task ID*: {{task_id}}
*Error*: {{error.message}}
*Module*: {{error.module}}

Check Make.com logs for details.
```

## Step 13: Test the Scenario

1. **Click "Run once"** in Make
2. Use the test script from Airlock deployment:

```bash
export AIRLOCK_URL=https://sintraprime-airlock.onrender.com
export MANUS_SHARED_SECRET=your-secret
node scripts/send_to_airlock.mjs ./test-pdfs
```

3. **Verify** in Make execution log:
   - Webhook received
   - HMAC verified
   - Files downloaded from Airlock
   - Files uploaded to Google Drive
   - Notion entry created
   - Slack notification sent

## Step 14: Activate the Scenario

1. **Switch from "Run once" to "On"**
2. Make is now listening for webhooks 24/7

## Step 15: Update Airlock with Webhook URL

1. Go to Render dashboard
2. Find your `sintraprime-airlock` service
3. Go to **Environment** tab
4. Update `MAKE_WEBHOOK_URL` with the webhook URL from Step 2
5. Click **Save Changes** (triggers redeploy)

## Advanced: Idempotency Pattern

The scenario uses Make's Data Store for idempotency:

1. **Check** if `task_id` exists in Data Store
2. **If exists**: Skip processing, log duplicate
3. **If new**: Process + store in Data Store
4. **TTL**: Set Data Store records to expire after 30 days (configurable)

This prevents:
- Duplicate Notion entries
- Duplicate Drive uploads
- Duplicate Slack notifications
- Wasted Make operations

## Monitoring and Alerts

### Key Metrics to Track

1. **Execution count** - How many webhooks received
2. **Error rate** - Failed executions
3. **Quarantine rate** - HMAC verification failures
4. **Duplicate rate** - Idempotency hits
5. **Latency** - Time from webhook to Slack notification

### Set Up Make Alerts

1. Go to scenario settings
2. Enable **Email notifications** for errors
3. Set up **Slack integration** for real-time alerts

## Troubleshooting

### HMAC Verification Always Failing

**Problem**: All requests routed to quarantine

**Solutions**:
1. Verify `AIRLOCK_SHARED_SECRET` matches in both Airlock and Make
2. Check timestamp parsing - Make uses seconds, not milliseconds
3. Ensure signature format is: `HMAC-SHA256(secret, "${timestamp}.${json_body}")`
4. Test with Make's built-in crypto functions

### Files Not Uploading to Drive

**Problem**: HTTP request to download file fails

**Solutions**:
1. Verify Airlock is storing files correctly (check `/dev/files` if enabled)
2. Check download URL is properly formatted
3. Ensure file hasn't expired from Airlock temp storage
4. Test download URL directly in browser

### Notion Entry Missing Fields

**Problem**: Notion entry created but fields are empty

**Solutions**:
1. Verify Notion database schema matches field mappings
2. Check field types (text vs select vs date)
3. Ensure webhook payload includes expected fields
4. Use Make's "View output" to inspect actual values

### Duplicate Processing Despite Idempotency

**Problem**: Same task processed multiple times

**Solutions**:
1. Check Data Store key format matches exactly
2. Verify Data Store record is created before processing completes
3. Look for race conditions (multiple webhooks arriving simultaneously)
4. Consider using Make's "Queue" feature for serialization

## Cost Optimization

Make pricing is based on **operations** (each module execution = 1 operation).

**Typical scenario cost per webhook**:
- Webhook receive: 1 op
- HMAC verification: 1 op
- Data Store check: 1 op
- HTTP request (per file): 1 op each
- Google Drive upload (per file): 1 op each
- Notion create: 1 op
- Data Store save: 1 op
- Slack notification: 1 op

**Example**: 2 PDFs = ~10 operations/webhook

Make free tier: 1,000 operations/month  
Paid plans: Start at $9/month for 10,000 operations

**Optimization tips**:
1. Batch multiple files in one payload when possible
2. Use Data Store TTL to auto-cleanup old records
3. Disable unnecessary modules during testing
4. Use Make's "minimum interval" to rate-limit webhooks

## Security Best Practices

1. **Never expose AIRLOCK_SHARED_SECRET** in Slack notifications
2. **Quarantine suspicious payloads** - Don't process without verification
3. **Log all quarantine events** for security audit
4. **Set up alerts** for high quarantine rate (possible attack)
5. **Rotate secrets** quarterly
6. **Use separate Slack channel** for security alerts (restricted access)
7. **Review Data Store records** periodically for anomalies

## Next Steps

1. ✅ Deploy Airlock (see AIRLOCK_DEPLOYMENT.md)
2. ✅ Create Make scenario (this guide)
3. → Test end-to-end with `send_to_airlock.mjs`
4. → Configure portal automation scripts to use Airlock
5. → Set up monitoring dashboards
6. → Document operational procedures

## Support

For issues:
1. Check Make execution logs
2. Review scenario configuration
3. Test with `send_to_airlock.mjs` script
4. Open GitHub issue with Make execution ID

---

**Last Updated**: 2026-01-27  
**Version**: 1.1.0  
**Maintained By**: SintraPrime Team
