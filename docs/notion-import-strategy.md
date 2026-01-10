# Notion Import Strategy (One-Click Template + Safe Migration)

This strategy is designed to prevent history corruption and governance drift.

## One-click template packaging

1. Create a top-level Notion page named:
   - `Legal Ops Command Center — Template`
2. Inside that page, create/import the 6 authoritative databases:
   - `Cases`
   - `Runs Ledger`
   - `Scenario Registry`
   - `Slack Workflow Registry`
   - `Mailings`
   - `FOIA Requests`
3. Ensure each database uses the exact property names from the schema artifacts:
   - `notion/schemas/*.schema.json`
4. Share → "Share to web" → enable **Allow duplicate as template**.
5. That public URL becomes the one-click import link.

## Parallel deploy + selective migration (recommended)

1. Import the template into the workspace (new, empty system).
2. Do **not** move legacy data yet.
3. Migrate only active matters:
   - Copy rows for open cases only.
   - Leave closed/historical items in the legacy space.
4. Do not backfill hashes unless you can recreate them honestly and deterministically.

## Migration CSVs

CSV artifacts are provided under `notion/migrations/`:

- Headers are the exact property names.
- Sample row demonstrates valid values.
- Relations are intentionally not auto-mapped in CSV to avoid accidental cross-linking.

## Enforcement alignment

- Notion is a command surface.
- Make is the execution plane.
- Enforcement is repo-side (Make Lint): Notion cannot "authorize" an unsafe automation.

See also:
- `docs/notion-button-webhook-contract.md`
- `docs/slack-make-governance.md`
