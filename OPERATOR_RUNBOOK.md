# Operator Runbook (v1)

This runbook is the practical operating procedure for running the system without breaking the constitutional invariants.

## Roles (O1 / O2 / O3)

### O1 — Viewer
- May run the Operator UI (read-only views of `runs/**`).
- May verify exported audit bundles.
- Must not run live commands.
- Must not possess secrets.

### O2 — Read Operator
- May run **read-only live adapters** (e.g. Notion live read).
- May export audit bundles for executions.
- Has a scoped Notion token.
- Must not approve writes.

### O3 — Approver (explicitly delegated)
- May run `/approve <execution_id>`.
- Must be trained on policy denial vs approval-required behavior.
- Must maintain an audit trail of approvals.

## Golden rules (never break)

- Do not edit artifacts in `runs/**`.
- If something fails: re-run with a clean terminal environment; do not hot-patch evidence.
- Any external write must pass the approval gate; no bypasses.
- Every execution must produce a receipt and at least one artifact (“no silent work”).
- Treat `docs/CONSTITUTION.v1.md` as supreme.

## Safe terminal hygiene

Use a fresh terminal for live runs. Do not carry CI/smoke variables into live sessions.

For live runs, do **not** set:
- `SMOKE_VECTORS_USE_REMOTE`
- smoke-runner vars (anything you only use for smoke harness)

## Live Notion read (O2)

### Required env
Set only what you need (never commit these):

```powershell
$env:WEBHOOK_SECRET="..."                 # if validator/planner require a secret
$env:NOTION_TOKEN="secret_..."            # real Notion integration token (scoped)
$env:NOTION_API_BASE="https://api.notion.com"
$env:NOTION_API_VERSION="2022-06-28"
$env:NOTION_REDACT_KEYS="title,name,email,phone,address"
$env:AUTONOMY_MODE="OFF"
```

### Run commands
Database snapshot:

```bash
node --import tsx ./src/cli/run-command.ts "/notion live db <DATABASE_ID>"
```

Single page snapshot:

```bash
node --import tsx ./src/cli/run-command.ts "/notion live page <PAGE_ID>"
```

### If the command returns `ApprovalRequired`
Stop. You are not in a read-only posture. Do not proceed without O3 review.

## Notion schema drift guard (O2 + CI)

Purpose: detect **silent Notion drift** (renamed properties, rebuilt selects, changed option IDs) *before* Make.com scenarios or operator tooling quietly break.

### Setup

- Copy the example config: `control/notion-automation-config.example.json` → `control/notion-automation-config.json`
- Fill real `database_id` values and property names.
- Keep `control/notion-automation-config.json` local-only (gitignored).

### Generate a live schema snapshot

```bash
npm run notion:schema:snapshot
```

This writes `scripts/schema-snapshots/notion.schema-snapshot.json` with per-DB fingerprints.

### Establish/refresh a baseline

When your Notion schema is in a known-good state, copy:

```bash
copy scripts\\schema-snapshots\\notion.schema-snapshot.json scripts\\schema-snapshots\\notion.schema-baseline.json
```

Commit the baseline if you want drift checks enforced in CI.

### Lint for drift

```bash
npm run notion:schema:lint
```

If this fails, treat it as **fail-closed**: fix the schema via migration (add → migrate → deprecate), then regenerate the baseline.

### Enforce drift gate (blocked receipt)

This is the “no schema drift, no execute” enforcement layer:

- On drift, writes a **Blocked Run Receipt** under `runs/blocked_schema_drift_*/receipt.json` (safe to export/log; no secrets)
- Exits with code `2` to block CI or local pipelines

```bash
npm run notion:schema:gate
```

Debug without writing artifacts (still exits `2` on drift):

```bash
node scripts/notion-schema-gate.mjs --dry-run
```

Optional (OFF by default): flip a dedicated Notion “Schema Drift Gate” page to `BLOCKED` when drift is detected:

- Set `NOTION_SCHEMA_DRIFT_GATE_FLIP=1`
- Set `NOTION_SCHEMA_DRIFT_GATE_PAGE_ID=<page_id>`

If enabled and the flip fails, the run still blocks.

### Gate flip doctor (no more mysterious Notion 400s)

Before enabling `NOTION_SCHEMA_DRIFT_GATE_FLIP=1`, validate the gate row and its parent database schema:

```bash
npm run notion:gate:doctor
```

This checks:

- The gate page is a row inside a database (not a standalone page)
- The parent database has the required properties + types
- The gate row page payload exposes those properties in a patchable shape

## Export audit bundle (O2)

After you have an `execution_id` from the receipt/output:

```bash
node --import tsx ./src/cli/run-command.ts "/audit export <execution_id>"
```

## Court packet (O2)

Generate a clerk-ready folder packet from the execution:

```bash
node --import tsx ./scripts/make-court-packet.ts <execution_id> --run-type <db|page> --target-id <NOTION_ID>
```

This copies governance docs, receipt + hash, audit bundle zip + verify.js, and the redacted artifacts for that execution.

## Verifying an audit bundle (O1+)

If you have `audit_bundle_<execution_id>.zip`:
- Unzip it.
- In the unzipped folder, run:

```bash
node verify.js
```

A passing verification exits 0.
