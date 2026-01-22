# Slack Slash Commands (/sintra)

This repo supports Slack slash commands routed to SintraPrime.

## Endpoint

- Request URL: `https://<your-host>/api/slack/command`
- Local dev example (port 3001):
  - Start: `UI_PORT=3001 node ui/server.js`
  - Command URL: `http://localhost:3001/api/slack/command`

## Security (required in production)

Slack signs requests.

Set:
- `SLACK_SIGNING_SECRET` (Slack App → Basic Information → Signing Secret)

The server verifies:
- `X-Slack-Request-Timestamp` (5 min tolerance)
- `X-Slack-Signature`

Local testing override:
- `SLACK_ALLOW_UNVERIFIED=1` (only for localhost)

## Commands

Use one master command in Slack (recommended):
- `/sintra`

Then subcommands:
- `/sintra help`
- `/sintra help voice`
- `/sintra help oracle`
- `/sintra help voice oracle`
- `/sintra case 1123`
- `/sintra enforce verizon`
- `/sintra deadline list`
- `/sintra voice "Explain today's game plan"`
- `/sintra search notice of dishonor`
- `/sintra explain UCC 3-603(b)`
- `/sintra file <url-or-permalink>`
- `/sintra voice-mode on`
- `/sintra voice-mode off`
- `/sintra voice-mode oracle`
- `/sintra voice-mode channel off`
- `/sintra voice-mode status`
- `/sintra trust`
- `/sintra system`

## Behavior

- The HTTP response is *ephemeral* and fast.
- The real action happens async via the internal event bus.
- Results are posted back into the channel where the command was run.

## AI explain

Set:
- `OPENAI_API_KEY`
- Optional: `OPENAI_MODEL` (default: `gpt-4.1-mini`)
