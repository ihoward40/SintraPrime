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

## Specs and templates added (stubs-only)

- [docs/governance/external-evidence-addons.md](external-evidence-addons.md) — Docs-only add-ons (mailing records, FOIA packet variants, public verifier concept).
- [docs/governance/public-verifier/manifest.template.json](public-verifier/manifest.template.json) — Integrity-only manifest template (no interpretation).

## Constitutional implementation package (Tier 1)

- [docs/governance/constitutional/CONST-002.review-package.c1.md](constitutional/CONST-002.review-package.c1.md) — Governance assurance package for CONST-002 C1 review preparation.
- [docs/governance/constitutional/CONST-002.organizational-charter.c1.draft.md](constitutional/CONST-002.organizational-charter.c1.draft.md) — Structural-only organizational charter draft.
- [docs/governance/constitutional/ADR-0001.tier1-constitutional-freeze.md](constitutional/ADR-0001.tier1-constitutional-freeze.md) — Tier 1 constitutional freeze decision record.
- [docs/governance/constitutional/GOV-000.governance-traceability-matrix.v0.1.md](constitutional/GOV-000.governance-traceability-matrix.v0.1.md) — Constitutional traceability bridge initialization.
- [docs/governance/constitutional/GRF-REGISTER.CONST-002.round-1.md](constitutional/GRF-REGISTER.CONST-002.round-1.md) — Governance Review Findings register for CONST-002.
- [docs/governance/constitutional/HERMES-constitutional-readiness-dashboard.founding-week.md](constitutional/HERMES-constitutional-readiness-dashboard.founding-week.md) — Current constitutional readiness snapshot.

## Review guardrails (PR-time only)

- [.github/pull_request_template.md](../../.github/pull_request_template.md) — Governance wiring review checklist.
- [.github/workflows/require-wiring-scope.yml](../../.github/workflows/require-wiring-scope.yml) — Requires a scope document when runtime-adjacent paths change.
- [.github/workflows/pr-scope-bot.yml](../../.github/workflows/pr-scope-bot.yml) — Comments scope hash + file list into PR history.
- [.github/workflows/require-two-approvals-on-expansion.yml](../../.github/workflows/require-two-approvals-on-expansion.yml) — Enforces two approvals when `authority-expansion` label is present.

## Baseline tag

- `governance-docs-baseline-2026-01` — Annotated tag anchoring the initial “specs/schemas/templates only” baseline.
