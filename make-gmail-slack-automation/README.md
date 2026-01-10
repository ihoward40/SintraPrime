# Gmail → Slack Alerting (Deterministic, Loop-Proof)

### System Boundary Statement

This system is deliberately partitioned to prevent ambiguity, drift, and post-hoc interpretation. **JSON schemas define facts**, **Slack renders signals**, **Notion stores memory**, **runbooks define process**, and **packets are immutable artifacts**. No component infers intent, recalculates upstream data, or substitutes for another layer. Slack is never a source of truth; packets never originate new facts; databases never argue conclusions. Every output must be reproducible from recorded inputs, and every change must be explainable without narrative reconstruction. If a change cannot be traced to an explicit contract or source record, it does not belong in this system.

![Make templates guarded](https://img.shields.io/badge/Make%20templates-guarded%20✓-2ea44f?style=flat-square)

This repo contains production-grade Make.com templates and runbooks.

- No mystery triggers
- No repeat spam
- Explainable under pressure

Start here:

- `docs/INDEX.md`
- `docs/scenario-index.md`
- `docs/gmail-slack-label-gated-runbook.md`
- `docs/make-scenario-electrical-panel-architecture.md`
- `docs/verizon-guardian-primary-pipeline.v1.0.0.md`
- `docs/verizon-guardian-prompts.v1.0.1.md`
- `docs/verizon-guardian-notion-consumption.v1.0.1.md`
- `docs/slack-templates.md`
- `docs/notion-patterns-db.md`
- `docs/notion-claim-summary-db.md`
- `docs/notion-escalation-fields.md`
- `docs/notion-packet-record-db.md`
- `docs/complaint-packet-builder.md`
- `docs/packet-build-checklist.md`
- `docs/packet-rebuild-comparison.md`
- `templates/template-gmail-alert-to-slack-notify.json`

## Packaging (Internal Playbook)

### 1) Repo (GitHub)

```text
make-gmail-slack-automation/
├── README.md
├── templates/
│   ├── template-gmail-alert-to-slack-notify.json
│   └── template-gmail-delete-after-notify.json
└── docs/
    ├── gmail-slack-label-gated-runbook.md
    ├── incident-response-gmail-slack.md
    └── make-slack-automation-hardening.md
```

## TikTok → Slack (guarded)

For TikTok lead intake, use:

- `templates/template-tiktok-comment-intake-v1.1-guarded.json`

It documents the guardrails that stop common failures:

- Empty/heartbeat payloads causing blank Slack posts
- Duplicate deliveries causing Slack spam (dedupe by comment ID)
- Bot/self-trigger loops (including `/invite @IkeBot` patterns)
- Junk Google Sheets rows (validation gate before add-row)

Commit message:

```text
Add deterministic label-gated Gmail → Slack runbook (Option A)
```
- Paste the entire contents of `docs/gmail-slack-label-gated-runbook.md`
- Keep headings as-is
- Optional top callout: “This SOP is the single source of truth. Do not improvise.”

### 3) PDF (incident binder)

1. Paste the markdown into Google Docs or Notion
2. Ensure page width = standard letter
3. Export as PDF
4. Name it:

```text
Gmail-Slack-Alerts-Deterministic-Runbook.pdf
```
