# Phase VI — USPS Mail Automation (Governed)

This folder documents the **Phase VI** governed scenario contracts for USPS label creation and tracking.

## Scenario IDs

| Scenario ID | Purpose | Lint Profile | Trigger |
|---|---|---|---|
| `MAIL_LABEL_PRINT` | Create/record a label request and attach a printable label URL + label hash | `audit-only` | Notion button (Cases DB) |
| `MAIL_TRACK_CERTIFIED` | Poll USPS tracking and notify on state change | `notify-only` | Scheduler (recommended) or Notion button |

## Governance invariants

- **State-change gating required** (hash-delta) to prevent periodic spam.
- **Runs Ledger is append-only**; Mailings row is the mutable “latest view”.
- **Slack is signal only** (no interactive approvals).

## Files

- Templates: `make-gmail-slack-automation/templates/`
  - `template-mail-label-print.json`
  - `template-mail-track-certified.json`
- Lint sidecars: `scenarios/`
  - `MAIL_LABEL_PRINT.lint.json`
  - `MAIL_TRACK_CERTIFIED.lint.json`
- Notion schema: `notion/schemas/Mailings.schema.json` (v1.0.1)
