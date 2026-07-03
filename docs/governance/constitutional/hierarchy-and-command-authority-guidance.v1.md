# Governance Hierarchy and Command Authority Guidance (v1)

## Canonical Hierarchy

`CONST → GOV → ADR → MAN → PLAY → COMMAND AUTHORITY → Implementation/Evidence`

## Placement Rule

- Command Authority belongs to the implementation layer.
- Command Authority executes delegated controls from higher governance artifacts.
- Command Authority does **not** create, supersede, or amend constitutional authority.

## Interpretation Guardrail

When conflicts are observed:

1. Resolve against higher-order governance artifacts (`CONST`, then `GOV`, then `ADR`, then `MAN`, then `PLAY`).
2. Treat Command Authority instructions as operational execution only.
3. Route governance corrections through GRFs and approved governance lifecycle steps.
