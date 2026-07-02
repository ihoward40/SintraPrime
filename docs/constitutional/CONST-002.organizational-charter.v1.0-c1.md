# CONST-002 — Organizational Charter

```yaml
Artifact:       CONST-002
Title:          Organizational Charter
Version:        v1.0-c1
Maturity:       C1
Status:         Submitted for First Review
Effective:      Pending Ratification
Implements:     CONST-001
Dependencies:   CONST-001 v1.0-r2 (Frozen)
Implemented By: MAN-001, MAN-003
Verified By:    GOV-000
Review Target:  C2
```

---

## Preamble

This Charter defines the organizational structure of SintraPrime Enterprise.
It establishes how the enterprise is organized, how authority and responsibility flow
through that structure, what categories of departments exist, which functions must remain
organizationally independent from one another, how departments move through their lifecycle,
and what structural truths every department must satisfy regardless of its category.

This Charter is a structural instrument. It does not govern operational procedures,
technical implementation, agent behavior, or governance processes.
Those domains are addressed by subordinate artifacts that implement this Charter.

Where this Charter is silent, subordinate artifacts may not infer permission.
Where this Charter conflicts with CONST-001, CONST-001 prevails.

---

## Part I — Enterprise Organizational Model

### Article I-1 (Binding)

SintraPrime Enterprise is organized as a hierarchical structure of organizational units.
The recognized unit types, from broadest to most specific, are:

1. **Enterprise** — The whole of SintraPrime, the supreme organizational boundary.
2. **Business Unit** — A major strategic division of the Enterprise with its own mission scope.
3. **Department** — A named organizational function within a Business Unit.
4. **Function** — A defined area of responsibility within a Department.
5. **Team** — An operational group executing within a Function.
6. **Agent** — An individual contributor (human or AI) assigned to a Team.

**Purpose:** Provide an unambiguous, exhaustive enumeration of organizational unit types
that subordinate artifacts may reference without expansion.

**Delegation:** Department definitions and assignments are delegated to MAN-001.
Team and Agent assignments are delegated to MAN-003.

**Enforcement:** Any organizational unit that cannot be classified within this hierarchy is
constitutionally unrecognized and may not exercise authority until properly classified.

**Compliance Metric:** 100% of recognized organizational units classified within this hierarchy.
Zero unclassified units at any governance review milestone.

**Commentary (Non-Binding):** The hierarchy is defined by relationship, not by headcount.
A single person may occupy multiple roles across different units. The structure governs
authority and accountability flow, not staffing ratios.

---

### Article I-2 (Binding)

The hierarchy is a containment hierarchy. Each unit type is contained within the unit type
above it. No unit may belong to more than one parent unit of the same type simultaneously.

**Purpose:** Prevent organizational ambiguity that would undermine authority traceability.

**Enforcement:** Any unit with multiple parent units of the same type is flagged as a
constitutional defect by GOV-000 and must be resolved before the next governance review.

**Compliance Metric:** Zero units with ambiguous parent relationships.

---

### Article I-3 (Binding)

The organizational hierarchy is defined by relationships and roles, not by the identity of
the people, AI models, or platforms that currently occupy those roles.

**Purpose:** Ensure organizational durability across personnel, technology, and vendor changes.

**Compliance Metric:** Zero organizational definitions that reference a specific person,
AI model, or vendor by name.

---

## Part II — Authority Classes

### Article II-1 (Binding)

Authority within SintraPrime Enterprise is classified as follows, in descending order:

| Class | Name | Scope |
|---|---|---|
| A1 | Constitutional Authority | Governance of the enterprise itself |
| A2 | Executive Authority | Strategic direction of a Business Unit |
| A3 | Departmental Authority | Direction of a Department within its charter |
| A4 | Functional Authority | Direction of a Function within its department |
| A5 | Operational Authority | Execution within a Team's assigned scope |
| A6 | Agent Authority | Task execution within an assigned instruction set |

**Purpose:** Provide a complete, ordered enumeration of authority classes that subordinate
artifacts may reference when defining roles, responsibilities, and escalation paths.

**Delegation:** Role-to-class assignments are delegated to MAN-001.
Agent authority boundaries are delegated to agent governance specifications.

**Enforcement:** Any action taken by a unit that exceeds its authority class is constitutionally
unauthorized. GOV-000 identifies and escalates such incidents.

**Compliance Metric:** 100% of authority grants traceable to a documented authority class.
Zero unauthorized authority escalations per Mission Cycle.

**Commentary (Non-Binding):** Authority classes are not titles or ranks. They describe
the scope of legitimate decision-making, not status or seniority.

---

### Article II-2 (Binding)

