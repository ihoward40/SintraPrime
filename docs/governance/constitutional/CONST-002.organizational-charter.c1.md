# CONST-002 — Organizational Charter

```yaml
Artifact:        CONST-002
Title:           Organizational Charter
Maturity:        C1
Status:          Draft — Pending Review
Version:         v0.1-c1
Implements:      CONST-001
Dependencies:    CONST-001
Review-Target:   C2
Tier:            1
Drafted:         2026-07-02
Review-Round:    1
```

---

## Constitutional Notice

This is the **C1 (Draft)** of the SintraPrime Enterprise Organizational Charter.
It implements CONST-001 and defines the organizational structures through which
enterprise authority is exercised and accountability is maintained.

This artifact is a **Tier 1 constitutional document**. It contains only organizational
structure. It does not contain operational procedures, named personnel, vendor-specific
dependencies, or implementation details. All such matters are delegated to subordinate
artifacts.

This artifact is subject to formal Governance Review Board review before advancement
to C2.

---

## Metadata Header

```yaml
Document-Class:    Constitutional
Document-Type:     Organizational Charter
Artifact-ID:       CONST-002
Parent-Artifact:   CONST-001
Governing-Body:    Governance Review Board
Change-Control:    GRF Process (CONST-001, Article 6)
Stability-Class:   Tier 1 (Constitutional)
Person-Independent:  true
Vendor-Independent:  true
Platform-Independent: true
Operational-Content:  false
```

---

## Article 2.1 — Enterprise Organizational Model

### Purpose

Define the structural model of the SintraPrime Enterprise organization, establishing
the categories of organizational units and their relationship to constitutional
authority.

### Constitutional Rule (Binding)

The SintraPrime Enterprise is organized into a tiered hierarchy of organizational
units. The enterprise organizational model consists of three structural layers:

**Layer 1 — Enterprise:** The supreme organizational layer. All authority originates
at this layer and is delegated downward. The Enterprise layer is governed by the
full Tier 1 constitutional suite.

**Layer 2 — Business Unit:** The primary organizational subdivision of the enterprise.
Business units are bounded by function domain and constitute the principal units of
strategic accountability.

**Layer 3 — Department:** The operational subdivision within a business unit.
Departments are bounded by functional specialty and constitute the principal units
of operational accountability.

No organizational unit may operate outside this three-layer model. Ad hoc or
informal organizational units without a defined constitutional home are unauthorized.

### Delegation

Business unit structure is defined in Article 2.2. Department classes are defined
in Article 2.3. Authority classes operating within this model are defined in
Article 2.4. Operational organizational details are delegated to MAN-001
(Operations Manual).

### Enforcement

Any function operating outside the three-layer organizational model is an unauthorized
function. The Governance Review Board identifies and resolves unauthorized functions
through the GRF process.

### Compliance Metric

100% of enterprise functions must be mapped to a defined organizational unit within
the three-layer model. Traceability is maintained in GOV-000.

### Commentary (Non-Binding)

The three-layer model provides the minimum organizational structure necessary for
constitutional governance. Additional internal layers within departments are
operational matters and do not require constitutional definition.

---

## Article 2.2 — Business Unit Model

### Purpose

Define the business unit classes of SintraPrime Enterprise and the boundaries within
which each class operates.

### Constitutional Rule (Binding)

SintraPrime Enterprise recognizes the following classes of business units:

**BU-CLASS-1: Operations Business Units**
Business units responsible for delivery of enterprise products, services, and
operational functions. Operations business units are subject to quality, governance,
security, and audit oversight from independence-bearing business units.

**BU-CLASS-2: Enabling Business Units**
Business units responsible for foundational capabilities that support operations
business units. Enabling business units (such as technology, infrastructure, and
data functions) serve the enterprise operationally but are subject to the same
independence oversight as operations business units.

**BU-CLASS-3: Independence-Bearing Business Units**
Business units whose constitutional mandate requires structural independence from
the business units they govern. The following functions, when established as business
units, must be independence-bearing:
- Governance
- Quality Assurance
- Standards
- Security
- Internal Audit

Independence-bearing business units may not be subordinate to, merged with, or
co-governed by any operations or enabling business unit.

### Delegation

The creation, modification, and dissolution of business units are delegated to
the Department Lifecycle process defined in Article 2.8. Specific business unit
configurations are operational matters delegated to MAN-001.

### Enforcement

An independence-bearing business unit that is subordinated to an operations or
enabling business unit is a constitutional violation. The Governance Review Board
shall issue a blocking GRF upon discovery.

