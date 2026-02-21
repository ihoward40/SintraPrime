---
sidebar_position: 2
title: Telegram Bot
description: Telegram bot integration with commands, inline queries, and webhook configuration.
---

# Telegram Bot

SintraPrime's Telegram integration enables governed bot interactions through the Telegram Bot API via ClawdBot.

## Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) on Telegram
2. Copy the bot token
3. Configure in `.env`:

```bash title=".env"
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhooks/telegram
```

4. Set the webhook:

```bash
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${TELEGRAM_WEBHOOK_URL}\"}"
```

## Bot Commands

| Command | Description |
|:---|:---|
| `/start` | Initialize the bot and show welcome message |
| `/status` | Check SintraPrime system status |
| `/task <description>` | Submit a task to the agent engine |
| `/receipts` | View recent receipts |
| `/help` | Show available commands |

## Features

- **Text messages** — Natural language task submission
- **Inline queries** — Quick status checks and lookups
- **File sharing** — Send and receive documents through the bot
- **Notifications** — Receive alerts and task completion notifications
- **Group support** — Bot can operate in Telegram groups

## Governance

All Telegram interactions are:
- Receipted with message content and user identity
- Subject to rate limiting (configurable per user)
- Filtered through content governance policies
- Logged in the receipt ledger

## Next Steps

- [Discord Bot](./discord) — Discord integration
- [Multi-Platform Bots Overview](./overview) — All platforms
