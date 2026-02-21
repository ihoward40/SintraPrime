---
sidebar_position: 5
title: Configuration Reference
description: Complete reference for all SintraPrime environment variables and configuration options.
---

# Configuration Reference

SintraPrime is configured through environment variables defined in a `.env` file. This page provides a complete reference for all available configuration options.

## AI Provider Configuration

| Variable | Required | Default | Description |
|:---|:---|:---|:---|
| `OPENAI_API_KEY` | Yes* | — | OpenAI API key for GPT models |
| `OPENAI_MODEL` | No | `gpt-4` | Default OpenAI model |
| `ANTHROPIC_API_KEY` | Yes* | — | Anthropic API key for Claude models |
| `KIMI_API_KEY` | No | — | Kimi K 2.5 API key (128K context) |
| `KIMI_BASE_URL` | No | — | Kimi API endpoint |
| `CLAWDBOT_ENDPOINT` | No | — | Self-hosted ClawdBot gateway URL |

:::info
*At least one AI provider key is required. SintraPrime supports multiple providers simultaneously.
:::

## Database Configuration

| Variable | Required | Default | Description |
|:---|:---|:---|:---|
| `MYSQL_HOST` | Yes | `localhost` | MySQL server hostname |
| `MYSQL_PORT` | No | `3306` | MySQL server port |
| `MYSQL_DATABASE` | Yes | `sintraprime` | Database name |
| `MYSQL_USER` | Yes | `root` | Database user |
| `MYSQL_PASSWORD` | Yes | — | Database password |
| `MYSQL_ROOT_PASSWORD` | Docker | — | Root password (Docker only) |

## Governance Configuration

| Variable | Required | Default | Description |
|:---|:---|:---|:---|
| `GOVERNANCE_MODE` | No | `READ_ONLY` | Default governance mode: `READ_ONLY`, `SINGLE_RUN_APPROVED`, `FROZEN` |
| `RECEIPT_SIGNING` | No | `enabled` | Enable Ed25519 receipt signing |
| `RECEIPT_DIR` | No | `./receipts` | Directory for receipt storage |
| `POLICY_GATES_ENABLED` | No | `true` | Enable policy gate enforcement |
| `MAX_SPEND_PER_TASK` | No | `10.00` | Maximum spend per task (USD) |
| `APPROVAL_REQUIRED` | No | `true` | Require human approval for destructive operations |

## Adapter Configuration

### Gmail

| Variable | Required | Default | Description |
|:---|:---|:---|:---|
| `GMAIL_CLIENT_ID` | Yes† | — | Google OAuth client ID |
| `GMAIL_CLIENT_SECRET` | Yes† | — | Google OAuth client secret |
| `GMAIL_REFRESH_TOKEN` | Yes† | — | OAuth refresh token |
| `GMAIL_INGEST_ENABLED` | No | `false` | Enable email ingest pipeline |

### Notion

| Variable | Required | Default | Description |
|:---|:---|:---|:---|
| `NOTION_API_KEY` | Yes† | — | Notion integration token |
| `NOTION_DRIFT_GATE` | No | `true` | Enable drift detection |

### Slack

| Variable | Required | Default | Description |
|:---|:---|:---|:---|
| `SLACK_BOT_TOKEN` | Yes† | — | Slack bot OAuth token |
| `SLACK_SIGNING_SECRET` | Yes† | — | Slack request signing secret |
| `SLACK_CHANNEL_DEFAULT` | No | — | Default channel for notifications |

### Browser (Playwright)

| Variable | Required | Default | Description |
|:---|:---|:---|:---|
| `BROWSER_HEADLESS` | No | `true` | Run browser in headless mode |
| `BROWSER_DOMAIN_ALLOWLIST` | No | `*` | Comma-separated allowed domains |
| `BROWSER_TIMEOUT` | No | `30000` | Navigation timeout (ms) |

†Required only if the adapter is used.

## Airlock Server Configuration

| Variable | Required | Default | Description |
|:---|:---|:---|:---|
| `AIRLOCK_PORT` | No | `3100` | Airlock server port |
| `AIRLOCK_HMAC_SECRET` | Yes | — | HMAC secret for payload verification |
| `AIRLOCK_RATE_LIMIT` | No | `100` | Requests per minute per IP |
| `AIRLOCK_CORS_ORIGINS` | No | `*` | Allowed CORS origins |

## Webhook Configuration

| Variable | Required | Default | Description |
|:---|:---|:---|:---|
| `WEBHOOK_URL` | No | — | External webhook endpoint |
| `WEBHOOK_SECRET` | No | — | Webhook signing secret |
| `MAKE_WEBHOOK_URL` | No | — | Make.com webhook URL |

## ElevenLabs Voice Configuration

| Variable | Required | Default | Description |
|:---|:---|:---|:---|
| `ELEVENLABS_API_KEY` | No | — | ElevenLabs API key |
| `ELEVENLABS_VOICE_ID` | No | — | Default voice ID |

## Application Settings

| Variable | Required | Default | Description |
|:---|:---|:---|:---|
| `NODE_ENV` | No | `development` | Environment: `development`, `production`, `test` |
| `LOG_LEVEL` | No | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `PORT` | No | `3000` | Brain service port |
| `WEBAPP_PORT` | No | `5173` | WebApp UI port |

## Docker-Specific Variables

These variables are only used in Docker Compose deployments:

| Variable | Default | Description |
|:---|:---|:---|
| `COMPOSE_PROJECT_NAME` | `sintraprime` | Docker Compose project name |
| `BRAIN_REPLICAS` | `1` | Number of brain service replicas |
| `MYSQL_VOLUME` | `mysql_data` | MySQL data volume name |

:::warning Security
Never commit `.env` files to version control. The repository includes `.env.example` and `.env.docker.example` as templates. Always use unique, strong values for secrets in production.
:::
