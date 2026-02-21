---
sidebar_position: 4
title: Facebook & Instagram
description: Meta platform integration for messaging, content publishing, and ad management.
---

# Facebook & Instagram

SintraPrime integrates with Meta's platform APIs for Facebook Messenger, Instagram Direct Messages, page management, content publishing, and advertising through ClawdBot.

## Setup

1. Create a Meta App at [developers.facebook.com](https://developers.facebook.com)
2. Configure Messenger and Instagram products
3. Generate a page access token
4. Add to `.env`:

```bash title=".env"
META_ACCESS_TOKEN=your-page-access-token
META_APP_SECRET=your-app-secret
META_VERIFY_TOKEN=your-verify-token
META_WEBHOOK_URL=https://your-domain.com/webhooks/meta
```

## Capabilities

| Feature | Facebook | Instagram |
|:---|:---|:---|
| **Messaging** | Messenger bot | Direct Messages |
| **Content Publishing** | Page posts | Feed posts, Stories |
| **Ad Management** | Facebook Ads API | Instagram Ads |
| **Analytics** | Page Insights | Instagram Insights |
| **Webhooks** | Message events | Message events |

## Messaging

Both Facebook Messenger and Instagram DMs are handled through the same ClawdBot routing:

```
User Message → Meta Webhook → Airlock → ClawdBot → Agent → Response → Meta API → User
```

## Content Publishing

The Content Production Agent can publish to Facebook and Instagram:

```bash
npx sintraprime agent run \
  --agent content-production-agent \
  --task "Publish the weekly trust update to Facebook and Instagram" \
  --publish facebook,instagram
```

## Ad Integration

SintraPrime can manage Facebook/Instagram advertising campaigns:

- **Campaign creation** — Governed campaign setup with spending controls
- **Budget management** — Policy gates enforce ad spending limits
- **Performance tracking** — Campaign metrics collected and receipted
- **Compliance** — Ad content reviewed against platform policies

## Governance

- All Meta API operations are receipted
- Ad spending is subject to policy gate spending controls
- Content publishing requires governance approval
- Platform compliance is enforced automatically

:::info Beta Status
Facebook and Instagram integration is currently in beta. Messaging is stable; advanced ad management features are under development.
:::

## Next Steps

- [WhatsApp](./whatsapp) — WhatsApp Business integration
- [Multi-Platform Bots Overview](./overview) — All platforms
