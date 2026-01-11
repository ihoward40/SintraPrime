# Refusal Code Glossary

Refusals are **expected** and **healthy**. They indicate the system chose safety over action.

## Core apply gates

- `PLAN_NOT_APPROVED` — Missing `runs/<RUN_ID>/plan/approved.json`.
- `APPLY_MODE_NOT_MANUAL` — Control config does not allow apply (must be manual).
- `CONFIRM_APPLY_REQUIRED` — Missing `CONFIRM_APPLY=1` environment variable.

## Missing inputs / credentials

- `MISSING_TOKEN` — Required token not present (e.g., `NOTION_TOKEN`, `SLACK_BOT_TOKEN`).
- `CONFIG_DISABLED` — Connector disabled in `control/config.yaml`.

## Plan/Run integrity

- `RUN_ID_MISMATCH` — Attempted to apply a plan created for a different run.
- `MISSING_OBSERVE` — Plan requested but observe inventory is missing.
- `MISSING_PLAN` — Apply requested but plan file is missing.

## Unsupported / invalid

- `UNSUPPORTED_ACTION` — Planner produced an action the executor does not support.
- `INVALID_PARAMS` — Action parameters are missing or malformed.

## Notes

- Refusal codes are part of the audit trail. Add new codes only when necessary, and document them here.
