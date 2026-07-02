# GOV-000 — Governance Traceability Matrix

```yaml
Document:
  Title: GOV-000 Governance Traceability Matrix
  Artifact: GOV-000
  Version: v0.1
  Status: Initial scaffold
  Owner: Governance Function
  Classification: Constitutional Companion
  Parent Document: CONST-001 Enterprise Constitution
```

## Purpose

Provide a single traceability view across Tier 1 constitutional artifacts and their governance companions.

## Constitutional Purity Rule

Each artifact must answer one governing question only. The `Primary Question` column is mandatory and is the first traceability check.

## Matrix

| Artifact | Tier | Primary Question | Current Maturity | Status | Parent | Implements | Implemented By | Verified By |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CONST-001 | Tier 1 | What supreme constitutional rules govern the enterprise? | C2 | Governance Review Candidate | None | Constitutional supremacy baseline | CONST-002, CONST-003, CONST-004, manuals, playbooks | GRF, GOV-000 |
| CONST-002 | Tier 1 | How may the enterprise be organized structurally? | C1 | Draft | CONST-001 | Organizational structure and authority model | Department Handbook, Agent Handbook, Approval Matrix, RACI Matrix | GRF, GOV-000 |
| CONST-003 | Tier 1 | How is governance authority constituted and constrained? | C0 | Not started | CONST-001 | Governance authority model | Governance manuals, review controls | GRF, GOV-000 |
| CONST-004 | Tier 1 | How are standards authority and standards custody constituted? | C0 | Not started | CONST-001 | Standards authority model | Standards manuals, repository standards | GRF, GOV-000 |
| ADR-0001 | Companion | Why is the Tier 1 constitutional baseline frozen now? | C3 | Accepted | CONST-001 | Tier 1 constitutional freeze decision | Review planning and constitutional sequencing | GOV-000 |
| GRF | Companion | How are governance review findings classified and dispositioned? | C1 | Draft | CONST-001 | Review disposition model and impact classes | Governance reviews and maturity gates | GOV-000, artifact review records |
| GOV-000 | Companion | How is constitutional traceability maintained across artifacts? | C1 | Initial scaffold | CONST-001 | Constitutional traceability baseline | Future governance indexes and evidence maps | GRF, matrix maintenance review |
| CMM | Companion | How is constitutional maturity measured from draft to governed state? | C1 | Draft | CONST-001 | Maturity criteria C0..C6 | Review planning, ratification readiness | GOV-000, GRF |

## Notes

- Update this matrix when artifact maturity, parentage, or verification sources change.
- Supporting manuals and playbooks should be added as they are created, without changing the one-question boundary of Tier 1 artifacts.
