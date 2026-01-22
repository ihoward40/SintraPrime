# Slack API (SintraPrime as Slack Brainstem)

Goal: Make.com (and other systems) call SintraPrime, and SintraPrime performs Slack actions with idempotency + guardrails.

## Setup

- Set `SLACK_BOT_TOKEN` in your local env (see [control/secrets.env.example](control/secrets.env.example)).
- Start the UI server on port 3001:
  - `UI_PORT=3001 node ui/server.js`

## Slack health / troubleshooting

If Slack starts returning `token_expired` / `invalid_auth`, the UI will temporarily disable Slack delivery to avoid log storms.

- Check status (admin auth required):
  - `GET /api/admin/slack/status`
- Force a recheck (calls `auth.test`):
  - `POST /api/admin/slack/recheck`

Fix for `token_expired`:
- Reinstall the Slack app to the workspace (Slack regenerates the bot token).
- Update `SLACK_BOT_TOKEN` and restart the UI server.

Optional: create a fresh Slack app via manifest:
- See [docs/slack-app-manifest.yml](docs/slack-app-manifest.yml)

## Endpoints

### POST /api/slack/send

Sends a message via `chat.postMessage`.

- Body:
  - `channel` (channel ID or name)
  - `text`
  - optional: `thread_ts`
  - optional: `idempotency_key`
- Header (optional): `Idempotency-Key`

```bash
curl -sS -X POST "http://localhost:3001/api/slack/send" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: case-123-stage-change" \
  -d "{\"channel\":\"#all-ikesolutions\",\"text\":\"Case 123 moved to stage REVIEW.\"}"
```

### POST /api/slack/file

Uploads a local file (server-side path) to Slack via `files.uploadV2`.

- Body:
  - `channel_id` (Slack channel ID is required for file upload)
  - `filePath` (absolute or workspace-relative path on the server)
  - optional: `title`
  - optional: `initial_comment`

```bash
curl -sS -X POST "http://localhost:3001/api/slack/file" \
  -H "Content-Type: application/json" \
  -d "{\"channel_id\":\"C0123456789\",\"filePath\":\"artifacts/voice/router/case-briefings/CASE-123-isiah.mp3\",\"title\":\"Case Briefing\"}"
```

You can also pass a channel name (e.g. `#all-ikesolutions`) if the bot token has `channels:read` / `groups:read`.

### POST /api/slack/join

Ensures the bot is in a channel (idempotent).

- Body:
  - `channel` (Slack channel ID)

```bash
curl -sS -X POST "http://localhost:3001/api/slack/join" \
  -H "Content-Type: application/json" \
  -d "{\"channel\":\"C0123456789\"}"
```

Notes:
- Public channels: the bot can usually `conversations.join` itself.
- Private channels: this endpoint will return `needs_invite` — invite the bot once in Slack, then it becomes idempotent.

## Internal integrations

For in-process workflows (cases/enforcement/intelligence layers), you can emit events on the internal event bus instead of calling HTTP endpoints:
- [docs/event-bus.md](docs/event-bus.md)

## Slash commands

To turn Slack into a command console (e.g. `/sintra help`):
- [docs/slack-slash-commands.md](docs/slack-slash-commands.md)

## High-level hooks (recommended)

These endpoints are “Slack ⇢ SintraPrime ⇢ Everything” friendly: they take semantic payloads and SintraPrime formats + dedupes.

### POST /api/slack/case-update

```bash
curl -sS -X POST "http://localhost:3001/api/slack/case-update" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: case-CASE-123-stage" \
  -d "{\"channel\":\"#all-ikesolutions\",\"caseId\":\"CASE-123\",\"title\":\"Stage moved to REVIEW\",\"summary\":\"Awaiting signatures.\"}"
```

### POST /api/slack/enforcement

```bash
curl -sS -X POST "http://localhost:3001/api/slack/enforcement" \
  -H "Content-Type: application/json" \
  -d "{\"channel\":\"#enforcement-alerts\",\"creditor\":\"Verizon\",\"status\":\"Escalated\",\"details\":\"New deadline triggered.\"}"
```

### POST /api/slack/tiktok-lead

```bash
curl -sS -X POST "http://localhost:3001/api/slack/tiktok-lead" \
  -H "Content-Type: application/json" \
  -d "{\"channel\":\"#tiktok-leads\",\"username\":\"someuser\",\"comment\":\"How do I start?\",\"link\":\"https://tiktok.com/...\"}"
```

### POST /api/slack/error

```bash
curl -sS -X POST "http://localhost:3001/api/slack/error" \
  -H "Content-Type: application/json" \
  -d "{\"channel\":\"#alerts\",\"source\":\"notion-sync\",\"error\":\"Rate limit\",\"context\":\"job_id=abc\"}"
```

### POST /api/slack/voice-briefing

Generates an MP3 via ElevenLabs and uploads it to Slack.

```bash
curl -sS -X POST "http://localhost:3001/api/slack/voice-briefing" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: daily-briefing-2026-01-20" \
  -d "{\"channel\":\"#all-ikesolutions\",\"text\":\"Daily operational briefing...\",\"subdir\":\"daily-briefings\"}"
```
