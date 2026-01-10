# Gmail → Slack Alerting (Deterministic, Loop-Proof)

This repo contains production-grade Make.com templates and runbooks for
label-gated Gmail → Slack alerting.

## Key properties

- No mystery triggers
- No repeat spam
- Explainable under pressure

Start here:

- `docs/gmail-slack-label-gated-runbook.md`
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
    └── incident-response-gmail-slack.md
```

Commit message:

```text
Add deterministic label-gated Gmail → Slack runbook (Option A)
```

### 2) Notion (SOP page)

- Create a Notion page
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