Authority flows downward through the hierarchy. A unit may delegate authority to a
lower-class unit but may not grant authority that exceeds its own class.

**Purpose:** Prevent unauthorized authority inflation.

**Enforcement:** Any delegation that grants authority exceeding the delegator's class is
constitutionally void.

**Compliance Metric:** Zero authority delegations that exceed the delegator's class.

---

### Article II-3 (Binding)

Responsibility flows upward through the hierarchy. A unit that delegates authority to a
lower-class unit retains accountability for the outcomes of that delegation.

**Purpose:** Ensure accountability accompanies every grant of authority, as established
in CONST-001, Article II-2.

**Enforcement:** Accountability cannot be delegated away. If a lower-class unit fails in its
delegated scope, accountability escalates to the delegating unit.

**Compliance Metric:** 100% of accountability chains documented in MAN-001. Zero instances
where accountability cannot be traced to an A1 or A2 authority.

---

### Article II-4 (Binding)

No agent (A6) may act outside the instruction set assigned by its Team (A5) and Function (A4).
Agents may not self-authorize, self-escalate, or act on inferred intent.

**Purpose:** Preserve the integrity of the authority chain at its most granular level.

**Enforcement:** Agent actions outside assigned scope are constitutionally unauthorized.
They are recorded as governance incidents and escalate to A4 authority.

**Compliance Metric:** Zero self-authorized agent actions per Mission Cycle.

---

## Part III — Department Categories

### Article III-1 (Binding)

Every Department within SintraPrime Enterprise belongs to exactly one of the following
recognized department categories:

| Category | Description |
|---|---|
| Executive | Sets strategic direction and exercises A2 authority within a Business Unit |
| Governance | Maintains the constitutional and policy framework |
| Intelligence | Gathers, processes, and synthesizes information for decision support |
| Engineering | Designs, builds, and maintains technical systems |
| Operations | Executes day-to-day processes and workflows |
| Production | Delivers outputs (content, products, services) aligned to the enterprise mission |
| Revenue | Generates and manages commercial value streams |
| Customer | Manages relationships with external stakeholders and customers |
| Assurance | Verifies quality, compliance, and correctness of outputs and processes |
| Standards | Defines and maintains enterprise-wide standards and specifications |
| Infrastructure | Provides foundational technical and operational platforms |

**Purpose:** Allow the organizational structure to evolve — adding or removing departments
— without requiring constitutional amendments, as long as each new department fits within
a recognized category.

**Delegation:** Assignment of departments to categories is delegated to MAN-001.

**Enforcement:** Any department that cannot be classified within a recognized category is
constitutionally unrecognized and may not be activated until properly classified.

**Compliance Metric:** 100% of active departments assigned to a recognized category.

**Commentary (Non-Binding):** These categories are intentionally broad. A single category
may contain many departments, or none at any given time. The categories define the space
of permissible organizational functions, not the current organizational chart.

---

### Article III-2 (Binding)

Department categories may not be added, removed, or redefined without a constitutional
amendment to this Article.

**Purpose:** Maintain category stability as the reference frame for organizational evolution.

**Enforcement:** Category changes without a constitutional amendment are constitutionally void.

---

## Part IV — Independence Requirements

### Article IV-1 (Binding)

The following independence constraints are constitutionally required. Functions in constrained
relationships may not be organizationally subordinate to one another.

| Constrained Pair | Basis |
|---|---|
| Assurance ↔ Engineering | Assurance must independently verify Engineering outputs |
| Assurance ↔ Operations | Assurance must independently verify Operations outputs |
| Assurance ↔ Production | Assurance must independently verify Production outputs |
| Standards ↔ Engineering | Standards must define requirements independently of implementation |
| Governance ↔ Executive | Governance must maintain constitutional integrity independent of strategy |
| Governance ↔ Revenue | Governance must remain independent of commercial pressures |
| Intelligence ↔ Revenue | Intelligence outputs must not be shaped by commercial interests |

**Purpose:** Protect the integrity of oversight, standards, and intelligence functions from
organizational conflicts of interest.

**Delegation:** The organizational chart implementation of these constraints is delegated to MAN-001.
Audit of compliance with these constraints is delegated to the Governance department.

**Enforcement:** Any organizational structure that places a constrained pair in a superior-subordinate
relationship is constitutionally void and must be corrected within one governance review cycle.

**Compliance Metric:** Zero independence constraint violations in the active organizational model
at any governance review milestone.

**Commentary (Non-Binding):** Independence does not require physical or structural isolation.
It requires that the reporting chain of a constrained function does not pass through another
constrained function's authority before reaching an independent A2 or A1 authority.

---

