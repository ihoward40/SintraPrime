# 🧭 SintraPrime Agent-Mode Engine — Onboarding

## 1) Install + Build

```bash
npm install
npm run build
```

## 2) Run Your First Flow (Browser Snapshot)

Run the included BrowserAgent example:

```bash
node dist/cli/main.js workflow.run --spec templates/workflows/browser.yaml
```

## 3) View Receipts + Artifacts

After a run, you’ll get two useful receipt locations:

- Workflow receipt (one per workflow run):
  - `runs/workflow/<workflow_id>/<timestamp>.json`
- Step receipts + artifacts (per execution id / step):
  - `runs/<execution_id>/step-XX/receipt.json`
  - For `BrowserAgent` steps you should see:
    - `runs/<execution_id>/step-XX/network.har`
    - `runs/<execution_id>/step-XX/screenshot.png`

## 4) Add a Slack Notification (via WebhookAdapter)

Slack incoming webhooks expect a payload like `{ "text": "..." }`.

Add a second node that posts to Slack using `WebhookAdapter`:

```yaml
kind: WorkflowDefinition
workflow_id: onboarding-slack-demo
threadId: onboarding

dry_run: false

goal: "Browser snapshot + Slack notify"

vars:
  SLACK_WEBHOOK_URL: "{{SLACK_WEBHOOK_URL}}"

nodes:
  - id: snapshot
    step:
      adapter: BrowserAgent
      method: goto
      url: https://github.com
    on_success: notify

  - id: notify
    step:
      adapter: WebhookAdapter
      method: POST
      url: "{{SLACK_WEBHOOK_URL}}"
      payload:
        text: "Browser snapshot succeeded for https://github.com"
      expects:
        http_status: [200, 201, 202, 204]
```

Tip: use `--dotenv` or `--secrets` to provide `SLACK_WEBHOOK_URL`.

## 5) Replay for Audit

```bash
node dist/cli/main.js workflow.replay --receipt runs/workflow/<workflow_id>/<timestamp>.json
```
