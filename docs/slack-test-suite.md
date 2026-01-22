# Slack Test Suite (Router)

These endpoints let you prove the Slack → EventBus → Watchtower wiring without relying on Slack/Make/Gmail.

## Requirements

- UI server running (`node ./server.js`)
- Admin token set in env: `CLUSTER_ADMIN_SECRET=...`
- Requests include header: `X-Sintra-Admin: <secret>`

If you want to disable admin gating (not recommended): set `SLACK_TEST_REQUIRE_ADMIN=0`.

## Endpoints

- `GET /api/slack/test/watchtower`
  - Returns Slack health + Watchtower state for dashboard tiles.
- `POST /api/slack/test/ping`
  - Sends a test message to `SLACK_DEFAULT_CHANNEL`.
- `POST /api/slack/test/simulate-token-expired`
  - Emits a synthetic `slack.error` with `token_expired`.
- `POST /api/slack/test/fake-creditor-event`
  - Emits `creditor.observed` with a Verizon-like payload.