### Compliance Metric

All independence-bearing business units must have documented independence boundaries.
Zero co-governance relationships between independence-bearing and non-independence
business units are permitted.

### Commentary (Non-Binding)

Business unit class is a constitutional designation, not an operational preference.
The class a business unit occupies determines which constitutional constraints apply
to it, regardless of size, budget, or operational priority.

---

## Article 2.3 — Department Classes

### Purpose

Define the department classes that exist within business units and the structural
constraints that govern each class.

### Constitutional Rule (Binding)

Every department within SintraPrime Enterprise belongs to one of the following
constitutional department classes:

**DC-1: Functional Department**
A department organized around a professional discipline or functional specialty.
A functional department delivers a defined set of capabilities to its business unit
or to other departments under a service model. Functional departments are the
standard organizational unit for operations and enabling business units.

**DC-2: Program Department**
A department organized around a bounded program of work with a defined lifecycle
start and end. Program departments are temporary by constitution. Upon program
completion, the department transitions through the lifecycle events defined in
Article 2.8.

**DC-3: Governance Department**
A department whose primary function is governance, audit, standards, or oversight.
Governance departments must operate under the independence requirements of Article 2.7.
A governance department within an operations or enabling business unit must maintain
structural independence within that business unit.

**DC-4: Center of Excellence**
A department that provides authoritative expertise, standards development support,
and cross-business-unit advisory services in a defined domain. Centers of excellence
do not have operational line authority over other departments.

No department may hold multiple class designations simultaneously. Hybrid department
roles require constitutional review before establishment.

### Delegation

Department class assignment is an organizational decision delegated to the business
unit authority and recorded in the Department Lifecycle Register (operational artifact
under MAN-001). Department class boundary disputes are resolved by the Governance
Review Board.

### Enforcement

A department operating outside its class definition is a scope violation. Scope
violations are documented as GRFs and resolved through the change control process
defined in CONST-001, Article 6.

### Compliance Metric

100% of departments must have a recorded class designation. Zero multi-class
departments are permitted without Governance Review Board approval.

### Commentary (Non-Binding)

Department class definitions exist to prevent organizational structures from becoming
ambiguous as the enterprise grows. A clear class designation tells every stakeholder
what to expect from a department and what constitutional constraints apply to it.

---

## Article 2.4 — Authority Classes

### Purpose

Define the authority classes that govern how organizational units exercise power
within the enterprise and prevent unauthorized authority concentration.

### Constitutional Rule (Binding)

SintraPrime Enterprise recognizes four constitutional authority classes:

**AC-1: Executive Authority**
The highest class of organizational authority. Executive authority includes the power
to establish enterprise strategy, ratify constitutional instruments, and direct
business unit mandates. Executive authority operates at the Enterprise layer.

**AC-2: Operational Authority**
Authority to direct the operations, resources, and outputs of a business unit or
department within the boundaries of delegated executive authority. Operational
authority does not extend to constitutional matters.

**AC-3: Functional Authority**
Authority to establish standards, methods, and practices within a defined functional
domain, applicable to departments across business units. Functional authority does
not include line authority over personnel or resources in other departments.

**AC-4: Advisory Authority**
The authority to provide guidance, recommendations, and expertise without the power
to compel compliance. Advisory authority never overrides operational or executive
authority.

No organizational unit may exercise an authority class not granted to it through
the delegation chain from CONST-001, Article 5.

### Delegation

The mapping of organizational units to authority classes is an operational matter
delegated to MAN-001. The Governance Review Board holds the authority to adjudicate
authority class disputes.

### Enforcement

An organizational unit exercising an authority class not granted to it is engaged
in unauthorized action. The Governance Review Board documents unauthorized authority
as a blocking GRF.

### Compliance Metric

100% of organizational units must have a recorded authority class assignment.
Zero unauthorized authority exercises are the constitutional standard.

### Commentary (Non-Binding)

Authority class clarity prevents the organizational ambiguity that leads to
governance drift. When authority class is clear, disputes about who decides what
can be resolved structurally rather than through political negotiation.

---

## Article 2.5 — Authority Flow (Downward)

### Purpose

Establish the constitutional rules governing how authority moves downward through
the organizational structure and prevent unauthorized authority grants.

### Constitutional Rule (Binding)

Authority within SintraPrime Enterprise flows downward through the following
constitutional chain:

```
Enterprise (CONST-001, Article 5)
        ↓
Business Unit (Authority class per Art. 2.4)
        ↓
Department (Authority class per Art. 2.4)
        ↓
Function / Role (Authority class per Art. 2.4)
```

