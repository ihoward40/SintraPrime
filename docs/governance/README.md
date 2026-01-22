# Governance (Read-Only Index)

> **Citation note:** This page is a read-only navigational index; all linked materials are documentation-only and non-executable, and do not grant authority or trigger system behavior.

This page is a **read-only navigation index** for governance documentation.
It is **not** enforcement, **not** wiring, and **not** runtime behavior.

## Quick navigation

- **For auditors / examiners:** Start with the scope-hash index to review declared intent over time, then follow individual pull requests as needed.
- **For reviewers / maintainers:** Review the wiring-scope template and PR guard workflows before proposing or evaluating any wiring changes.

## Start here

- [docs/README.md](../README.md) — Documentation scope statement (specifications only).
- [docs/governance/wiring-scope.md](wiring-scope.md) — Required scope declaration template for any future wiring.
- [docs/governance/scope-hash-index.md](scope-hash-index.md) — Auditor-diffable index of declared wiring intent over time.
- [docs/governance/governance-attestation.documentation-only.onepage.md](governance-attestation.documentation-only.onepage.md) — One-page documentation-only governance attestation (for filing packets).

## Operational posture docs (docs-only)

- [docs/governance/boot-posture.md](boot-posture.md)
- [docs/governance/authority-ladder.md](authority-ladder.md)
- [docs/governance/single-run-toggle-procedure.md](single-run-toggle-procedure.md)
- [docs/governance/affidavit-language.md](affidavit-language.md)
- [docs/governance/authority-ladder.svg](authority-ladder.svg)

## Specs and templates added (stubs-only)

- [docs/governance/external-evidence-addons.md](external-evidence-addons.md) — Docs-only add-ons (mailing records, FOIA packet variants, public verifier concept).
- [docs/governance/public-verifier/manifest.template.json](public-verifier/manifest.template.json) — Integrity-only manifest template (no interpretation).

## Review guardrails (PR-time only)

- [.github/pull_request_template.md](../../.github/pull_request_template.md) — Governance wiring review checklist.
- [.github/workflows/require-wiring-scope.yml](../../.github/workflows/require-wiring-scope.yml) — Requires a scope document when runtime-adjacent paths change.
- [.github/workflows/pr-scope-bot.yml](../../.github/workflows/pr-scope-bot.yml) — Comments scope hash + file list into PR history.
- [.github/workflows/require-two-approvals-on-expansion.yml](../../.github/workflows/require-two-approvals-on-expansion.yml) — Enforces two approvals when `authority-expansion` label is present.

## Baseline tag

- `governance-docs-baseline-2026-01` — Annotated tag anchoring the initial “specs/schemas/templates only” baseline.
