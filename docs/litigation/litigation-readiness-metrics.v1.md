# Litigation Readiness Metrics (v1)

**Governance artifact — process documentation only**  
**Scores indicate workflow/evidence completeness — NOT legal outcome predictions.**  
**These metrics do not constitute legal advice and must not be interpreted as probability of success in litigation.**

---

## Overview

Litigation readiness is split into two independent metrics. This separation prevents confusion between the completeness of the record (a workflow property) and the quality of evidentiary support (a substantive assessment).

Neither metric predicts a legal outcome.

---

## Metric 1: Repository Completeness

**What it measures:** Whether the required workflow components, documents, and structural elements are present and properly organized.

This is a checklist-based score. A high score means the workflow is well-executed. It does not mean the underlying claims have strong evidentiary support.

### Scoring Categories

| Category | Weight | Description |
|----------|--------|-------------|
| Case directory structure | 10% | All required folders exist (01_Intake through Audit/) |
| Evidence index | 15% | Evidence items registered with required metadata |
| Chain-of-custody metadata | 15% | All evidence items have provenance fields populated |
| Claim ledger | 15% | Claims are stated and mapped to evidence IDs |
| Evidence request register | 10% | Outstanding requests are logged |
| Chronology | 10% | Timeline is populated with evidence-sourced events |
| Correspondence log | 10% | Inbound and outbound correspondence is recorded |
| Deadlines tracker | 10% | Known deadlines are logged |
| Audit trail | 5% | Audit/ folder contains generation receipts |

**Maximum score: 100%**

### Interpretation

| Range | Label | Meaning |
|-------|-------|---------|
| 90–100% | Complete | Workflow is fully implemented |
| 70–89% | Near Complete | Minor gaps in process documentation |
| 50–69% | Partial | Significant workflow gaps; may hinder packet generation |
| < 50% | Incomplete | Foundational workflow elements are missing |

---

## Metric 2: Evidentiary Strength

**What it measures:** The quality and completeness of evidentiary support for the claims being asserted in the case.

This is a substantive assessment. A high score means the claims are well-supported by documented, authenticated evidence. It does not guarantee a legal outcome.

### Scoring Categories

| Category | Weight | Description |
|----------|--------|-------------|
| Claims with `supported` status | 30% | % of claims fully supported by authenticated evidence |
| Claims with `partially_supported` status | 15% | Partial credit for partially supported claims |
| Evidence authenticity | 20% | % of evidence items with `authenticity_status: verified` |
| Evidence verification | 15% | % of evidence items with `verification_status: verified` |
| Missing evidence resolved | 10% | % of missing evidence gaps that have been filled |
| Source diversity | 10% | Evidence draws from multiple independent sources |

**Maximum score: 100%**

### Interpretation

| Range | Label | Meaning |
|-------|-------|---------|
| 85–100% | Strong | Claims are well-supported and well-authenticated |
| 65–84% | Moderate | Material gaps or authentication gaps remain |
| 45–64% | Developing | Significant evidentiary work remains |
| < 45% | Insufficient | Claims lack adequate evidentiary support |

**Important:** Even a score of 100% does not predict legal success. External factors (jurisdiction, opposing arguments, judicial discretion) are outside the scope of these metrics.

---

## Combined Dashboard Example

```yaml
case_id: CASE-666234B709
as_of: "2026-07-03"

repository_completeness:
  score: 78
  label: Near Complete
  gaps:
    - Evidence request register has 3 outstanding items
    - Deadlines tracker missing 2 known response deadlines

evidentiary_strength:
  score: 62
  label: Developing
  gaps:
    - CLAIM-003 is unsupported (no collection agency validation record)
    - 4 evidence items have authenticity_status: pending
    - Missing: original credit agreement from LVNV

note: >
  These scores reflect workflow completeness and evidence quality only.
  They are not legal outcome predictions and do not constitute legal advice.
```

---

## Schema

See `notion/schemas/Litigation_Readiness.schema.json` for the machine-readable schema for this artifact.

---

## Governance Note

These metrics supersede any prior single-dimension "litigation readiness score" that may have been referenced in prior session artifacts. The prior single score conflated workflow completeness with evidentiary strength. The two-metric model separates these concerns.
