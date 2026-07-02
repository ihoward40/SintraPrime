# GRF Process

```yaml
Document:
  Title: Governance Review Findings Process
  Artifact: GRF
  Version: v1.0-draft
  Status: Draft
  Owner: Governance Review Function
  Classification: Governance Companion
  Parent Document: CONST-001 Enterprise Constitution
  Related Artifacts:
    - ADR-0001 Tier 1 Constitutional Freeze
    - GOV-000 Governance Traceability Matrix
    - Constitutional Maturity Model
```

## Purpose

Define the standard review output model for constitutional and governance artifact review.

## Scope

This process governs review findings and dispositions. It does not define amendment mechanics, operating procedures, or implementation workflow.

## Review Dispositions

| Disposition | Meaning | Constitutional Effect |
| --- | --- | --- |
| Approve | Artifact is fit to advance without unresolved findings. | May advance to the next maturity gate. |
| Approve with Findings | Artifact is fit to advance with only non-blocking findings. | May advance if all open findings are within allowed impact classes. |
| Revise | Artifact requires revision before advancement. | Does not advance. |
| Reject | Artifact is not acceptable in its current form. | Returns to redraft. |
| Defer | Review decision is postponed pending external dependency or missing evidence. | Holds current maturity. |

## GRF Impact Classes

| Class | Meaning | Default Effect |
| --- | --- | --- |
| GRF-A | Blocking constitutional defect that creates ambiguity, contradiction, impurity, or invalid authority. | Blocks advancement until corrected. |
| GRF-B | Significant governance weakness that does not invalidate the artifact but must be resolved on a defined path. | Usually allows only `Approve with Findings` or `Revise`. |
| GRF-C | Moderate clarity, traceability, or completeness issue. | May remain open under `Approve with Findings`. |
| GRF-D | Minor editorial or presentation issue. | Does not block advancement. |

## Constitutional Purity Check

Every GRF review shall explicitly assess whether the artifact answers one constitutional question only. Scope leakage into procedures, runbooks, templates, or current staffing is a GRF-A or GRF-B finding depending on severity.

## Finding Record Minimum

Each finding should record:

- Artifact under review
- Reviewer
- Date
- Affected section or article ID
- Finding statement
- Impact class
- Recommended disposition effect
- Required follow-up artifact, if any

## Advancement Rule

- An artifact may not advance with any unresolved GRF-A finding.
- A constitutional artifact may advance with `Approve with Findings` only when the open findings do not alter structure, authority, or constitutional meaning.
- `Defer` preserves status and does not imply approval.

## Enforcement

Artifacts lacking a valid GRF disposition shall not be treated as ratification-ready.

## Compliance Metric

100% of constitutional artifacts at C2 or higher have a recorded GRF disposition and zero unresolved GRF-A findings.
