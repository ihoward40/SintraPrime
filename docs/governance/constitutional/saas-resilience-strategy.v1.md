# SaaS Resilience Strategy (v1)

## Principle

No constitutional or governance capability may depend on third-party SaaS availability.

## Core layer (must operate without SaaS)

The core layer must remain operational without external SaaS dependencies:

- Governance
- Mission tracking
- Evidence ledger
- Audit trail
- Local knowledge
- Executive reporting

## Integration layer (replaceable adapters)

The integration layer is replaceable and non-authoritative:

- Make.com
- Notion
- Slack
- GitHub Actions
- Google Workspace

## Boundary rule

- Core capabilities remain available during integration outages.
- Integration services are adapters, not constitutional controls.

