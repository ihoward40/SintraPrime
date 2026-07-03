# CONST-002 — Review Sequence

```
Artifact-ID:    CONST-002-REVIEW-SEQ
Version:        1.0
Status:         Active
Mission:        MISSION-0001
Owner:          ChatGPT (Strategic Reviewer)
Reviewer:       Isiah Howard
Effective-Date: 2026-07-03
Next-Review:    Upon CONST-002 ratification
Implements:     ADR-0002 — Constitutional Review Protocol
References:     governance/adr/ADR-0002-*, governance/GOVERNANCE-VOCABULARY.md
```

---

## Purpose

This document locks the exact review sequence for CONST-002 (Organizational Charter) before drafting begins. Every step is mandatory. No shortcuts. No steps may be reordered. The sequence was established by executive direction on 2026-07-03.

CONST-002 is treated as a constitutional review — not a brainstorming exercise.

---

## Review Sequence (Locked)

```
Step 1:  Draft
         ↓
Step 2:  Completeness Review
         (Are all required sections present?)
         ↓
Step 3:  Constitutional Conformance
         (Does it comply with CONST-001 and all ratified constitutional artifacts?)
         ↓
Step 4:  Structural Integrity
         (Is the document internally consistent? No contradictions.)
         ↓
Step 5:  Traceability Review
         (Can every claim be traced to a source artifact or decision?)
         ↓
Step 6:  Governability Review
         (Can Hermes enforce this? Are terms measurable and operationalizable?)
         ↓
Step 7:  Disposition
         (Assign: APPROVE / APPROVE WITH FINDINGS / RETURN FOR REVISION / REJECT)
         ↓
Step 8:  GRF Classification
         (If APPROVE WITH FINDINGS: open GRF for each finding, assign severity)
         ↓
Step 9:  Revision (if required)
         (Address all Blocking GRFs before advancing)
         ↓
Step 10: C2 Review Candidate
         (Document is ready for Founder ratification when all Blocking GRFs resolved)
```

---

## Step Definitions

| Step | Owner | Input | Output | Pass Criteria |
|------|-------|-------|--------|---------------|
| 1 Draft | Viktor | CONST-001, org context | CONST-002 v0.1 | Complete draft covering all required sections |
| 2 Completeness | ChatGPT | Draft | Completeness checklist | All required sections present and non-empty |
| 3 Constitutional Conformance | ChatGPT | Draft + CONST-001 | Conformance report | No constitutional violations found |
| 4 Structural Integrity | ChatGPT | Draft | Integrity report | No internal contradictions or undefined terms |
| 5 Traceability | Twin | Draft + source artifacts | Traceability matrix | All claims have source references |
| 6 Governability | Hermes | Draft | Governability assessment | All terms are enforceable by Hermes |
| 7 Disposition | ChatGPT | All review outputs | Formal disposition | Disposition assigned and documented |
| 8 GRF Classification | ChatGPT | Disposition | GRF register entries | All findings classified and assigned |
| 9 Revision | Viktor | GRF register | Updated draft | All Blocking GRFs resolved |
| 10 C2 Candidate | ChatGPT | Resolved draft | C2 readiness confirmation | Zero open Blocking GRFs |

---

## Required Sections for CONST-002 (Organizational Charter)

A CONST-002 draft must contain at minimum:

1. **Organizational Identity** — Name, mission, legal structure
2. **Governing Authority** — Who holds executive authority and under what conditions
3. **Agent Roster** — Named agents, their roles, and their authority boundaries
4. **Organizational Hierarchy** — Reporting relationships and decision escalation paths
5. **Mission Authority** — How missions are authorized, owned, and closed
6. **Department Structure** — Departments, their functions, and their governance relationships
7. **Constitutional Supremacy Clause** — CONST-001 governs; CONST-002 may not contradict it
8. **Amendment Procedure** — How CONST-002 may be amended

---

## GRF Severity Levels (per ADR-0002 v1.1.0)

| Severity | Definition | Blocks C2? |
|----------|-----------|-----------|
| Blocking | Must be resolved before advancement | Yes |
| Non-Blocking | Must be resolved before Ratification | No |
| Informational | Documented, no resolution required | No |

---

## Enforcement Note

This review sequence is enforced by ADR-0002. No additional governance models or templates will be introduced during this review unless a genuine constitutional or traceability defect is identified. Any exception requires a GRF and Isiah's explicit approval.

---

*Governed by MISSION-0001 and subject to the Founding Week documentation freeze.*
