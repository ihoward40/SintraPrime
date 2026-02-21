---
sidebar_position: 6
title: TikTok
description: TikTok integration for content publishing and analytics.
---

# TikTok

SintraPrime integrates with TikTok's API for governed content publishing and analytics tracking through ClawdBot.

## Setup

1. Create a TikTok Developer account at [developers.tiktok.com](https://developers.tiktok.com)
2. Register your application and obtain API credentials
3. Add to `.env`:

```bash title=".env"
TIKTOK_CLIENT_KEY=your-client-key
TIKTOK_CLIENT_SECRET=your-client-secret
TIKTOK_ACCESS_TOKEN=your-access-token
```

## Capabilities

| Feature | Description |
|:---|:---|
| **Video Publishing** | Upload and publish video content |
| **Analytics** | Track video performance metrics |
| **Comment Management** | Monitor and respond to comments |
| **Audience Insights** | Analyze audience demographics |

## Content Publishing

The Content Production Agent can publish video content to TikTok:

```bash
npx sintraprime agent run \
  --agent content-production-agent \
  --task "Publish the product demo video to TikTok" \
  --publish tiktok \
  --params '{"video": "/content/demo.mp4", "caption": "SintraPrime in action"}'
```

## Governance

- All TikTok API operations are receipted
- Content publishing requires governance approval
- Analytics data is collected and stored with receipts
- Platform compliance is enforced

:::warning Alpha Status
TikTok integration is currently in alpha. Core publishing functionality is available, but advanced features (live streaming, shopping integration) are planned for future releases.
:::

## Next Steps

- [Content Production Agent](../agents/content-production-agent) — Content creation for TikTok
- [Multi-Platform Bots Overview](./overview) — All platforms
