---
sidebar_position: 4
title: Slack Adapter
description: Governed Slack operations for messaging, channels, and webhook integration.
---

# Slack Adapter

The Slack adapter provides governed access to Slack workspaces for sending messages, managing channels, and receiving webhook events. All Slack operations are receipted and subject to governance.

## Configuration

```bash title=".env"
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CHANNEL_DEFAULT=#sintraprime-alerts
```

## Operations

| Operation | Description |
|:---|:---|
| `message.send` | Send a message to a channel or user |
| `message.update` | Update an existing message |
| `channel.list` | List available channels |
| `channel.create` | Create a new channel |
| `webhook.receive` | Process incoming webhook events |
| `alert.send` | Send a formatted alert message |

## Alert Integration

SintraPrime uses Slack as a primary alert channel for:

- **SentinelGuard alerts** — Security and compliance notifications
- **Governance events** — Mode transitions, policy changes
- **Workflow notifications** — Step completions, failures
- **System health** — Service status changes

```typescript
// Send a governance alert
await slackAdapter.execute({
  type: 'alert.send',
  params: {
    channel: '#governance-alerts',
    title: 'Mode Transition',
    severity: 'info',
    message: 'System transitioned from READ_ONLY to SINGLE_RUN_APPROVED',
    receipt_ref: 'rcpt_a1b2c3d4',
  },
});
```

## Governance

- Message sending is governed and receipted
- Channel creation requires elevated permissions
- All incoming webhooks are verified with the signing secret
- Message content is included in receipts (configurable)

## Next Steps

- [Shell Adapter](./shell) — Command execution
- [Adapters Overview](./overview) — All available adapters
