---
sidebar_position: 5
title: WhatsApp
description: WhatsApp Business API integration for governed messaging and templates.
---

# WhatsApp

SintraPrime integrates with the WhatsApp Business API for governed messaging, template management, and media handling through ClawdBot.

## Setup

1. Set up a WhatsApp Business Account through Meta Business Suite
2. Configure the WhatsApp Business API
3. Add to `.env`:

```bash title=".env"
WHATSAPP_BUSINESS_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_BUSINESS_ID=your-business-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token
```

## Features

| Feature | Description |
|:---|:---|
| **Template Messages** | Pre-approved message templates for outbound communication |
| **Session Messages** | Free-form messages within 24-hour conversation windows |
| **Media Messages** | Send and receive images, documents, and audio |
| **Interactive Messages** | Buttons, lists, and quick replies |
| **Webhooks** | Receive message and status events |

## Message Templates

WhatsApp requires pre-approved templates for outbound messages:

```json
{
  "template": "trust_alert",
  "language": "en",
  "components": [
    {
      "type": "body",
      "parameters": [
        {"type": "text", "text": "Credit monitoring alert detected"}
      ]
    }
  ]
}
```

## Governance

- All WhatsApp messages are receipted
- Template usage is tracked and governed
- Media handling follows evidence chain of custody
- Compliance with WhatsApp Business Policy is enforced

:::info Beta Status
WhatsApp integration is currently in beta. Template messaging is stable; interactive message features are under development.
:::

## Next Steps

- [TikTok](./tiktok) — TikTok integration
- [Multi-Platform Bots Overview](./overview) — All platforms
