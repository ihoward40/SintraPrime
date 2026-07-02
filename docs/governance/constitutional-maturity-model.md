# Constitutional Maturity Model

```yaml
Document:
  Title: Constitutional Maturity Model
  Artifact: CMM
  Version: v1.0-draft
  Status: Draft
  Owner: Governance Review Function
  Classification: Governance Companion
  Parent Document: CONST-001 Enterprise Constitution
  Related Artifacts:
    - GRF Process
    - GOV-000 Governance Traceability Matrix
```

## Purpose

Define the standard maturity ladder for constitutional and governance artifacts.

## Maturity Levels

| Level | Name | Meaning | Minimum Evidence |
| --- | --- | --- | --- |
| C0 | Unformed | Artifact is identified but not yet drafted. | Named artifact and owning function. |
| C1 | Draft | Artifact exists in draft form and expresses a single governing question. | Draft text, metadata block, initial traceability. |
| C2 | Governance Review Candidate | Artifact is structurally stable enough for formal review. | GRF intake, stable article IDs, readiness block. |
| C3 | Ratified | Artifact is approved as authoritative. | Final disposition, ratification record, effective date. |
| C4 | Implemented | Subordinate artifacts and controls reflect the ratified artifact. | Implementing artifacts or control mappings. |
| C5 | Measured | Compliance is actively measured. | Defined metrics with current evidence. |
| C6 | Governed | Rules are enforced in normal operation and exceptions are managed through governance. | Measured compliance, enforcement evidence, exception handling. |

## Advancement Rules

1. An artifact advances one level at a time.
2. No artifact may advance to C2 or higher without a primary-question boundary and traceability metadata.
3. No artifact may advance to C3 with any unresolved GRF-A finding.
4. C4 and above require evidence that subordinate manuals, playbooks, systems, or reviews are aligned.
5. C6 requires both Definition of Done and Definition of Governed to be satisfied.

## Definitions

### Definition of Done

The artifact is complete, internally consistent, reviewed, approved where required, and versioned.

### Definition of Governed

The artifact is actively enforced by the organization and the systems it governs, and compliance is measurable from authoritative evidence.

## Enforcement

Maturity claims made without the required evidence are invalid and shall be downgraded to the highest level supported by evidence.

## Compliance Metric

100% of published constitutional maturity claims are supported by the minimum evidence defined for the claimed level.
