```yaml
Artifact: CONST-002
Identifier: CONST-002
Version: v1.0-c1-draft
Status: Draft
Maturity: C1
Review Target: C2
Implements:
  - CONST-001
Dependencies:
  - CONST-001 (frozen at C2 per ADR-0001)
Protocol:
  - Constitutional Purity Rule (single-question scope)
  - ADR-0001 freeze discipline
  - Improvement routing via GRFs
```

# CONST-002 Organizational Charter (C1 Draft)

## Scope Question
This artifact answers one question only: **How is the enterprise organized?**

## Part I — Enterprise Organizational Model

### Article CONST-002-I-1 — Organizational Structure Layers
**Purpose**  
Define the enduring structural layers of the enterprise.

**Constitutional Rule (Binding)**  
The enterprise is structurally organized into: Enterprise, Business Units, Departments, Functions, Teams, and Agents.

**Delegation**  
Layer-specific charters, responsibilities, and operating details are delegated to manuals and playbooks.

**Enforcement**  
No subordinate artifact may introduce an unauthorized structural layer.

**Compliance Metric**  
100% of active organizational entities map to one of the six constitutional layers.

**Commentary (Non-Binding)**  
Layer definitions are structural anchors and are independent of personnel or platform choices.

**Traceability**  
Implements: CONST-001-II-1  
Implemented By: MAN-001, MAN-003  
Verified By: GOV-000

### Article CONST-002-I-2 — Business Unit Relationship Model
**Purpose**  
Define business unit position within enterprise governance.

**Constitutional Rule (Binding)**  
Each Business Unit operates under enterprise constitutional authority and cannot supersede constitutional controls.

**Delegation**  
Business Unit operating boundaries and reporting cadences are delegated to MAN-001.

**Enforcement**  
Governance review denies any Business Unit charter that conflicts with constitutional authority.

**Compliance Metric**  
100% of Business Unit charters reference constitutional authority inheritance.

**Commentary (Non-Binding)**  
Business Unit diversity is allowed as long as constitutional constraints remain intact.

**Traceability**  
Implements: CONST-001-II-2  
Implemented By: MAN-001, MAN-004  
Verified By: GOV-000

## Part II — Authority Classes

### Article CONST-002-II-1 — Authority Class Ladder
**Purpose**  
Declare non-overlapping authority classes across organizational levels.

**Constitutional Rule (Binding)**  
Authority classes are: Enterprise Authority, Business Unit Authority, Department Authority, Function Authority, Operational Authority, and Agent Authority.

**Delegation**  
Detailed authority allocations and approval matrices are delegated to CONST-003 and MAN-003.

**Enforcement**  
No artifact may assign authority outside the declared class ladder.

**Compliance Metric**  
100% of authority grants are classified to exactly one authority class.

**Commentary (Non-Binding)**  
Class stability protects governance as organizational implementations evolve.

**Traceability**  
Implements: CONST-001-II-3  
Implemented By: CONST-003, MAN-003  
Verified By: GOV-000

### Article CONST-002-II-2 — Authority and Responsibility Directionality
**Purpose**  
Define directional governance flow.

**Constitutional Rule (Binding)**  
Authority flows downward from Enterprise to Agent; accountability and responsibility flow upward from Agent to Enterprise.

**Delegation**  
Escalation and accountability evidence formats are delegated to PLAY-001 and PLAY-005.

**Enforcement**  
Governance audits reject models that invert constitutional flow.

**Compliance Metric**  
100% of organizational mappings show downward authority and upward accountability links.

**Commentary (Non-Binding)**  
Directionality preserves control while maintaining transparent responsibility paths.

**Traceability**  
Implements: CONST-001-II-4  
Implemented By: MAN-003, PLAY-005  
Verified By: GOV-000

## Part III — Department Classes

### Article CONST-002-III-1 — Department Class Taxonomy
**Purpose**  
Define constitutionally recognized department classes.

**Constitutional Rule (Binding)**  
Department classes are category-based and include: Executive, Governance, Intelligence, Engineering, Operations, Production, Revenue, Customer, Assurance, Standards, and Infrastructure.

**Delegation**  
Specific department instances and charters are delegated to MAN-001.

**Enforcement**  
Departments outside constitutional classes require governance disposition and, if needed, constitutional amendment path.

**Compliance Metric**  
100% of departments map to one recognized class.

**Commentary (Non-Binding)**  
Category-based classes allow organizational growth without constitutional churn.

