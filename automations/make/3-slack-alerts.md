# Make.com Scenario 3: Slack Alerts

## Overview

The Slack Alerts scenario sends real-time notifications to a Slack channel when high-severity runs are detected, enabling immediate operator response.

## Purpose

- **Notify**: Alert operators of high-severity runs
- **Inform**: Provide context and actionable information
- **Route**: Direct to appropriate team members based on severity
- **Track**: Maintain delivery status for audit trail

## Configuration

### Trigger

- **Type**: Scheduled
- **Interval**: Every 5 minutes
- **Module**: Data Store search for unalerted high-severity runs

### Required Variables

From `fieldmap.manifest.v1.json`:

- `slack_webhook`: Slack incoming webhook URL
- `slack_channel`: Target channel (default: #sintraprime-alerts)
- `severity_threshold`: Minimum severity for alerts (default: 3)
- `repo_path`: Path to repository (for run links)

### Modules in Scenario

1. **Data Store (Search)**
   - Query: `severity >= {{severity_threshold}} AND alerted = false`
   - Sort: By `classified_at` DESC
   - Limit: 10 runs per execution

2. **Iterate Runs**
   - Loop through unalerted runs

3. **Format Slack Message**
   - Use Text Aggregator or JSON module
   - Structure: See template below

4. **Send to Slack**
   - Module: HTTP POST or native Slack integration
   - URL: `{{slack_webhook}}`
   - Method: POST
   - Body: Formatted message JSON

5. **Update Data Store**
   - Set: `alerted = true`, `alerted_at = {{now}}`
   - Record: Slack delivery status

6. **Error Handler**
   - If webhook fails: Retry up to 3 times
   - If all fail: Log error, continue with next run

## Slack Message Template

### Basic Format

```json
{
  "channel": "{{slack_channel}}",
  "username": "SintraPrime Monitor",
  "icon_emoji": ":warning:",
  "text": "🚨 High-Severity Run Detected",
  "attachments": [
    {
      "color": "{{severity_color}}",
      "title": "Run: {{run_id}}",
      "title_link": "file:///{{repo_path}}/{{runs_dir}}/{{run_id}}",
      "fields": [
        {
          "title": "Severity",
          "value": "{{severity}} / 5",
          "short": true
        },
        {
          "title": "Analysis Type",
          "value": "{{analysis_type}}",
          "short": true
        },
        {
          "title": "Detected At",
          "value": "{{detected_at}}",
          "short": true
        },
        {
          "title": "Tier",
          "value": "{{tier}}",
          "short": true
        },
        {
          "title": "Reason",
          "value": "{{severity_reason}}",
          "short": false
        }
      ],
      "footer": "SintraPrime Make.com Monitor",
      "footer_icon": "https://platform.slack-edge.com/img/default_application_icon.png",
      "ts": "{{timestamp}}"
    }
  ]
}
```

### Severity Color Mapping

```
Severity 5: "danger" (red)
Severity 4: "warning" (orange)
Severity 3: "warning" (orange)
Severity 2: "good" (green)
Severity 1: "#808080" (gray)
```

### Extended Fields (Optional)

For severity >= 4, include:

```json
{
  "title": "Action Required",
  "value": "🔍 Investigate immediately\n📋 Review manifest: {{run_id}}/manifest.json\n🔐 Verify signature: {{has_signature}}",
  "short": false
}
```

## Advanced Features

### Thread Replies

For critical runs (severity 5):

1. Send initial alert
2. Capture `message_ts` from response
3. Send follow-up with detailed analysis as thread reply

### Mentions

Route by severity:

- Severity 5: `@security-team`
- Severity 4: `@ops-team`
- Severity 3: `@channel` (during business hours only)

### Rate Limiting

- Maximum 1 alert per run
- Maximum 10 alerts per 5-minute window
- If threshold exceeded: Send summary message

## Output

### Data Store Update

```json
{
  "run_id": "DEEPTHINK_20260123_094830_abc123",
  "alerted": true,
  "alerted_at": "2026-01-23T10:05:30Z",
  "slack_ts": "1706006730.123456",
  "slack_channel": "#sintraprime-alerts",
  "delivery_status": "success"
}
```

## Error Handling

- **Webhook unavailable**: Retry with exponential backoff (5s, 10s, 20s)
- **Invalid channel**: Log error, use default channel
- **Rate limit hit**: Queue message, send in next cycle
- **Message too long**: Truncate, add "See full details in run directory"

## Maintenance

### Daily

- Verify Slack integration is healthy
- Check for failed deliveries
- Review alert frequency

### Weekly

- Confirm webhook URL is still valid
- Test alert format with sample run
- Review operator feedback on alert quality

## Testing Checklist

- [ ] Alerts are sent within 5 minutes of classification
- [ ] Slack message format is correct
- [ ] Color coding matches severity
- [ ] Links are valid (if using file:// protocol)
- [ ] Mentions work correctly
- [ ] Data store is updated after delivery
- [ ] Error handling works (test with invalid webhook)

## Notes

- Slack delivery is **best-effort**, not guaranteed
- Alerts are informational, not authoritative
- Operators should verify alerts against source runs
- Consider adding DM notifications for severity 5
- Webhook URLs are sensitive—store in Make.com secrets
