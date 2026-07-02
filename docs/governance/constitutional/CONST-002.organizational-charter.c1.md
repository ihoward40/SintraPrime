# CONST-002 — SintraPrime Organizational Charter

**Document ID:** CONST-002  
**Version:** v0.1  
**Maturity:** C1 (Draft — Under Constitutional Review)  
**Status:** In Progress — Founding Week  
**Constitutional Baseline:** CONST-001 v1.0-r2 (Frozen)  
**Date Drafted:** 2026-07-02  
**Review Authority:** Constitutional Reviewer & Governance Auditor  
**Target Maturity:** C2 (Governance Review Candidate)  

---

> **DRAFT NOTICE**  
> This document is a C1 Draft. It has not yet passed the four-gate constitutional review.  
> It must not be treated as ratified or used as an authority source.  
> All content is subject to revision based on constitutional review disposition.

---

## Preamble

This Organizational Charter establishes the organizational structure of SintraPrime Enterprise. It defines organizational units, their constitutional authority, their accountability relationships, and the constraints governing their independence. It implements **CONST-001 Articles 2, 3, and 6** without expanding or contradicting the Enterprise Constitution.

This Charter does not contain operational procedures. Operational procedures are delegated to Operational Manuals (MAN-XXX) and Operational Playbooks (PLAY-XXX).

---

## Article 1 — Purpose and Scope

### 1.1 Purpose

This Charter creates the organizational architecture within which SintraPrime Enterprise operates. It establishes:

- The classes of organizational units that may exist within the Enterprise.
- The constitutional authority and accountability of each class.
- The independence constraints required by CONST-001 Article 3.5.
- The lifecycle events by which organizational units are created, modified, and retired.

### 1.2 Scope

This Charter governs:

- All organizational units operating under the SintraPrime Enterprise designation.
- All roles defined within those units.
- All authority delegation from this Charter to subordinate artifacts.

### 1.3 Out of Scope

This Charter does not govern:

- Operational procedures or workflows (delegated to MAN-XXX).
- Technology system architecture (governed by technical standards in CONST-004).
- Individual agent or automation behavior (governed by MAN-XXX and PLAY-XXX).
- Compensation, personnel policy, or vendor contracts.

---

## Article 2 — Organizational Unit Classes

### 2.1 Class Definitions

SintraPrime Enterprise recognizes the following organizational unit classes:

| Class | Name | Description |
|-------|------|-------------|
| **Executive** | Enterprise Executive | Holds supreme operational authority within constitutional bounds. Accountable to this Constitution. |
| **Governance** | Governance Function | Holds independent authority over constitutional compliance, governance review, and audit. Reports constitutionally upward; does not report to operations. |
| **Standards** | Standards Function | Holds independent authority over Enterprise standards, vocabularies, and classification systems. |
| **Operational** | Operational Department | Executes Enterprise mission under governed conditions. Subject to governance and standards oversight. |
| **Quality** | Quality Assurance Function | Independently audits operational outputs for conformance to governed standards. |
| **Security** | Security Function | Independently enforces security standards. Not subject to operational waiver. |

### 2.2 Class Authority

Each class exercises authority strictly within its constitutional boundaries:

- **Executive** authority is bounded by this Constitution and all Tier 1 charters.
- **Governance** authority extends to compliance review and GRF issuance across all units.
- **Standards** authority extends to classification, terminology, and schema governance.
- **Operational** authority is confined to execution within approved plans and governed pipelines.
- **Quality** authority extends to audit and non-conformance reporting; it does not extend to operational direction.
- **Security** authority extends to security control enforcement; it does not extend to operational delivery decisions.

---

## Article 3 — Organizational Hierarchy

### 3.1 Constitutional Hierarchy

Authority flows downward and accountability flows upward through the following structure:

```
Enterprise Executive (Class: Executive)
├── Governance Function (Class: Governance) [Independent]
├── Standards Function (Class: Standards) [Independent]
├── Security Function (Class: Security) [Independent]
├── Quality Assurance Function (Class: Quality) [Independent — audits Operational]
└── Operational Departments (Class: Operational)
    ├── Department A
    ├── Department B
    └── Department N
```

### 3.2 Independence Enforcement

The following independence constraints are constitutionally binding and non-waivable:

| Unit | Reports To | May Not Report To | May Not Be Audited By |
|------|------------|-------------------|----------------------|
| Governance Function | Enterprise Constitution | Operational Departments | Operational Departments |
| Standards Function | Enterprise Executive | Operational Departments | Functions it governs |
| Security Function | Enterprise Executive | Operational Departments | Functions it protects |
| Quality Assurance | Enterprise Executive | Operational Departments | Operational Departments |

### 3.3 Hierarchy Integrity

No organizational structure may be created that:

- Allows an Operational Department to direct a Governance, Standards, Security, or Quality function.
- Creates circular authority relationships.
- Removes an independent function's ability to report findings upward without operational interference.
- Merges two functions whose independence is required by CONST-001 Article 3.5.

---

## Article 4 — Accountability Framework

### 4.1 Upward Accountability

Every organizational unit is accountable upward to the unit that granted its authority. This accountability is not waivable and is measured through mandatory compliance reporting.

### 4.2 Downward Authority

Every organizational unit may delegate authority downward to subordinate units and to implementing artifacts. Delegation must be explicit, documented, and traceable to this Charter.

### 4.3 Authority Limits

An organizational unit may not:

- Grant authority it does not possess.
- Delegate authority in a way that removes constitutional constraints.
- Accept authority from a peer unit without explicit constitutional authorization.

### 4.4 Accountability Records

All organizational units must maintain current records of:

- Their constitutional authority basis.
- The artifacts implementing their responsibilities.
- Their active compliance status.