**Traceability**  
Implements: CONST-001-II-5  
Implemented By: MAN-001  
Verified By: GOV-000

## Part IV — Independence Requirements

### Article CONST-002-IV-1 — Separation of Duties Constraints
**Purpose**  
Protect review integrity through structural independence.

**Constitutional Rule (Binding)**  
The following structural separations are required: QA ≠ Standards, Security ≠ Engineering, Audit ≠ Operations, Governance ≠ Revenue.

**Delegation**  
Conflict detection controls and reporting evidence are delegated to CONST-004 and MAN-004.

**Enforcement**  
Any structure violating an independence constraint is non-compliant until remediated or exceptioned through approved register process.

**Compliance Metric**  
0 unresolved independence conflicts in active reporting structures.

**Commentary (Non-Binding)**  
Separation constraints are constitutional safeguards against self-review bias.

**Traceability**  
Implements: CONST-001-II-6  
Implemented By: CONST-004, MAN-004  
Verified By: GOV-000

## Part V — Department Lifecycle

### Article CONST-002-V-1 — Constitutional Lifecycle Events
**Purpose**  
Define structural lifecycle events for departments.

**Constitutional Rule (Binding)**  
Departments may be Created, Modified, Merged, Split, Suspended, or Retired as constitutional events subject to governance control.

**Delegation**  
Event request formats, approvals, and records are delegated to MAN-001 and PLAY-001.

**Enforcement**  
Lifecycle changes without constitutional event records are invalid.

**Compliance Metric**  
100% of department lifecycle changes have corresponding governance records.

**Commentary (Non-Binding)**  
Lifecycle formalization prevents undocumented structural drift.

**Traceability**  
Implements: CONST-001-II-7  
Implemented By: MAN-001, PLAY-001  
Verified By: GOV-000

## Part VI — Organizational Invariants

### Article CONST-002-VI-1 — Structural Invariants
**Purpose**  
Declare enduring organizational truths.

**Constitutional Rule (Binding)**  
Each department must have one accountable owner, a published charter, measurable KPIs, mission-cycle participation, and governance-framework reporting.

**Delegation**  
Measurement definitions and reporting mechanics are delegated to MAN-001, MAN-004, and PLAY-001.

**Enforcement**  
Departments failing invariants are flagged as non-compliant.

**Compliance Metric**  
100% of active departments satisfy all five invariants.

**Commentary (Non-Binding)**  
Invariants stabilize organizational quality independent of execution tooling.

**Traceability**  
Implements: CONST-001-II-8  
Implemented By: MAN-001, MAN-004, PLAY-001  
Verified By: GOV-000

## Part VII — Cross-Reference Map

### Article CONST-002-VII-1 — Delegation Boundary Integrity
**Purpose**  
Protect constitutional scope boundaries across artifact tiers.

**Constitutional Rule (Binding)**  
CONST-002 defines organizational structure only and must delegate operational details to subordinate artifacts.

**Delegation**  
Operational execution is delegated to MAN and PLAY artifacts.

**Enforcement**  
Reviews classify scope leakage as Governance Review Findings.

**Compliance Metric**  
0 unresolved scope-leak findings at or above GRF-B severity before C2 advancement.

**Commentary (Non-Binding)**  
This rule enforces constitutional purity and prevents artifact overlap.

**Traceability**  
Implements: CONST-001-II-9  
Implemented By: MAN-001, PLAY-001, PLAY-005  
Verified By: GOV-000

## Part VIII — Constitutional Compliance Statement

### Article CONST-002-VIII-1 — Freeze and Improvement Routing Compliance
**Purpose**  
Bind this charter to constitutional implementation protocol.

**Constitutional Rule (Binding)**  
CONST-001 remains frozen at C2 per ADR-0001; constitutional improvements discovered during CONST-002 review are routed through the GRF process targeting CONST-001 v1.0-r3.

**Delegation**  
Finding capture and disposition workflows are delegated to the GRF register and governance review board process artifacts.

**Enforcement**  
Direct structural edits to CONST-001 outside defect correction are non-compliant.

**Compliance Metric**  
100% of constitutional improvement proposals are recorded as GRFs with disposition.

**Commentary (Non-Binding)**  
Freeze discipline supports stable review cycles while preserving controlled improvement.

**Traceability**  
Implements: CONST-001-II-10  
Implemented By: ADR-0001, GRF Register  
Verified By: GOV-000
