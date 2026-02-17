# Agent Mode Executor v1

This repo implements an API-native “agent mode” pipeline:

1) Validator → policy + schema gate (JSON-only)
2) Planner → produces a strict `ExecutionPlan` (JSON-only)
3) Executor → runs the plan deterministically against APIs
4) Persistence → writes a tamper-evident-ish receipt log (local JSONL and/or webhook)

## Design goals

- **API-only authority**: no live browser control, no “click the UI”, no login flows.
- **Boring + defensible**: every run produces a receipt that can be audited.
- **Deterministic execution**: steps are explicit; runtime behavior is constrained.
- **Least privilege**: secrets are required by name (from env), never inlined.
- **Idempotency**: safe re-runs via derived or explicit idempotency keys.

## Contracts

- Validator output is `ValidatedCommand` or a deny result.
- Planner output is `NeedInput` or `ExecutionPlan`.
- Executor input is an `ExecutionPlan` and returns receipts with:
  - step outcomes
  - runtime metadata
  - hashes/IDs for traceability

Schema source of truth: `src/schemas/ExecutionPlan.schema.ts`.

## Receipts

Receipts are persisted by `src/persist/persistRun.ts`:

- If a webhook is configured, it can forward receipts to an external system of record.
- Otherwise, it appends to `runs/receipts.jsonl`.

Receipts are intended to be machine-parsable and safe to share (no secrets).

## Execution safety rules

- Deny or require approval for state-changing actions unless explicitly authorized.
- Never request secrets from the user.
- Never claim an external side effect occurred unless the executor reports it.
- If required inputs are missing, return `NeedInput` instead of guessing.

## How to run (local)

- `npm install`
- `npm run smoke:local`

To run a specific command through the pipeline:

- `npm run smoke:local -- "/build validation-agent {\"dry_run\":true}"`

If you want to run live Notion writes, configure the required env vars and run with approvals enabled.

## Webhook smoke (planner + validation)

This is a fast contract check for the two webhook endpoints:

- `POST /validation` (validator)
- `POST /planner` (planner)

It assumes a mock server is already running (default `http://localhost:8787`).

### Start the mock server

```powershell
$env:WEBHOOK_SECRET='local_dev_secret'
npm run mock:server
```

### Run the dual-endpoint smoke

```powershell
$env:WEBHOOK_SECRET='local_dev_secret'
node .\scripts\smoke-webhook-dual.js
```

If `:8787` is busy, run the mock server on another port and set `MOCK_BASE_URL` for the smoke script.

## God mode suggestions (optional enhancements)

These are intentionally **optional**: the current dual-endpoint CLI + mock server contract is already verified.

### 1) More command types

- **Status**: `/status <agent>` → `GET /planner/status?agent=...` (or a dedicated `/status` endpoint)
- **Logs**: `/logs <agent> {"lines":100}` → `POST /planner/logs`
- **Config**: `/config get webhook_url` / `/config set key value` → `POST /planner/config`

### 2) Error handling + negative tests (contract hardening)

- Invalid agent name: `/build does-not-exist {}` should return a deterministic deny from `/validation`.
- Invalid JSON payload: ensure CLI returns a clear parse error before sending.
- Missing `taskId` for `/validate`: ensure parser rejects with usage/help.
- Missing/invalid `X-Webhook-Secret`: ensure server returns `401/403` and CLI surfaces status + body.

### 3) Batch operations

- Validate multiple tasks:
  - `/validate-batch {"tasks":[{"taskId":"task-1","payload":{...}}, ...]}`
- Build multiple agents:
  - `/build-batch {"agents":[{"agent":"a","payload":{...}}, ...]}`

### 4) Interactive mode

- Run `npm run dev` without args to enter a REPL:
  - `> /build validation-agent {"dry_run":true}`
  - `> /validate task-123 {"check":"syntax"}`
- Quality-of-life: history, `help`, and command completion.

### 5) Real backend integration

- Promote the mock URLs to production URLs via env vars:
  - `PLANNER_WEBHOOK_URL=https://.../planner`
  - `VALIDATION_WEBHOOK_URL=https://.../validation`
  - Keep `WEBHOOK_SECRET` out of git.

### 6) Deterministic receipts for webhooks

- Persist a compact, JSON-only receipt for every webhook call (request fingerprint + response hash + status).
- Add an idempotency key header for `POST` calls where applicable.

### 7) CI guardrail

- Add a CI job that starts the mock server and runs `node ./scripts/smoke-webhook-dual.js`.
  - Keep it self-contained: no external services, no secrets beyond a test secret.
