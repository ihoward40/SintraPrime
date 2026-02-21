---
sidebar_position: 2
title: Gmail Adapter
description: Governed email operations with the Gmail adapter including ingest pipeline and receipt generation.
---

# Gmail Adapter

The Gmail adapter provides governed access to Google Gmail for sending, receiving, and processing emails. It includes a complete email ingest pipeline that flows from Gmail through Make.com into SintraPrime's evidence systems.

## Configuration

```bash title=".env"
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
GMAIL_INGEST_ENABLED=true
```

## Operations

| Operation | Description | Receipt Generated |
|:---|:---|:---|
| `send` | Send an email | Yes |
| `read` | Read emails by label or query | Yes |
| `ingest` | Process emails through evidence pipeline | Yes |
| `parse` | Extract structured data from emails | Yes |
| `attach` | Handle email attachments | Yes |

## Sending Email

```typescript
const result = await adapter.execute({
  type: 'send',
  params: {
    to: 'recipient@example.com',
    subject: 'Weekly Trust Report',
    body: reportContent,
    attachments: [{ name: 'report.pdf', path: '/tmp/report.pdf' }],
  },
  governance: { mode: 'SINGLE_RUN_APPROVED', receipt_required: true },
});
```

## Email Ingest Pipeline

The ingest pipeline processes incoming emails as evidence:

```
Gmail → Make.com Webhook → Airlock Server → Brain → Evidence System
```

1. **Gmail** — Emails matching configured filters trigger a Make.com scenario
2. **Make.com** — Extracts email metadata, body, and attachments
3. **Airlock** — Receives the payload with HMAC verification
4. **Brain** — Processes through governance and evidence tagging
5. **Evidence System** — Stores with chain of custody documentation

## Governance

- All email operations require governance mode `SINGLE_RUN_APPROVED` or higher
- Sending emails to external addresses requires approval by default
- Email content is logged in receipts (configurable redaction available)
- Attachment handling follows the same governance rules

:::warning Email Compliance
Email operations may be subject to regulatory requirements (CAN-SPAM, GDPR). Ensure your governance configuration aligns with applicable regulations.
:::

## Next Steps

- [Email Ingest](../evidence-systems/email-ingest) — Detailed ingest pipeline documentation
- [Adapters Overview](./overview) — All available adapters
