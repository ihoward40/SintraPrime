# ADR-0001 — Tier 1 Constitutional Freeze

```yaml
Status: Accepted
Date: 2026-07-02
Decision Scope: Tier 1 constitutional baseline
Related Artifacts:
  - CONST-001 Enterprise Constitution v1.0-r2
  - CONST-002 Organizational Charter
  - CONST-003 Governance Charter
  - CONST-004 Standards Charter
  - GOV-000 Governance Traceability Matrix
  - GRF Process
```

## Context

SintraPrime is entering Founding Week and requires a stable constitutional baseline before adding more capabilities, automations, or governance-dependent structures. CONST-001 is directionally approved for freeze as the Governance Review Candidate baseline, but Tier 1 companion artifacts remain incomplete.

## Decision

1. CONST-001 v1.0-r2 is frozen as the Tier 1 Governance Review Candidate baseline at maturity level C2, with defect corrections permitted and structural changes prohibited.
2. Tier 1 constitutional drafting continues through CONST-002, CONST-003, and CONST-004 without reopening CONST-001 structure unless a constitutional defect is found.
3. Governance review will use the GRF process and GRF impact classes as the sole disposition path for constitutional findings.
4. GOV-000 is established as the companion traceability artifact for the Tier 1 set.
5. Each constitutional artifact must satisfy the Constitutional Purity Rule: one artifact answers one question only.

## Consequences

### Positive

- Tier 1 artifacts can mature in parallel against a stable constitutional anchor.
- Structural governance is separated from procedures, reducing future rewrite risk.
- Review outcomes become traceable and consistent across Founding Week.

### Constraints

- New structural scope must be deferred to the next constitutional amendment cycle unless it is a defect correction.
- Supporting manuals and playbooks must implement constitutional requirements rather than restating them.

## Review Trigger

Reopen this ADR only if a GRF-A finding shows that the Tier 1 freeze introduces a blocking constitutional defect.
