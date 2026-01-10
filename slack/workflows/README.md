# Slack Workflows (Phase IV)

This folder contains **deterministic workflow definitions** for Slack Workflow Builder.

These are **not** guaranteed to be importable Slack exports (Slack doesn’t provide a stable public export/import API for all workflow types).
Instead, these JSON files serve as:

- a locked contract for inputs/outputs
- naming + lane discipline enforcement
- a seed source for the Notion **Slack Workflow Registry** database

## Naming contract

- `required_name = "<CLASS> · <Workflow Name>"`
- `CLASS` must be one of: `INTAKE`, `REVIEW`, `DECISION`, `DEADLINE`, `AUDIT`

## Governance

- The registry seed is in `slack/registry/Slack_Workflow_Registry.seed.csv`.
- CI validation: `npm run -s ci:slack-workflows`
