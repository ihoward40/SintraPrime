# Constitutional Governance — Founding Week

> **Scope:** This directory contains Tier 1 constitutional artifacts, governance assurance records, and Founding Week execution alignment documents. All files are documentation-only governance artifacts. They do not grant runtime authority or trigger system behavior.

## Directory Purpose

This directory serves as the authoritative source for:

- Tier 1 constitutional artifact packages (CONST-001 through CONST-004)
- Architectural Decision Records (ADR) governing constitutional-layer choices
- Governance Request Forms (GRFs) tracking defects and improvement requests
- Hermes governance status and maturity dashboards
- Governance traceability matrix (GOV-000)
- Audit baseline and progression records (GOV-AUD)
- Mission artifacts (MISSION) for Founding Week mandates
- Executive direction snapshots

## Artifact Index

| ID | File | Status | Tier |
|----|------|--------|------|
| CONST-001 | *(frozen — governed via ADR-0001)* | Ratified | T1 |
| CONST-002 | CONST-002.review-package.c1.md | Draft → Review | T1 |
| ADR-0001 | ADR-0001.tier1-constitutional-freeze.md | Approved | T1 |
| ADR-0002 | *(planned — Constitutional Review Protocol)* | Reserved | T1 |
| ADR-0003 | *(reserved — unassigned)* | Reserved | — |
| GOV-000 | GOV-000.governance-traceability-matrix.v0.1.md | Draft | T1 |
| GOV-AUD-001 | GOV-AUD-001.baseline-audit.md | Approved | T1 |
| GRF Register | GRF-REGISTER.CONST-002.round-1.md | Active | T1 |
| MISSION-0001 | MISSION-0001.founding-week.md | Approved | T1 |
| Exec Snapshot | executive-direction-snapshot.founding-week.md | Approved | T1 |
| Lifecycle Vocab | governance-lifecycle-vocabulary.v1.md | Approved | T1 |
| Execution Tracks | founding-week-execution-tracks.md | Approved | T1 |
| Hermes Dashboard | HERMES-constitutional-readiness-dashboard.founding-week.md | Active | T1 |
| Hermes Snapshot | HERMES-governance-status-snapshot.founding-week.v1.md | Active | T1 |

## Lifecycle Vocabulary

All artifact statuses in this directory use the canonical vocabulary defined in `governance-lifecycle-vocabulary.v1.md`:

```
Draft → Review → Approved → Ratified → Enforced → Archived
```

Non-canonical status terms (e.g. "Active", "In Progress", "Pending") are not valid for constitutional artifacts.

## Constitutional Constraints (Summary)

1. **CONST-001 is frozen.** Amendments route through GRFs only. See ADR-0001.
2. **ADR-0003 is reserved/unassigned.** No artifact may be assigned to ADR-0003.
3. **Tier 1 artifact completion precedes new ADR authoring** (except ADR-0002, which is planned).
4. **Constitutional improvements route via GRFs**, not direct edits to ratified artifacts.
5. **Track A (Governance) and Track B (Infrastructure) run in parallel** during Founding Week. See `founding-week-execution-tracks.md`.

## Related Documents

- `governance-lifecycle-vocabulary.v1.md` — Canonical status definitions
- `founding-week-execution-tracks.md` — Two-track execution model
- `HERMES-constitutional-readiness-dashboard.founding-week.md` — Live maturity view
- `executive-direction-snapshot.founding-week.md` — Executive direction for Founding Week
