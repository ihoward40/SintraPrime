# Cases

This directory contains case-specific litigation and recovery management artifacts.

Each subdirectory corresponds to a single case and uses the canonical `CaseTemplate` architecture.  
See `templates/CaseTemplate/` for the reusable template definition.

## Active Cases

| Case ID | Name | Priority | Status |
|---------|------|----------|--------|
| [CASE-666234B709](./CASE-666234B709/README.md) | Halsted / LVNV / Resurgent — Deficiency Notice Defense | High | Active |

## Architecture

Each case directory contains:
- `evidence-registry.yaml` — immutable source artifact registry
- `fact-ledger.yaml` — factual assertions with confidence levels
- `legal-analysis-ledger.yaml` — legal conclusions with confidence levels
- `authority-ledger.yaml` — legal authority index
- `evidence-dependency-graph.yaml` — machine-readable evidence gap tracking
- `chronology.yaml` — case timeline
- `readiness.yaml` — dual readiness scores
- `packets/` — immutable versioned case packets

## Governance

> ⚠️ **Approval Gate:** No external action (submission, filing, contact, service) may be taken from any artifact in this directory without explicit human approval.
