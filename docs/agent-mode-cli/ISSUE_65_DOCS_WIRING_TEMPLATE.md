# Agent-Mode CLI v1 — Docs & Wiring (Issue #65)

## Purpose
This document is the *single source of truth* for:
- How to install and run the CLI
- How auth works (local + CI)
- Command contract (inputs/outputs)
- Receipt emission (ERE) and redaction (TPRE-lite)
- Troubleshooting / runbook

---

## Quickstart (2 minutes)
### Requirements
- Node >= 18
- pnpm or npm (specify which)
- Access to Supabase env + API keys

### Install
```bash
# from repo root
pnpm -w install
pnpm -w build
```

### Configure

Create `.env.local` (or copy from `.env.example`)

```env
SINTRAPRIME_API_BASE_URL=
SINTRAPRIME_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### Run

```bash
pnpm -w cli:help
pnpm -w cli:status
```

---

## CLI Commands (Contract)

> Every command MUST return a receipt pointer and a human summary.

### `sintra status`

**What it does:** checks API + DB connectivity
**Outputs:**

* stdout: summary
* exit code: 0 if healthy
* receipt_ref: printed + written to `artifacts/last_smoke_receipt_ref.txt` (optional)

### `sintra logs`

**What it does:** fetches last N receipts/events
**Flags:**

* `--limit 50`
* `--since 2026-02-01`

### `sintra config`

**What it does:** prints masked config + validates required vars

### `sintra batch <file>`

**What it does:** runs a batch plan file and emits receipts per step

### `sintra repl`

**What it does:** interactive mode with strict guardrails

---

## Wiring Diagram (High Level)

CLI → API (tRPC/REST) → DB
CLI → ERE (receipt write)
CLI → TPRE-lite (redaction) → logs

---

## ERE Requirements

* Append-only receipts
* Idempotency key per run
* Hash chain / canonical JSON

**Receipt fields required:**

* run_id
* action_type
* object_type + object_id
* inputs_hash
* outputs_hash
* timestamp_utc
* redaction_applied: true/false

---

## TPRE-lite Requirements

* Never log raw secrets
* Never store PII in plaintext (email/phone/address)
* Redact before persistence

**Redaction rules:** see `docs/runbooks/TPRE_LITE.md`

---

## Troubleshooting

### Auth failures

* Symptom: 401 Unauthorized
* Fix: confirm API key present + not expired

### “messages insert failed”

* Symptom: DB insert error
* Fix: verify snake_case columns + RLS policy

### LLM invoke 500 / upstream

* Symptom: 500 with code 13
* Fix: retry + fallback provider + capture receipt with redaction

---

## Acceptance Criteria

* Fresh install works on Windows + Linux
* `status` succeeds
* `batch` runs 1 sample file
* Receipts produced for each command
* Smoke test passes in CI