Enforcement of this requirement is delegated to **MAN-GOV-001** (Governance Operations Manual).

---

## Article 5 — Operational Department Classification

### 5.1 Department Types

Operational Departments are classified by their primary function:

| Type | Classification | Examples |
|------|---------------|---------|
| **Mission Delivery** | Core | Agent execution, intelligence operations, customer delivery |
| **Mission Support** | Support | Infrastructure, tooling, platform services |
| **Mission Enablement** | Enablement | Research, development, integration |

### 5.2 Department Requirements

Every Operational Department must:

1. Have a documented constitutional charter (delegated to MAN-XXX).
2. Operate exclusively through the governed execution pipeline.
3. Produce audit-ready records of all consequential actions.
4. Submit to Quality Assurance audits on demand.
5. Comply with all applicable Security Function controls.

### 5.3 Department Restrictions

Operational Departments must not:

- Create their own governance mechanisms parallel to the Governance Function.
- Override Standards Function classifications.
- Waive Security Function controls.
- Suppress or interfere with Quality Assurance reviews.

---

## Article 6 — Independence Constraints

### 6.1 Structural Separation

The Governance, Standards, Security, and Quality Assurance functions are constitutionally separated from Operational Departments. This separation is enforced through:

- Separate authority chains that converge only at the Enterprise Executive level.
- Prohibition on shared leadership between independent functions and the departments they govern.
- Audit rights that are non-waivable and non-deferrable by operational units.

### 6.2 Authority Contamination Prohibition

Any organizational arrangement that results in an independent function taking direction from a department it governs constitutes a constitutional defect (Class A under CONST-001 Article 6.4) and must be immediately remediated.

### 6.3 Compliance Measurement

Independence constraint compliance is measured by:

- **Structural Review:** Annual review of all reporting relationships against the independence table in Article 3.2.
- **GRF Count:** Number of independence-related GRFs filed and their resolution status.
- **Audit Interference Reports:** Number of documented instances of operational interference with audit processes.

---

## Article 7 — Organizational Lifecycle

### 7.1 Unit Creation

A new organizational unit may be created only by:

1. A formal proposal documenting the unit's class, authority basis, accountability, and independence constraints.
2. Review and approval by the Governance Function.
3. Assignment of a permanent organizational identifier.
4. Creation of the unit's implementing manual (MAN-XXX).

### 7.2 Unit Modification

An existing organizational unit may be modified (in name, scope, or authority) only by:

1. A formal modification proposal documenting the nature and constitutional basis of the change.
2. Review by the Governance Function confirming no independence constraints are violated.
3. Update to the unit's implementing manual.
4. Update to GOV-000 (Governance Traceability Matrix).

### 7.3 Unit Merger

Two organizational units may be merged only if:

1. Neither unit has independence constraints requiring separation from the other (per Article 6).
2. A merger proposal is approved by the Governance Function.
3. All affected implementing artifacts are updated.

### 7.4 Unit Suspension

An organizational unit may be suspended by the Governance Function if:

1. A Class A constitutional defect is attributed to the unit.
2. The unit refuses a lawful audit.
3. The unit's operations cannot be brought into compliance within the current governance cycle.

Suspension is a temporary operational state. Suspended units are not dissolved; they are prohibited from taking consequential actions until remediation is verified.

### 7.5 Unit Retirement

An organizational unit may be retired (dissolved) only by:

1. Confirmation that no active constitutional obligations remain with the unit.
2. Approval by the Enterprise Executive and the Governance Function.
3. Archival of all unit records in the append-only governance record store.
4. Update to GOV-000 and all affected implementing artifacts.

---

## Article 8 — Cross-Reference and Delegation

### 8.1 Constitutional Cross-References

This Charter implements the following articles of CONST-001:

| CONST-001 Article | Implementation in This Charter |
|-------------------|-------------------------------|
| Article 2 (Authority Model) | Articles 2, 3, 4 of this Charter |
| Article 3 (Governance Structure) | Articles 2, 6 of this Charter |
| Article 3.5 (Independence Requirements) | Article 6 of this Charter |
| Article 6 (Compliance and Enforcement) | Articles 4, 5, 6, 7 of this Charter |

### 8.2 Delegation to Implementing Artifacts

The following responsibilities are delegated to subordinate artifacts:

| Responsibility | Delegated To |
|---------------|--------------|
| Governance operational procedures | MAN-GOV-001 |
| Standards governance procedures | MAN-STD-001 |
| Security enforcement procedures | MAN-SEC-001 |
| Quality assurance procedures | MAN-QA-001 |
| Operational department procedures | MAN-OPS-XXX (per department) |
| Organizational lifecycle procedures | MAN-GOV-001 |

### 8.3 Cross-Reference Integrity Requirement

All cross-references in this document and in subordinate artifacts must use permanent article IDs (e.g., CONST-001 Article 3.5, CONST-002 Article 6.1). References to document titles or section names without article IDs are not constitutionally valid cross-references.

### 8.4 Traceability

Every article in this Charter is traceable in **GOV-000** (Governance Traceability Matrix) to its constitutional basis in CONST-001 and its implementing artifacts.

---

## Compliance Statement

This Organizational Charter is a C1 Draft pending constitutional review. Upon ratification at C2, it becomes a binding governance instrument for all organizational units within SintraPrime Enterprise.

**Document ID:** CONST-002  
**Version:** v0.1  
**Maturity:** C1 (Draft)  
**Constitutional Basis:** CONST-001 v1.0-r2  
**Delegating to:** MAN-GOV-001, MAN-STD-001, MAN-SEC-001, MAN-QA-001, MAN-OPS-XXX  

---

*This artifact is governed under CONST-001. Any conflict between this document and CONST-001 is resolved in favor of CONST-001.*
