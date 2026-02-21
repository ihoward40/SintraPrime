---
sidebar_position: 7
title: SMS Adapter
description: Governed SMS messaging for notifications and two-way communication.
---

# SMS Adapter

The SMS adapter provides governed access to SMS messaging services for sending notifications, receiving responses, and integrating with two-way communication workflows.

## Configuration

```bash title=".env"
SMS_PROVIDER=twilio  # or vonage, messagebird
SMS_API_KEY=your-api-key
SMS_API_SECRET=your-api-secret
SMS_FROM_NUMBER=+1234567890
```

## Operations

| Operation | Description |
|:---|:---|
| `send` | Send an SMS message |
| `receive` | Process incoming SMS via webhook |
| `notify` | Send a templated notification |
| `verify` | Send a verification code |

## Usage

```typescript
const result = await smsAdapter.execute({
  type: 'send',
  params: {
    to: '+1987654321',
    message: 'SintraPrime Alert: Governance mode changed to FROZEN',
  },
  governance: { mode: 'SINGLE_RUN_APPROVED', receipt_required: true },
});
```

## Notification Workflows

SMS is commonly used for critical alerts that require immediate attention:

- **System freeze notifications** — When SentinelGuard triggers a freeze
- **Approval requests** — When a task requires human approval
- **Escalation alerts** — When severity thresholds are exceeded

## Governance

- All SMS operations are receipted with message content and recipient
- Sending to new numbers requires approval on first use
- Rate limiting prevents SMS flooding
- Cost tracking for per-message charges

:::info Beta Status
The SMS adapter is currently in beta. Core functionality is stable, but some advanced features (MMS, group messaging) are under development.
:::

## Next Steps

- [Voice & Transcription](./voice-transcription) — Voice synthesis and transcription
- [Adapters Overview](./overview) — All available adapters
