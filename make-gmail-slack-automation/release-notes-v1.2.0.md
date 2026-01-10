# SintraPrime Agent-Mode Engine v1.2.0 — Release Notes

Release date: Dec 2025

## Highlights
- BrowserAgent (Playwright-backed) with secure defaults: domain allowlist + artifacts (HAR + screenshot)
- Deterministic workflow receipts written to `runs/workflow/<workflow_id>/<timestamp>.json`
- Replay support: inspect stored receipts via `workflow.replay --receipt <path>`
- Policy hooks: browser allowlist + optional additive overrides via `policy.overrides.json`
- Onboarding bundle staged under `dist/onboarding/` and included in the release ZIP

## Secure by default
- Browser snapshots are blocked unless the hostname is allowlisted
  - Base: `browser.allowlist.json`
  - Optional additive overrides: `policy.overrides.json` (supports expiry)
- Secrets redaction applies when using `--secrets <path>` (receipts + logs)

## CLI quick start
```sh
npm install
npm run build

# Run a workflow spec
node dist/cli/main.js workflow.run --spec templates/workflows/browser.yaml

# Replay a stored workflow receipt
node dist/cli/main.js workflow.replay --receipt runs/workflow/<workflow_id>/<timestamp>.json
```

## Included templates
- `templates/workflows/browser.yaml` — BrowserAgent demo (goto + artifacts)
- `templates/workflows/repo-healthcheck.yaml` — ShellAdapter demo
- `templates/workflows/email-to-notion.yaml` — Gmail → governed Notion insert demo
- `templates/workflows/workflow-smoke.yaml` — Runner smoke test (mock server)

## Bundle + onboarding
- Release bundle: `agent-mode-engine/dist/bundle-v1.2.0.zip`
- Onboarding suite (also included inside the ZIP under `dist/onboarding/`):
  - `dist/onboarding/agent-mode-intro-slide-deck-v1.2.0.pdf`
  - `dist/onboarding/agent-mode-intro-slide-deck-v1.2.0.md`
  - `dist/onboarding/operator-one-pager-v1.2.0.md`
  - `dist/onboarding/notion-sop-onboarding-v1.2.0.md`

## Reproducible release command
From `agent-mode-engine/`:
```sh
npm run release:bundle:v1.2.0
```
This regenerates the onboarding assets and refreshes `dist/bundle-v1.2.0.zip` so contents are always in sync.
