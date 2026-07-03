# Governance Lifecycle Vocabulary — v1

Document-ID: GOVERNANCE-LIFECYCLE-VOCAB-V1  
Version: 1.0  
Status: Approved  
Owner: Constitutional Reviewer  
Effective: Founding Week  
Scope: All Tier 1 constitutional artifacts and governance status fields

---

## Purpose

This document defines the canonical lifecycle vocabulary for all governance artifacts maintained under `docs/governance/constitutional/`. Only the terms defined here are valid in status fields, dashboards, and governance reports. Non-canonical terms must not appear in constitutional artifact metadata or status records.

---

## Canonical Lifecycle Stages

```
Draft → Review → Approved → Ratified → Enforced → Archived
```

| Stage | Symbol | Definition | Entry Condition | Exit Condition |
|-------|--------|------------|-----------------|----------------|
| **Draft** | `D` | Artifact is being authored; incomplete and not yet submitted for review. | Author initiates work. | Author submits for review. |
| **Review** | `R` | Artifact is under formal governance review by the Constitutional Reviewer. GRFs may be raised. | Completeness check passes. | Disposition issued (Approved, Revise, Reject, Defer). |
| **Approved** | `A` | Artifact has passed governance review; may proceed to ratification process. GRF-A findings must be zero. | Reviewer issues Approved disposition. | Ratification vote/record completed. |
| **Ratified** | `RT` | Artifact is formally adopted; it carries constitutional authority and is binding. | Approved + ratification record created. | Supersession, amendment, or archival decision. |
| **Enforced** | `E` | Artifact is active and enforcement mechanisms are operational (tooling, automation, compliance checks). | Ratified + enforcement infrastructure confirmed. | Enforcement is suspended or artifact is archived. |
| **Archived** | `AR` | Artifact is retired; superseded or withdrawn. No longer authoritative. | Formal archival decision by Executive Sponsor. | — (terminal state) |

---

## Prohibited Terms

The following terms **must not** appear as canonical status values in constitutional artifact metadata or governance reporting:

| Prohibited Term | Reason | Use Instead |
|-----------------|--------|-------------|
| Active | Ambiguous; conflates operational state with lifecycle stage. | Enforced |
| In Progress | Informal; not a governance gate. | Draft |
| Pending | Non-specific; conveys no governance disposition. | Review |
| Open | Issue-tracker language; not a lifecycle stage. | Draft or Review |
| Complete | Outcome language; not a lifecycle stage. | Ratified or Enforced |
| Closed | Issue-tracker language. | Archived |
| Done | Informal. | Ratified |
| N/A | Not a lifecycle stage. | Omit field or annotate explicitly. |

---

## ADR Status Extensions

Architectural Decision Records (ADRs) use the following extended vocabulary, consistent with the base lifecycle:

| ADR Status | Maps To | Definition |
|------------|---------|------------|
| Proposed | Draft | ADR is authored and pending review. |
| Accepted | Approved | ADR has passed review and is adopted. |
| Reserved | — | Slot is held for future assignment; artifact does not yet exist. |
| Superseded | Archived | ADR is replaced by a newer decision record. |
| Deprecated | Archived | ADR is withdrawn without a direct replacement. |

---

## GRF Status Vocabulary

Governance Request Forms (GRFs) use the following status terms:

| GRF Status | Definition |
|------------|------------|
| Open | GRF is raised and unresolved. |
| In Review | GRF is being evaluated by the Constitutional Reviewer. |
| Accepted | GRF finding is valid; corrective action required. |
| Resolved | Corrective action is complete; GRF is closed. |
| Rejected | GRF finding is invalid or not applicable. |
| Deferred | GRF is valid but resolution is scheduled for a future cycle. |

---

## Usage Rules

1. Every constitutional artifact must declare its `Status` using exactly one canonical lifecycle stage.
2. Status fields in Hermes dashboards and governance status snapshots must use canonical terms.
3. GRF status fields use the GRF vocabulary above, not the base lifecycle vocabulary.
4. ADR status fields use the ADR extension vocabulary.
5. Lifecycle transitions must be recorded in the artifact version history or associated governance log.
6. No artifact may skip a stage (e.g., Draft → Ratified is invalid without passing through Review and Approved).

---

## Amendment

Changes to this vocabulary require a GRF-B or higher finding and approval by the Constitutional Reviewer before any status field is updated across existing artifacts.

---

*This document is governance documentation only. It does not grant runtime authority or trigger system behavior.*
