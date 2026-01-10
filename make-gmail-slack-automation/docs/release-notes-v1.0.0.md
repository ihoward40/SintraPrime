# v1.0.0 — Deterministic Gmail → Slack Alerts (Label-Gated)

## Summary
This release introduces a production-grade, deterministic Gmail → Slack alerting
system using Make.com.

The system eliminates repeat Slack spam, mystery triggers, and unsafe side effects
by:
- Using Gmail labels as the source of truth
- Splitting notification and cleanup into separate scenarios
- Enforcing strict non-negotiable rules (no admin commands, no mixed responsibilities)

## Included
- Two Make.com scenario templates:
  - Gmail → Slack Notify (signals only)
  - Gmail → Delete After Notify (cleanup only)
- Canonical runbook (label-gated, split, loop-proof)
- Incident response one-pager
- Operator checklist card
- Notion SOP content
- Loom onboarding script

## Guarantees
- One Slack message per eligible email
- No reposts without explicit human intervention
- Every Slack message is explainable from Gmail state + Make execution history

## Non-Negotiable Rules
- No Slack post without label-gating
- No admin commands in automation
- No delete without POSTED label
- Slack never triggers upstream systems

Status: **Production**
