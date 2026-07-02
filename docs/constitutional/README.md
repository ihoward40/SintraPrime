# Constitutional Governance Artifacts

This directory contains the Tier 1 constitutional artifacts for SintraPrime Enterprise.

## Artifact Index

| Artifact | Title | Maturity | Status |
|---|---|---|---|
| [CONST-001](./CONST-001.enterprise-constitution.v1.0-r2.md) | Enterprise Constitution | C2 | Frozen — Governance Review Candidate |
| [CONST-002](./CONST-002.organizational-charter.v1.0-c1.md) | Organizational Charter | C1 | In Review |
| CONST-003 | Governance Charter | C0 | Planned |
| CONST-004 | Standards Charter | C0 | Planned |
| [GOV-000](./GOV-000.governance-verification.v0.1-c0.md) | Governance Verification Bridge | C0 | Initialized |

## Supporting Records

| Record | Title | Status |
|---|---|---|
| [ADR-0001](./ADR-0001.constitutional-freeze.md) | Tier 1 Constitutional Freeze | Accepted |
| [GRF Register — CONST-002](./GRF-register.CONST-002.r1.md) | Governance Review Findings Register | Open — Round 1 |
| [Review Package — CONST-002](./CONST-002.review-package.md) | CONST-002 C1 Review Submission | Submitted |
| [Constitutional Readiness Dashboard](./constitutional-readiness-dashboard.md) | Founding Week Dashboard | Live |

## Maturity Scale

| Code | Meaning |
|---|---|
| C0 | Planned / Initialized |
| C1 | Draft — ready for first review |
| C2 | Governance Review Candidate — frozen for ratification |
| C3 | Ratified |

## Constitutional Hierarchy

```
CONST-001 Enterprise Constitution  (supreme)
    ├── CONST-002 Organizational Charter
    ├── CONST-003 Governance Charter
    └── CONST-004 Standards Charter
              ↓ (all implemented by)
         MAN-001, MAN-003, PLAY-001, ...
              ↓ (all verified by)
             GOV-000
```

## Governance Principle

> No constitutional document shall solve a problem that belongs to another constitutional document.

Each artifact has a defined scope. Scope violations are logged as Governance Review Findings and resolved before ratification.
