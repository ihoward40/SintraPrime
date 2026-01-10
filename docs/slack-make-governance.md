# Slack ↔ Make Governance (Enforced)

This repo treats automation as a controlled system.
**Slack is a signal surface and final human checkpoint.**
Make.com may compute, route, and build artifacts, but must obey enforcement rules.

## Core rules (enforced by CI)

- Slack posts must be gated by a state-change primitive (label gate, datastore dedupe, or explicit hash-delta gate).
- Strict scenarios may not use schedulers/cron triggers.
- If a scenario has authority-level actions (decision/audit), it must include a Slack interactive approval step when policy requires it.
- Policy violations fail the build.

## Where enforcement lives

- Profiles: `governance/make-lint/lint_profiles/*.json`
- Per-scenario policy: `scenarios/*.lint.json`
- Engine/CI entrypoint: `node scripts/check-make-lint.mjs`

## Operator workflow (one page)

1. Add/update a Make scenario JSON export or deterministic definition under `make-gmail-slack-automation/templates/`.
2. Ensure the scenario has a stable `scenario_id`.
3. Add a per-scenario declaration in `scenarios/`.
4. Run `npm run ci:make-lint`.
5. Do not merge if lint fails.

## Output

- Summary prints to console.
- Full machine-readable report is written to `governance/make-lint/lint-report.json`.
