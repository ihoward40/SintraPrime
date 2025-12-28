# Agent Mode Engine

## Windows path note

You may see the repo at both:

- C:\Users\admin\agent-mode-engine
- C:\Users\admin\.sintraprime esm project\agent-mode-engine

On this machine, the second path is a Windows junction that points to the first.
They are the same working tree.

Run commands from either path, but prefer C:\Users\admin\agent-mode-engine to avoid confusion.

## Speech tiers (stderr-only)

The CLI can emit optional speech lines to stderr for operator visibility.
Speech is derived-only (non-authoritative), does not change behavior, and does not affect the JSON emitted on stdout.

Enable speech with SPEECH_TIERS (comma-separated):

- S3: delta speech (notable changes)
- S5: autonomy/status speech
- S6: requalification + confidence feedback (threshold crossings)

Speech is also artifact-backed for auditability:

- runs/speech-deltas/
- runs/speech-status/
- runs/speech-feedback/

Example (Windows cmd):

- set SPEECH_TIERS=S3,S5,S6

## Email ingest webhook (Gmail -> Make -> SintraPrime)

This repo includes a small HTTP server that accepts Gmail/Make payloads and persists immutable evidence artifacts.

### Run locally

- Start local server: npm run email:server
- Start local server: npm run email:server
- Health check: GET <http://localhost:8788/health> returns {"status":"ok"}
- Ingest: POST <http://localhost:8788/email_ingest>

Optional auth:

- Set EMAIL_INGEST_SECRET and send header X-Email-Ingest-Secret: &lt;value&gt; (or X-Webhook-Secret).

### Cloudflare tunnel (for Make)

- cloudflared tunnel --url <http://localhost:8788>
- Use the resulting https://&lt;...&gt;.trycloudflare.com/email_ingest as the Make HTTP module URL.

### Evidence + dedupe

- The server dedupes by vendor + message_id.
- Evidence artifacts are written under runs/email-ingest/&lt;vendor&gt;/.

## Gmail OAuth (read-only mail reader)

If you want SintraPrime to read creditor emails directly (without copy/paste), use the local Gmail OAuth flow:

- Setup guide: docs/gmail-oauth.md
- One-time auth: npm run gmail:auth
- Pull + ingest (canonical entrypoint): node dist/cli/main.js gmail.pull --since 30d --labels ALL --max 200 --vendor auto

## Make.com + Slack automation hardening

If you are using Make.com to push TikTok leads (or any upstream events) into Slack, and/or you have Slack-triggered scenarios (invites, routing, auto-moderation), use this runbook to prevent empty-field “ghost posts” and self-triggering Slack loops:

- docs/make-slack-automation-hardening.md

## Agent mode vs. SintraPrime (boundaries)

This document clarifies what “agent mode” typically implies vs. what SintraPrime is designed to do in this repo (governed plans, evidence artifacts, approvals).

- docs/agent-mode-vs-sintraprime.md
- [Workflow runner](docs/workflows/workflow-runner.md)

## Workflow runner (live + auditable)

Run a workflow spec (YAML or JSON):

- Build: npm run build
- Run: node dist/cli/main.js workflow.run --spec templates/workflows/repo-healthcheck.yaml

Workflow receipts are written as timestamped JSON under:

- runs/workflow/{workflow_id}/{timestamp}.json

Replay a stored receipt (non-executing):

- node dist/cli/main.js workflow.replay --receipt <path-to-receipt.json>

### Smoke run (local)

In one terminal, start the mock server:

- npm run mock:server

In another terminal:

- node dist/cli/main.js workflow.run --spec templates/workflows/workflow-smoke.yaml

### BrowserAgent example

BrowserAgent is Playwright-backed and blocks unknown domains by default (see browser.allowlist.json).

Example node:

```yaml
- id: open_github
  step:
    adapter: BrowserAgent
    method: goto
    url: https://github.com
```

Artifacts (HAR + screenshot) are written into the per-step folder under runs/.

### Shell + Slack notifier (failure)

Example: run a command, then emit to a webhook only on failure.

```yaml
- id: healthcheck
  step:
    adapter: ShellAdapter
    shell: bash
    command: "curl -sSf {{HEALTH_URL}}"
  emit:
    mode: failure
    event_type: workflow.failure
    url: "{{SLACK_WEBHOOK_URL}}"
```

### Environment variable injection (template vars)

Use `--dotenv` and/or `--secrets` to inject template variables (e.g. `{{REPO_URL}}`).

- node dist/cli/main.js workflow.run --spec templates/workflows/repo-healthcheck.yaml --dotenv .env

## Governed automation scaffold (agent-mode expansion)

New TypeScript landing zones (additive; do not replace the existing executor):

- src/governed-adapters/ (Gmail/Notion/Snapshot adapters with receipts)
- src/virtual-browser/ (Playwright wrapper + policy helpers)
- src/multi-agent/ (planner/validator/executor loop helpers)
- src/workflow-engine/ (receipt + scope gate helpers)

Workflow templates:

- templates/workflows/email-to-notion.yaml (live insert when dry_run=false; Notion writes remain approval-gated)
- templates/workflows/repo-healthcheck.yaml (ShellAdapter; set dry_run as needed)


## Web snapshot (policy change radar foundation)

The ops server also supports evidence-grade web snapshots:

- POST /web_snapshot (one-off capture)
- POST /web_watch (store a watch config)
- GET /web_snapshot/<snapshot_id> (retrieve meta)
- GET /web_snapshot/<snapshot_id>?file=html|pdf|screenshot|diff (retrieve artifacts)

Notes:

- Artifacts are stored under runs/web-snapshots/&lt;vendor&gt;/&lt;url-hash&gt;/&lt;ts&gt;/
- Diffs are computed against the previous snapshot for that URL.
- If OPS_SERVER_SECRET is set, include header X-Operator-Secret for web endpoints.

Quick local test:

- Start server: npm run email:server
- Snapshot test: npm run snapshot:test
- Add a watch: POST /web_watch
- Run watches once: npm run web:watch:once