The following rules govern downward authority flow:

**Rule AF-1:** A delegating unit may not grant more authority than it holds.
**Rule AF-2:** Every delegation must be explicit. Authority is never implied or assumed.
**Rule AF-3:** Delegations must be documented in a governance instrument (operational
or constitutional as appropriate to the authority class).
**Rule AF-4:** A delegation may be revoked by the delegating unit. Revocation must
be documented.
**Rule AF-5:** No unit may self-delegate. Authority grants require action by a
higher-tier authority.

### Delegation

The operational processes for authority delegation and revocation are delegated to
MAN-001. The formal delegation register is maintained as an operational artifact.

### Enforcement

Undocumented authority exercises are unauthorized actions. The Governance Review
Board investigates and resolves unauthorized authority claims through the GRF process.

### Compliance Metric

All active authority delegations must be documented. Zero undocumented authority
delegations are the constitutional standard. GOV-000 tracks authority delegation
completeness.

### Commentary (Non-Binding)

Downward authority flow is not bureaucratic formality — it is the mechanism that
makes organizational accountability traceable. Without documented delegation,
accountability gaps are structurally inevitable.

---

## Article 2.6 — Responsibility Flow (Upward)

### Purpose

Establish the constitutional rules governing how responsibility flows upward through
the organizational structure and prevent accountability gaps.

### Constitutional Rule (Binding)

Responsibility within SintraPrime Enterprise flows upward through the following
constitutional chain:

```
Function / Role
        ↑
Department
        ↑
Business Unit
        ↑
Enterprise
```

The following rules govern upward responsibility flow:

**Rule RF-1:** A unit that delegates authority retains responsibility for the
outcomes of that delegation. Delegation reduces operational burden; it does not
eliminate responsibility.
**Rule RF-2:** Every organizational unit is accountable to the unit that granted
its authority.
**Rule RF-3:** Responsibility may not be abdicated. A unit that ceases to exercise
a responsibility must transfer it through a formal lifecycle event (Article 2.8),
not by omission.
**Rule RF-4:** Accountability is explicit. Every enterprise outcome must have an
identifiable responsible party at each organizational layer.
**Rule RF-5:** Responsibility reporting flows upward through governance reporting
channels, not through informal communication.

### Delegation

Reporting structures and accountability relationships are operational matters
delegated to MAN-001. Formal accountability assignments are maintained in operational
registers.

### Enforcement

An accountability gap (outcome without an identifiable responsible party) is a
constitutional defect. The Governance Review Board documents accountability gaps
as GRFs and resolves them through the change control process.

### Compliance Metric

100% of enterprise outcomes must have an identifiable responsible party at each
organizational layer. GOV-000 tracks accountability completeness. Zero accountability
gaps are the constitutional standard.

### Commentary (Non-Binding)

Responsibility flows upward not as punishment but as the natural consequence of
authority. Wherever authority is exercised, the results of that exercise belong to
the authority holder. This principle makes governance self-reinforcing: authority
motivates results, and results demand accountability.

---

## Article 2.7 — Independence Requirements

### Purpose

Define the constitutional independence requirements for governance, quality, standards,
security, and audit functions to prevent structural conflicts of interest.

### Constitutional Rule (Binding)

The following independence requirements are constitutionally mandatory for any
organizational unit performing governance, quality assurance, standards, security,
or internal audit functions:

**IR-1: Structural Independence**
Independence-bearing functions must be structurally separated from the operational
units they govern. Structural independence means the independence-bearing unit does
not report through the chain of command of any unit it governs.

**IR-2: Authority Independence**
Independence-bearing functions must have the authority to conduct reviews, issue
findings, and record non-compliance without requiring approval from the units they
govern.

**IR-3: Reporting Independence**
Independence-bearing functions report their findings to executive authority or to
a designated governance body, not to the operational units they govern.

**IR-4: Resource Independence**
The resource allocation for independence-bearing functions may not be controlled
solely by the operational units they govern. Resource decisions affecting independence-
bearing functions must involve executive authority or the Governance Review Board.

**IR-5: Finding Independence**
Findings issued by independence-bearing functions may not be suppressed, altered,
or delayed by the units they govern. All findings are recorded in the GRF register
and are visible to executive authority.

### Delegation

The operational implementation of independence structures is delegated to MAN-001.
CONST-003 defines the governance body structures that enforce these requirements.

### Enforcement

