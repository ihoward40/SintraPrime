# Make Lint — Operator Guide (Short, Brutal, Useful)

## What this is

Make Lint is CI enforcement.
If it fails, the build stops.

Slack is never a system of record.
Slack is the last human checkpoint.

## Where the rules live

- Lint profiles: `governance/make-lint/lint_profiles/*.json`
- Per-scenario declarations: `scenarios/*.lint.json`
- Runner: `scripts/check-make-lint.mjs` (helpers in `scripts/lint-utils.mjs`)
- Machine report: `governance/make-lint/lint-report.json`

## How to add a new scenario safely

1. Add your Make scenario JSON export (or deterministic definition) under `make-gmail-slack-automation/templates/`.
2. Ensure it contains a stable `scenario_id`.
3. Create `scenarios/<SCENARIO_ID>.lint.json`.
4. Run `npm run ci:make-lint`.
5. Do not merge if lint fails.

## How to read failures

CI prints a tight summary:

- `❌ MAKE LINT FAILED`
- `Scenario: <SCENARIO_ID>`
- `Rule: <rule_code>`
- `Module ID: <id>` (when applicable)

Then consult `governance/make-lint/lint-report.json` for the full offender list.

## Common fixes (without weakening policy)

- **State-change gating:** add a label gate, datastore dedupe, or explicit hash-delta compare before Slack posts.
- **Periodic Slack spam:** remove scheduler → Slack post patterns; if a scheduler exists, Slack must be gated (or policy must permit it explicitly).
- **Authority flows:** add Slack interactive approval if the profile requires it.
- **Audit flows:** add hash computation + ledger write where required.

## Non-negotiables

- No bypassing strict/audit failures.
- If you need a new exception, encode it in a profile or scenario declaration and review it like code.
