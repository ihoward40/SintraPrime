# Test Workflows (v1.3.0 scaffolds)

These workflows are scaffolds meant to exercise the advanced adapters end-to-end.

They are set to `dry_run: true` by default so you can validate:
- YAML parsing
- plan compilation
- policy checks (URLs, allowlists, scopes)
- deterministic receipt writing

## Prereqs

From the engine repo:

```sh
cd agent-mode-engine
npm install
npm run build
```

## Run (dry-run)

Run any of these specs:

```sh
node dist/cli/main.js workflow.run --spec ../make-gmail-slack-automation/test-workflows/browser-capture-release.yaml
node dist/cli/main.js workflow.run --spec ../make-gmail-slack-automation/test-workflows/shell-slack-summary.yaml
node dist/cli/main.js workflow.run --spec ../make-gmail-slack-automation/test-workflows/gmail-forward-to-notion.yaml
```

Receipts are written under:
- `runs/workflow/<workflow_id>/<timestamp>.json`

## When mocks vs real secrets are needed

### `browser-capture-release.yaml`

- **Dry-run:** no network is called.
- **Live run (`dry_run: false`):**
  - The hostname in `TARGET_URL` must be allowlisted in `agent-mode-engine/browser.allowlist.json` (or added via `policy.overrides.json`).
  - If you replace the default `SLACK_WEBHOOK_URL` with a real Slack webhook, that becomes a live outbound POST.

### `shell-slack-summary.yaml`

- **Dry-run:** does not execute the command.
- **Live run (`dry_run: false`):**
  - Runs `npm test` locally (uses PowerShell by default).
  - Optional Slack notify becomes a live outbound POST if you set a real webhook URL.

### `gmail-forward-to-notion.yaml`

- **Dry-run:** no Gmail/Notion calls.
- **Live run (`dry_run: false`):**
  - Requires Gmail OAuth configuration used by `GmailAdapter`.
  - Requires a real Notion database id (`NOTION_DATABASE_ID`).
  - May trigger governance gates/approvals depending on your policy configuration.

## Local mock server (optional)

Some scaffolds default `SLACK_WEBHOOK_URL` to the engine mock endpoint so URL validation passes without placeholders.

If you want to run the webhook step for real (non-dry-run) without Slack, start the mock server:

```sh
cd agent-mode-engine
npm run mock:server
```