Any structural arrangement that violates these independence requirements is a
constitutional violation. The Governance Review Board issues a blocking GRF
immediately upon discovery and escalates to executive authority.

### Compliance Metric

All independence-bearing organizational units must have documented independence
boundaries. Independence compliance is assessed at each constitutional audit cycle.
Zero independence violations are the constitutional standard.

### Commentary (Non-Binding)

Independence is not a preference — it is the constitutional guarantee that oversight
remains credible. An audit function that reports to the unit it audits is not an
audit function. An independence structure that exists only on paper provides no
governance value.

---

## Article 2.8 — Department Lifecycle

### Purpose

Define the lifecycle events through which departments are created, modified, and
dissolved, ensuring that all organizational change is governed and traceable.

### Constitutional Rule (Binding)

Every department within SintraPrime Enterprise must pass through formally recognized
lifecycle events. The following lifecycle events are constitutionally defined:

**LE-1: Establishment**
A department is established through a formal organizational decision at the business
unit authority level or above. Establishment requires: name, class designation
(Article 2.3), authority class (Article 2.4), parent business unit, mandate
definition, and independence determination (Article 2.7 if applicable).

**LE-2: Modification**
A department's class designation, authority class, mandate, or independence
determination may be modified only through a formal change event. Modifications must
be documented and must not reduce independence requirements below the constitutional
minimum.

**LE-3: Merge**
Two departments may be merged only if the resulting merged department satisfies the
independence requirements of both predecessor departments. A merge that eliminates
independence boundaries is a constitutional violation.

**LE-4: Split**
A department may be split into two or more departments. Each resulting department
must independently satisfy the class and independence requirements of its designation.

**LE-5: Suspension**
A department may be suspended (operations paused) while retaining its organizational
identity. Suspension does not eliminate the department's accountability obligations
during the suspension period.

**LE-6: Retirement**
A department is retired when its mandate is permanently concluded. Retirement requires
documentation of accountability transfer for all outstanding obligations and a final
records disposition.

No department may be informally dissolved or abandoned. All lifecycle events are
recorded in the operational Department Lifecycle Register (MAN-001).

### Delegation

The operational procedures for each lifecycle event are delegated to MAN-001.
The Governance Review Board reviews lifecycle events that affect independence-bearing
departments.

### Enforcement

An unrecorded lifecycle event is a governance gap. Any department that operates
without a documented establishment event is an unauthorized organizational unit.
The Governance Review Board documents lifecycle gaps as GRFs.

### Compliance Metric

100% of active departments must have documented establishment records. All lifecycle
events occurring within the audit period must be recorded. GOV-000 tracks lifecycle
event completeness.

### Commentary (Non-Binding)

Department lifecycle governance prevents the accumulation of "shadow" organizational
units — functions that operate without constitutional standing. Shadow units cannot
be held accountable, cannot be governed, and cannot be safely merged or retired.
Lifecycle governance keeps the organizational model clean.

---

## Article 2.9 — Organizational Invariants

### Purpose

Define the invariant properties of the organizational model — properties that must
remain true at all times regardless of growth, restructuring, or operational change.

### Constitutional Rule (Binding)

The following organizational invariants are constitutionally mandatory. They must be
satisfied at all times. Any restructuring that would violate an invariant requires
prior Governance Review Board approval and constitutional amendment.

**OI-1: Single Organizational Home**
Every enterprise function must have exactly one organizational home within the
three-layer model. No function may be simultaneously claimed by two organizational
units at the same layer.

**OI-2: Non-Overlapping Mandates**
No two organizational units may have identical or substantially overlapping mandates
without explicit constitutional authorization and a documented coordination agreement.

**OI-3: Persistent Independence Boundaries**
Independence requirements established under Article 2.7 cannot be reduced or
eliminated through organizational restructuring without a constitutional amendment.

**OI-4: Constitutional Coverage**
The organizational model must cover 100% of enterprise functions. No enterprise
function may exist outside the organizational model.

**OI-5: Downward Delegation Completeness**
Every organizational unit must have a complete and documented authority chain back
to this Constitution. No authority chain may have gaps.

**OI-6: Upward Accountability Completeness**
Every enterprise outcome must have a complete and documented accountability chain
up to the Enterprise layer. No accountability chain may have gaps.

**OI-7: Lifecycle Traceability**
Every organizational unit in existence must have a traceable establishment event.
Every organizational unit that is no longer active must have a traceable retirement
event.

### Delegation

