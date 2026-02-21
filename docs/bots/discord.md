---
sidebar_position: 3
title: Discord Bot
description: Discord bot integration with slash commands, embeds, and server management.
---

# Discord Bot

SintraPrime's Discord integration provides governed bot interactions through Discord's slash command system via ClawdBot.

## Setup

1. Create a Discord application at [discord.com/developers](https://discord.com/developers)
2. Create a bot user and copy the token
3. Configure OAuth2 with the `bot` and `applications.commands` scopes
4. Add to `.env`:

```bash title=".env"
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_GUILD_ID=your-server-id
```

## Slash Commands

| Command | Description |
|:---|:---|
| `/sintraprime status` | Check system status |
| `/sintraprime task <description>` | Submit a task |
| `/sintraprime receipts [count]` | View recent receipts |
| `/sintraprime governance` | View current governance mode |
| `/sintraprime help` | Show available commands |

## Features

- **Rich embeds** — Formatted responses with status indicators
- **Thread support** — Long-running tasks create threads for updates
- **Role-based access** — Commands restricted by Discord roles
- **Webhook notifications** — System alerts posted to configured channels
- **File attachments** — Share reports and evidence documents

## Governance

Discord interactions follow the same governance model as all other adapters:

- Every command execution generates a receipt
- Role-based permissions map to SintraPrime governance levels
- Content filtering applies to all outbound messages
- Rate limiting prevents abuse

## Next Steps

- [Facebook & Instagram](./facebook-instagram) — Meta platform integration
- [Multi-Platform Bots Overview](./overview) — All platforms
