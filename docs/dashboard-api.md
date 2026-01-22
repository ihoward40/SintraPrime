# Dashboard API

These APIs expose live enforcement-chain status for a frontend dashboard and allow per-case overrides.

If `DASHBOARD_API_KEY` is set, requests must include header `X-API-Key: <value>`.

## GET /health

Returns a simple JSON liveness response.

## Running (Auto-Port + Auto-Restart)

- Auto-port fallback: set `UI_PORT` (desired) and optionally `UI_PORT_FALLBACK_RANGE` (default 20).
- Supervised restart loop: `npm run server:supervised`.

## POST /api/enforcement/test-start

Test-only helper to seed a case into the enforcement chain without a REPL.

Body:
- `creditor` (required)
- `caseId` (required)
- `strategy` (optional)
- `initialDoc` (optional)

## GET /api/dashboard/stats

UI-friendly aggregates.

## GET /api/dashboard/creditors

Groups cases by creditor.

## Slack: /sintra enforce-start

Usage:
- `/sintra enforce-start <CreditorName> <CaseId> [strategy] [initialDoc]`

## GET /api/dashboard/status

Query params (optional):
- `creditor=...` (substring match)
- `caseId=...` (exact)
- `mode=conservative|standard|aggressive`

Returns:
- `systemMode`
- `items[]` of enforcement states

## GET /api/dashboard/modes

Returns:
- `systemMode`
- `presets` (mode definitions)

## POST /api/dashboard/system-mode

Body:
- `{ "mode": "conservative" | "standard" | "aggressive" }`

Sets the default mode applied to newly created case states.

## GET /api/cases/config

Query:
- `creditor` (required)
- `caseId` (required)

## POST /api/cases/config

Body:
- `creditor` (required)
- `caseId` (required)
- `mode` (optional)
- `baseDaysOverride` (optional number)
- `urgencyOverride` (optional number)
- `paused` (optional boolean)

## POST /api/cases/start

Starts an enforcement chain for a case.

Body:
- `creditor` (required)
- `caseId` (required)
- `channel` (optional)
- `strategy` (optional)
- `initialDoc` (optional)
- `persona` (optional)