### Article IV-2 (Binding)

The Governance department is the sole authority responsible for auditing compliance with
independence requirements. It may not delegate this audit responsibility to any department
that is itself subject to an independence constraint with the Governance department.

**Purpose:** Prevent the governance audit function from auditing itself.

**Compliance Metric:** 100% of independence audits performed by the Governance department.

---

## Part V — Department Lifecycle

### Article V-1 (Binding)

Every Department passes through a defined lifecycle. The recognized lifecycle states are:

| State | Description |
|---|---|
| Created | Department is constitutionally recognized and authorized to operate |
| Modified | Department scope, category, or authority class has been amended |
| Merged | Department has been combined with one or more other departments |
| Split | Department has been divided into two or more successor departments |
| Suspended | Department is temporarily inactive; its charter and records are preserved |
| Retired | Department is permanently dissolved; its records are archived |

**Purpose:** Make every organizational change a recognized, tracked constitutional event.

**Delegation:** Lifecycle event authorization is delegated to MAN-001.
Lifecycle event records are maintained by the Governance department.

**Enforcement:** Any department operating outside a recognized lifecycle state is constitutionally
unrecognized. GOV-000 identifies such anomalies and escalates them to A3 authority.

**Compliance Metric:** 100% of departments in a recognized lifecycle state at all times.
100% of lifecycle transitions accompanied by a documented governance record.

---

### Article V-2 (Binding)

A department in the Suspended state retains its charter, its authority class assignment, and
its independence constraints. It may not execute operations but its governance obligations
(record-keeping, compliance reporting) remain active.

**Purpose:** Preserve governance continuity during temporary organizational changes.

---

### Article V-3 (Binding)

A department in the Retired state is permanently dissolved. Its records are archived under
the Governance department. Its name may not be reused within the same Business Unit without
a constitutional exception.

**Purpose:** Prevent naming collisions and preserve historical governance integrity.

**Compliance Metric:** Zero name reuse violations within the same Business Unit after retirement.

---

## Part VI — Organizational Invariants

### Article VI-1 (Binding)

Every Department in a Created or Modified lifecycle state must satisfy all of the following
invariants simultaneously. These invariants are structural truths, not aspirational goals.

**Invariant VI-1-a — Single Accountable Owner**
Every department has exactly one accountable owner at all times. The owner holds A3 authority
within the department's scope. Ownership may not be shared, split, or left vacant.

**Invariant VI-1-b — Published Charter**
Every department has a published charter that defines its mission, scope, authority class,
category, independence constraints, lifecycle state, KPIs, and governance obligations.
The charter is a governed artifact subject to change control.

**Invariant VI-1-c — Measurable KPIs**
Every department has at least one published, measurable Key Performance Indicator (KPI).
KPIs must be quantifiable, time-bound, and verifiable by the Governance department.
Narrative descriptions of success are not compliant KPIs.

**Invariant VI-1-d — Mission Cycle Participation**
Every department participates in the enterprise Mission Cycle rhythm.
Participation includes contributing to planning, executing against commitments, and reporting
outcomes through the governance framework.

**Invariant VI-1-e — Governance Reporting**
Every department reports through the governance framework as defined in CONST-003.
No department is exempt from governance reporting obligations.

**Purpose:** Define a minimum structural standard that every department must meet to be
constitutionally recognized as active.

**Enforcement:** Any department that fails any invariant is flagged by GOV-000 as a compliance
gap. Gaps must be resolved within one governance review cycle or the department is automatically
transitioned to Suspended state.

**Compliance Metric:** 100% of active departments satisfying all five invariants at every
governance review milestone.

---

### Article VI-2 (Binding)

Organizational invariants may not be waived for any department, regardless of its category,
lifecycle state (except Retired), or authority class.

**Purpose:** Prevent governance exemptions from creating structural dark spots.

**Compliance Metric:** Zero invariant waivers in force at any governance review milestone.

---

## Part VII — Constitutional Companion Relationship

### Article VII-1 (Binding)

GOV-000 (Governance Verification Bridge) serves as the verification layer for this Charter.
GOV-000 maps every requirement in this Charter to its implementing artifact, enforcement
mechanism, and compliance metric, creating a complete traceability chain.

**Purpose:** Ensure constitutional intent is not lost between CONST-002 and its implementing artifacts.

**Delegation:** GOV-000 maintenance is delegated to the Governance department.

**Enforcement:** Any CONST-002 requirement without a complete GOV-000 traceability entry is
flagged as an open governance gap.

**Compliance Metric:** 100% GOV-000 coverage of CONST-002 requirements before C2 ratification.

---

*End of CONST-002 v1.0-c1*