Invariant compliance monitoring is delegated to the Governance Review Board and
is operational matter supported by MAN-001 registers and GOV-000 traceability.

### Enforcement

Any invariant violation discovered during audit or review is a constitutional defect.
Invariant violations are blocking GRFs. Operations that would cause an invariant
violation may not proceed without Board approval and constitutional amendment.

### Compliance Metric

All seven organizational invariants must be satisfied at all times. Compliance is
assessed at each constitutional audit cycle. Zero uncorrected invariant violations
are the constitutional standard.

### Commentary (Non-Binding)

Invariants are the properties that keep the organizational model coherent as it grows.
They are not aspirations — they are structural guarantees. When an invariant is about
to be violated, that is a signal that the organizational model needs constitutional
attention, not operational workaround.

---

## Article 2.10 — Cross-Reference Map

### Purpose

Define the authoritative cross-references between this Charter and the constitutional
and operational artifacts that implement, extend, or depend on its provisions.

### Constitutional Rule (Binding)

All cross-references in Tier 1 artifacts must use the permanent artifact identifier
(e.g., CONST-001, CONST-002) and the article identifier (e.g., Art. 2.1). No
cross-reference may use document titles, version numbers, or document names as
primary references, as these are subject to change.

### Cross-Reference Index

| CONST-002 Article | Constitutional Source | Implemented By            | Governed By       |
|-------------------|-----------------------|---------------------------|-------------------|
| 2.1 Org Model     | CONST-001, Art. 3     | CONST-002, MAN-001        | CONST-003         |
| 2.2 BU Model      | CONST-001, Art. 5     | MAN-001                   | CONST-003         |
| 2.3 Dept Classes  | CONST-001, Art. 3     | MAN-001                   | CONST-003         |
| 2.4 Auth Classes  | CONST-001, Art. 5     | MAN-001                   | CONST-003         |
| 2.5 Auth Flow     | CONST-001, Art. 5     | MAN-001                   | CONST-003         |
| 2.6 Resp Flow     | CONST-001, Art. 5     | MAN-001                   | CONST-003         |
| 2.7 Independence  | CONST-001, Art. 4 P-3 | CONST-003, MAN-001        | CONST-003         |
| 2.8 Lifecycle     | CONST-001, Art. 6     | MAN-001                   | CONST-003         |
| 2.9 Invariants    | CONST-001, Art. 4     | GOV-000, MAN-001          | CONST-003         |
| 2.10 X-Ref Map    | CONST-001, Art. 3     | GOV-000                   | CONST-003         |

### Delegation

The maintenance of cross-references and traceability chains is delegated to GOV-000
(Governance Traceability Matrix). GOV-000 is the authoritative source for cross-
reference verification.

### Enforcement

A broken or missing cross-reference in a Tier 1 artifact is a non-blocking governance
defect. Broken cross-references in GOV-000 are blocking defects. All cross-reference
defects are documented as GRFs.

### Compliance Metric

100% of CONST-002 articles must appear in the GOV-000 traceability matrix with
complete implementing and governing artifact references. Zero broken cross-references
in GOV-000 are permitted.

### Commentary (Non-Binding)

Cross-references using permanent identifiers ensure that the governance framework
remains navigable even as artifact titles and document names evolve. Permanent
identifiers are the governance equivalent of stable API contracts.

---

## Constitutional Compliance Statement

This document, CONST-002 Organizational Charter (C1 Draft), complies with the
following constitutional requirements from CONST-001:

| CONST-001 Requirement               | CONST-002 Compliance                             |
|-------------------------------------|--------------------------------------------------|
| Art. 1: Constitutional Supremacy    | CONST-001 cited as authority on all articles     |
| Art. 2: Enterprise Identity         | All structures are person/vendor/platform-free   |
| Art. 3: Constitutional Hierarchy    | Tier 1 classification maintained throughout      |
| Art. 4: Governance Principles       | All six principles reflected in article design   |
| Art. 5: Authority and Accountability| Art. 2.5 and 2.6 implement authority/resp. flow  |
| Art. 6: Change Control              | GRF process cited for amendments                 |

This document contains:
- ✅ Only organizational structure (no operational procedures)
- ✅ No named-person dependencies
- ✅ No vendor or platform dependencies
- ✅ No implementation details
- ✅ Delegation to subordinate artifacts (MAN-001, CONST-003) throughout
- ✅ Enforcement and compliance metrics in every article
- ✅ Mandatory constitutional pattern applied to every article

---

*End of CONST-002 — Organizational Charter (C1 Draft, v0.1-c1)*
