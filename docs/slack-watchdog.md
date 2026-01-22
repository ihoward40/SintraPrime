# Slack Watchdog (Token Health + Best-Effort Refresh)

This repo includes a lightweight Slack Watchdog that:

- Periodically runs `auth.test` to detect auth problems early.
- Emits `slack.error` and `slack.token.refreshed` on the central event bus.
- Optionally attempts OAuth refresh via `oauth.v2.access` *if* you have refresh credentials.
- Never throws in a way that can crash the UI server.

## Enable

Set these in `control/secrets.env`:

- `SLACK_OFFLINE=0`
- `SLACK_WATCHDOG=1`
- `SLACK_WATCHDOG_INTERVAL_MS=720000` (12 minutes)

## OAuth refresh (optional)

Slack bot tokens are often **not refreshable**. If your Slack app has token rotation and you have a refresh token:

- `SLACK_ENABLE_OAUTH_REFRESH=1`
- `SLACK_CLIENT_ID=...`
- `SLACK_CLIENT_SECRET=...`
- `SLACK_REFRESH_TOKEN=...`

If refresh is not available, the watchdog will still detect the failure and the UI remains up; you then fix it by reinstalling the Slack app and updating `SLACK_BOT_TOKEN`.

## Token cache (optional; writes secrets to disk)

If you want a refreshed token to survive a reboot:

- `SLACK_TOKEN_CACHE_PATH=runs/slack_token_cache.json`

Only use this on trusted hosts.

## Status

Admin endpoint includes watchdog state:

- `GET /api/admin/slack/status`
