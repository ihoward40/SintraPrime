---
Document:
  Title: SintraPrime Organizational Charter
  Artifact: CONST-002
  Version: C1 (Draft)
  Status: Draft – Under Constitutional Review
  Owner: Founder & CEO (Isiah)
  Reviewer: Constitutional Reviewer & Governance Auditor
  Effective Date: TBD (upon Approved v1.0)
  Next Review: TBD (+12 months from Effective Date)
  Classification: Internal – Constitutional
  Parent: CONST-001 Enterprise Constitution
  Supersedes: None
  Related Artifacts:
    - CONST-001 Enterprise Constitution
    - CONST-003 Governance Charter (pending)
    - CONST-004 Standards Charter (pending)
    - Artifact #5 Department Handbook (pending)
    - Artifact #6 Agent Handbook (pending)
    - Artifact #7 RACI Matrix (pending)
    - Artifact #8 Approval Matrix (pending)
    - GOV-000 Governance Scaffold
    - ADR-0001 Constitutional Artifact Freeze
    - GRF-CONST-002-round-1-register (see review/)
---

# CONST-002 — SintraPrime Organizational Charter

---

## Preamble

This Charter establishes the constitutional organizational model for SintraPrime Enterprise. It defines the enterprise organizational structure, business unit model, department classes, authority classes, authority flow, responsibility flow, independence requirements, department lifecycle, and organizational invariants. This Charter operates under the authority of CONST-001 Enterprise Constitution and delegates all operational implementation to subordinate governance manuals.

**Structural Constraints (per GOV-000 constitutional document requirements):**
- No operational procedures are contained herein
- No current-person dependencies (roles, not individuals)
- No AI-platform-specific dependencies
- No implementation details
- All implementation delegated to subordinate artifacts

---

## Article 1 — Enterprise Organizational Model

**Purpose:** Establish the constitutional model governing how SintraPrime Enterprise organizes its authority, accountability, and operational structure across all business units and departments.

**Constitutional Rule (Binding):** SintraPrime Enterprise shall maintain a governed organizational model comprising three constitutional layers: the Enterprise Layer (supreme authority and constitutional governance), the Business Unit Layer (domain-specific execution under enterprise authority), and the Department Layer (functional execution within business unit authority). Every governed entity in the enterprise shall be classifiable within this model. No entity may operate under enterprise authority without organizational classification.

**Delegation:** The specific composition of business units, their charters, and their organizational registries are defined and maintained in Artifact #5 Department Handbook, Artifact #7 RACI Matrix, and CONST-001 Appendix C. Operational organizational charts are maintained by the COO function as subordinate artifacts.

**Enforcement:** Any business unit, department, or operational entity that cannot be traced to this three-layer constitutional model is operating outside the governed organizational structure. Such entities must be classified and registered before conducting governed operations.

**Compliance Metric:** 100% of active business units and departments registered in the organizational registry with traceable classification to the Enterprise, Business Unit, or Department Layer.

**Commentary (Non-Binding):** The three-layer model is intentionally simple. Complexity is absorbed by the Department Layer through defined department classes (see Article 3). The enterprise does not need additional layers as it scales — it needs more departments within the defined structure.

---

## Article 2 — Business Unit Model

**Purpose:** Establish the constitutional definition, recognition criteria, and governance requirements for SintraPrime Enterprise business units.

**Constitutional Rule (Binding):** A Business Unit is a constitutionally recognized organizational entity that:
1. Operates under a defined mandate aligned with the enterprise mission (CONST-001, Book I, Article 1)
2. Is registered in the Organizational Registry (CONST-001 Appendix C)
3. Has defined authority within the Business Unit Layer
4. Is governed by a subordinate Business Unit Charter or equivalent governing artifact
5. Reports through the defined authority chain (see Article 5 — Authority Flow)
6. Maintains a compliance posture measurable against constitutional standards

No entity may use the title "Business Unit" or claim business unit authority without constitutional recognition. Business units are not merely operational groupings — they are constitutionally recognized entities with defined governance obligations.

**Delegation:** Business unit charters, mandate definitions, and KPI frameworks are defined in subordinate governance artifacts. The organizational registry is maintained by the COO function. New business unit recognition requires constitutional amendment to CONST-001 Appendix C.

**Enforcement:** Unregistered entities claiming business unit authority are in constitutional violation. Registration requires Founder & CEO authorization.

**Compliance Metric:** All active business units carry approved charters or equivalent governing artifacts. Organizational registry is current and reviewed at each GRF review cycle.

**Commentary (Non-Binding):** SintraPrime Technologies, IKE SOLUTIONS, and LegalOS are the initially recognized business units. Their mandates are complementary and non-overlapping by design. Future business units must demonstrate mandate distinctiveness before constitutional recognition.

---

## Article 3 — Department Classes

**Purpose:** Establish the constitutional taxonomy of department types recognized within SintraPrime Enterprise.

**Constitutional Rule (Binding):** All departments within SintraPrime Enterprise shall be classified into one of the following constitutionally recognized department classes. Department class determines authority scope, reporting structure, independence requirements, and lifecycle governance.

| Class | Name | Constitutional Role |
|---|---|---|
| **Class A** | Executive Department | Holds enterprise-level authority; directly accountable to the Founder & CEO; cross-business-unit scope |
| **Class B** | Business Unit Core Department | Holds business-unit-level authority; accountable to business unit leadership; scope bounded to one business unit |
| **Class C** | Shared Services Department | Provides services across multiple business units; governed by service-level authorities; independence required from any single business unit |
| **Class D** | Control Department | Exercises oversight, audit, or compliance function; must maintain independence from operations being controlled; reports outside normal operational chain |
| **Class E** | Project Department | Temporary; created for a defined mission or initiative with a defined lifecycle and exit criteria; must be dissolved or converted upon lifecycle completion |

**No department may claim a class higher than its authority warrants.** Class D departments (Control) must operate under independence rules defined in Article 7.

**Delegation:** Department-specific mandates, reporting lines, and operational scope are defined in Artifact #5 Department Handbook. Department classification decisions require Founder & CEO authorization.

**Enforcement:** Departments operating outside their classified authority scope are in constitutional violation. GRF reviews assess department class compliance.

**Compliance Metric:** 100% of active departments carry an approved class classification. No unclassified departments in operation.

**Commentary (Non-Binding):** Class E departments (Project) are the mechanism for time-boxed work. They prevent permanent organizational sprawl from initiative-driven expansion. Every Project Department must have a defined exit criterion — without one, it cannot be constitutionally chartered.

---

## Article 4 — Authority Classes

**Purpose:** Establish the constitutional taxonomy of authority types that govern action, decision, and accountability within SintraPrime Enterprise.

**Constitutional Rule (Binding):** All authority exercised within SintraPrime Enterprise shall be classifiable into one of the following constitutionally recognized authority classes. Authority class determines what actions may be taken, what decisions may be made, and what accountability applies.

| Authority Class | Name | Scope | Source |
|---|---|---|---|
| **A-1** | Constitutional Authority | Supreme; governs all other authority | Founder & CEO; this Constitution |
| **A-2** | Executive Authority | Enterprise-wide; delegated from A-1 | Founder & CEO; Executive Council |
| **A-3** | Business Unit Authority | Business unit-wide; delegated from A-2 | Business Unit Leadership |
| **A-4** | Department Authority | Department-scoped; delegated from A-3 | Department Head |
| **A-5** | Operational Authority | Task/role-scoped; delegated from A-4 | Operational role assignment |
| **A-6** | Agent Authority | Bounded; explicitly delegated; revocable | Subordinate governance artifacts |
| **A-7** | Review Authority | Independent oversight; cannot exceed scope of review mandate | Constitutional Reviewer; Auditor |

**No authority class may be exercised without a traceable delegation from a higher authority class, except A-1 (which is self-founding under this Constitution) and A-7 (which is derived from constitutional mandate, not operational chain).**

**Delegation:** Authority class assignments for specific roles and positions are defined in Artifact #8 Approval Matrix and Artifact #7 RACI Matrix. Agent authority constraints are defined in Artifact #6 Agent Handbook.

**Enforcement:** Claims of authority without traceable delegation are void. The COO function maintains the authority delegation registry. Review Authority (A-7) is protected from operational interference.

**Compliance Metric:** All authority exercises traceable to a classified authority class with documented delegation chain. Authority delegation registry current and auditable.

**Commentary (Non-Binding):** A-6 (Agent Authority) is intentionally the lowest operational authority class. Agents may be highly capable, but capability does not confer authority. A-7 (Review Authority) is not in the operational chain — this is intentional, as reviewers and auditors must be independent of what they review.

---

## Article 5 — Authority Flow (Downward)

**Purpose:** Establish the constitutional model for how authority propagates downward through the organizational structure.

**Constitutional Rule (Binding):** Authority flows downward from Constitutional Authority (A-1) through the organizational layers according to the following constitutional rules:

1. **Delegation is required at each level.** Authority does not automatically flow to subordinate levels. Each delegation must be explicit, documented, and revocable.
2. **Delegated authority cannot exceed the delegating authority.** A Department Head (A-4) cannot delegate more authority than they hold.
3. **Delegation does not transfer accountability.** The delegating level remains accountable for the exercise of delegated authority.
4. **Agent authority (A-6) requires explicit enablement.** Agents do not receive authority through organizational hierarchy — they receive it only through explicit agent authority grants defined in subordinate artifacts.
5. **Review Authority (A-7) is independent.** It does not flow through the operational authority chain and cannot be restricted by operational authority holders.
6. **Authority gaps are resolved upward.** When a decision falls outside the documented authority of a level, it escalates to the next higher level.

**Authority Flow Diagram (Constitutional):**

```
A-1: Constitutional Authority (Founder & CEO)
    ↓ [explicit delegation]
A-2: Executive Authority (Executive Council; COO)
    ↓ [explicit delegation]
A-3: Business Unit Authority (Business Unit Leadership)
    ↓ [explicit delegation]
A-4: Department Authority (Department Heads)
    ↓ [explicit delegation]
A-5: Operational Authority (Roles and Positions)
    ↓ [explicit agent authority grant — separate from operational chain]
A-6: Agent Authority (Agents — bounded, revocable)

A-7: Review Authority (Independent — not in operational chain)
```

**Delegation:** Specific delegation chains and authority boundaries for each organizational role are defined in Artifact #8 Approval Matrix and Artifact #7 RACI Matrix.

**Enforcement:** Exercises of authority that skip delegation levels or exceed delegated bounds are constitutional violations. The COO function monitors delegation chain integrity.

**Compliance Metric:** All active authority delegations documented in the authority delegation registry. No exercises of authority without traceable delegation chain.

**Commentary (Non-Binding):** "Authority gaps resolve upward" is one of the most operationally important rules in this article. It prevents decision paralysis and prevents individuals from making decisions they don't have authority to make. When in doubt, escalate.

---

## Article 6 — Responsibility Flow (Upward)

**Purpose:** Establish the constitutional model for how accountability and responsibility propagate upward through the organizational structure.

**Constitutional Rule (Binding):** Responsibility flows upward through the organizational layers according to the following constitutional rules:

1. **Accountability cannot be delegated away.** When authority is delegated downward, the delegating level retains accountability for the outcomes of that delegation.
2. **Failures at any level are accountable at all levels above.** A Department Head is accountable for department failures. A Business Unit Leader is accountable for business unit failures. The Founder & CEO is accountable for enterprise failures.
3. **Reporting is a constitutional obligation.** Each organizational level must report its performance, compliance posture, and material issues to the level above on the cadence defined by subordinate governance artifacts.
4. **Agents report to their governing department.** Agent performance, compliance, and exceptions are reported through the department that governs them.
5. **Review and Audit findings report independently.** Findings from A-7 authority holders report through the review/audit chain, not through the operational reporting chain.

**Responsibility Flow Diagram (Constitutional):**

```
A-6: Agent performance/exceptions → Department (A-4)
A-5: Operational results/exceptions → Department Head (A-4)
A-4: Department results/exceptions → Business Unit Leadership (A-3)
A-3: Business Unit results/exceptions → Executive Council/COO (A-2)
A-2: Enterprise results/exceptions → Founder & CEO (A-1)
A-7: Findings → Constitutional Reviewer; Founder & CEO (independent path)
```

**Delegation:** Reporting cadences, formats, and required contents are defined in Artifact #12 Weekly Business Review, Artifact #13 Daily Executive Brief, and the Hermes Company Pulse reporting framework.

**Enforcement:** Failure to report as required is a governance violation. The COO function tracks reporting compliance.

**Compliance Metric:** Reporting compliance rate: 100% of required reports submitted per defined cadence. Material exceptions reported within defined escalation SLAs.

**Commentary (Non-Binding):** The responsibility flow model is the organizational immune system. When something goes wrong, it surfaces upward through accountability, not just downward through investigation. This requires that each level actively monitors what it is accountable for — not just what it directly controls.

---

## Article 7 — Independence Requirements

**Purpose:** Establish the constitutional independence requirements for Control and Review functions.

**Constitutional Rule (Binding):** Organizational independence is constitutionally required for the following functions:

1. **Class D Departments (Control):** Control departments must maintain structural independence from the operational units they oversee. Control department heads report outside the operational chain of the units being controlled, at minimum to A-2 (Executive Authority) or A-1 (Constitutional Authority).

2. **Review Authority (A-7) Holders:** Reviewers and auditors must be independent of the artifacts, systems, or operations they review. An individual may not review their own work under any authority class.

3. **Constitutional Review:** Constitutional reviewers must be independent of the constitutional drafting function. The reviewer role may not be held by the same individual who drafted the artifact under review, except under documented waiver with Founder & CEO approval and notation in the GRF register.

4. **Agent Control Functions:** Control functions over agents (monitoring, compliance checking, log review) must be independent from agent deployment and management functions.

**Independence Failure Rule:** Any finding of structural independence failure in a Control or Review function is automatically classified as a Critical finding under GRF-PROC and requires immediate escalation to A-1.

**Delegation:** Specific independence structures for defined control functions are established in Artifact #5 Department Handbook, Artifact #7 RACI Matrix, and Artifact #9 Security Policy.

**Enforcement:** Independence failures are Critical GRF findings. The Constitutional Reviewer & Governance Auditor monitors for independence violations. Independence waivers must be explicitly approved and documented.

**Compliance Metric:** Zero unwaived independence failures in Control and Review functions. All waivers documented and approved by Founder & CEO.

**Commentary (Non-Binding):** Independence is not a preference — it is a constitutional constraint. A control function that is not independent is structurally compromised regardless of the intentions of the individuals involved. The enterprise cannot verify its own governance without independent review.

---

## Article 8 — Department Lifecycle

**Purpose:** Establish the constitutional lifecycle model for departments within SintraPrime Enterprise.

**Constitutional Rule (Binding):** Every department within SintraPrime Enterprise shall progress through the following constitutionally defined lifecycle stages. No department may conduct governed operations without completing the Formation stage.

| Stage | Name | Entry Criteria | Exit Criteria |
|---|---|---|---|
| **L-1** | Formation | Founder & CEO authorization | Charter drafted; class assigned; reporting line defined |
| **L-2** | Charter Review | Formation complete | Department charter reviewed and approved through GRF process |
| **L-3** | Active | Charter approved | Operating per charter; reporting per cadence |
| **L-4** | Under Review | Material compliance concern or scheduled review | Review findings resolved or dissolution initiated |
| **L-5** | Dissolution | Founder & CEO authorization | Responsibilities transferred; assets disposed; records archived |

**Class E (Project) departments must define their exit criteria at Formation.** Failure to reach exit criteria within the defined lifecycle constitutes a lifecycle exception requiring escalation.

**Lifecycle Rules:**
1. Departments may not skip Formation and Charter Review
2. Dissolution requires explicit Founder & CEO authorization
3. A department Under Review may not initiate new missions without Executive Authority approval
4. Dissolved departments' records are archived, not deleted

**Delegation:** Department charter templates, formation procedures, and dissolution checklists are defined in Artifact #5 Department Handbook.

**Enforcement:** Departments operating outside their defined lifecycle stage are in constitutional violation. The COO function maintains the department lifecycle registry.

**Compliance Metric:** Department lifecycle registry current; 100% of active departments in Active (L-3) stage with approved charters; no departments stuck in Formation or Charter Review beyond defined timelines.

**Commentary (Non-Binding):** The lifecycle model prevents both informal department formation (bypassing charter review) and zombie departments (departments that exist on paper but have no active governance). Class E (Project) departments are particularly prone to becoming zombies — the exit criteria requirement at Formation is the preventive mechanism.

---

## Article 9 — Organizational Invariants

**Purpose:** Establish the constitutional invariants — properties that must remain true of the organizational structure at all times, regardless of operational changes.

**Constitutional Rule (Binding):** The following organizational invariants are constitutionally required and must not be violated by any operational or structural change:

**Invariant OI-1 — Single Authority Chain:** Every organizational entity has exactly one primary reporting line in the authority chain. Dotted-line or secondary reporting relationships are permitted for coordination but do not create additional authority flows.

**Invariant OI-2 — No Authority Without Registration:** No business unit, department, agent, or role may exercise authority without being registered in the applicable organizational registry (Organizational Registry, Department Registry, Authority Delegation Registry, or Agent Registry).

**Invariant OI-3 — Constitutional Supremacy Preservation:** No organizational structure change may reduce the authority of A-1 (Constitutional Authority) or compromise the independence of A-7 (Review Authority).

**Invariant OI-4 — Delegation Completeness:** Every A-4 and below authority holder must have a documented, approved delegation chain traceable to A-1. Delegation gaps are organizational violations.

**Invariant OI-5 — Control Independence Preservation:** The structural independence of Class D (Control) departments and A-7 (Review Authority) holders must be preserved through all organizational changes.

**Invariant OI-6 — Responsibility Continuity:** Every governed function must have a designated accountable role at all times. Governance vacuums — functions without accountable owners — are organizational violations.

**Invariant OI-7 — Agent Authority Boundedness:** Agent authority must always remain bounded, explicit, and revocable. Organizational changes may not expand agent authority beyond documented grants.

**Violation Response:** Any organizational change that would violate an invariant requires a constitutional amendment to this Charter before implementation. Proposed changes that appear to violate invariants must be flagged as Critical findings before adoption.

**Delegation:** Invariant monitoring and enforcement is the COO function's operational responsibility, with GRF review and escalation to Founder & CEO for violations.

**Enforcement:** Invariant violations are automatically Critical GRF findings. All proposed organizational changes are reviewed for invariant compliance before adoption.

**Compliance Metric:** Zero organizational invariant violations in effect at any governance review checkpoint. All proposed organizational changes accompanied by invariant compliance assessment.

**Commentary (Non-Binding):** Organizational invariants are the constitutionally guaranteed stability properties of the structure. They define what cannot change without constitutional amendment, ensuring that operational necessity cannot erode the governance foundations. OI-6 (Responsibility Continuity) deserves special attention — governance vacuums are often invisible until something goes wrong.

---

## Article 10 — Cross-Reference Map

**Purpose:** Establish the constitutional cross-reference map between this Charter and all governing and subordinate artifacts it depends upon or delegates to.

**Constitutional Rule (Binding):** This Charter is constitutionally bound to the following artifacts. Changes to cross-referenced artifacts that alter their relationship to this Charter require constitutional review of this Charter.

### Governing Artifacts (Authority Over This Charter)

| Artifact | Relationship | Article(s) Affected |
|---|---|---|
| CONST-001 Enterprise Constitution | Supreme governing authority; this Charter operates under CONST-001 | All |
| GOV-000 Governance Scaffold | Structural constraints and constitutional document requirements | All |
| ADR-0001 Constitutional Artifact Freeze | Freeze policy upon Approved status | All |
| GRF-PROC Governance Review Finding Process | Review and finding procedure | Review lifecycle |

### Peer Constitutional Artifacts

| Artifact | Relationship | Article(s) Affected |
|---|---|---|
| CONST-003 Governance Charter (pending) | Defines governance quorum, council, amendment process | Arts. 1, 8 |
| CONST-004 Standards Charter (pending) | Standards compliance framework | Arts. 1, 3, 8 |

### Subordinate Artifacts (This Charter Delegates To)

| Artifact | Delegated Scope | Articles Delegating |
|---|---|---|
| Artifact #5 Department Handbook | Department mandates, formation procedures, dissolution checklists, operational scope | Arts. 3, 4, 7, 8 |
| Artifact #6 Agent Handbook | Agent authority grants, operational constraints, compliance requirements | Arts. 4, 5, 7 |
| Artifact #7 RACI Matrix | Responsibility assignment, reporting lines | Arts. 1, 2, 5, 6, 7 |
| Artifact #8 Approval Matrix | Authority class assignments, protected action definitions | Arts. 4, 5, 7 |
| Artifact #9 Security Policy | Security-related independence and control requirements | Art. 7 |
| Artifact #12 Weekly Business Review | Business unit and department reporting cadence | Art. 6 |
| Artifact #13 Daily Executive Brief | Daily reporting cadence | Art. 6 |

### Reporting Artifacts

| Artifact | Relationship | Articles Affected |
|---|---|---|
| Hermes Company Pulse | Organizational compliance reporting | Arts. 6, 9 |
| GRF-CONST-002-round-1-register | Review findings for this Charter | All (under review) |
| CONST-002-review-package.c1-to-c2 | Formal review package | All (under review) |

**Delegation:** Cross-reference maintenance is the responsibility of the COO function. Cross-reference validation is a mandatory step in the Founding Week Exit Gate.

**Enforcement:** Cross-references are validated at each GRF review cycle. Broken or inconsistent cross-references are Medium or High GRF findings depending on impact.

**Compliance Metric:** All cross-references validated and current at each governance review. Zero unresolved cross-reference inconsistencies at Approved status.

**Commentary (Non-Binding):** The cross-reference map is the organizational connective tissue between this Charter and the rest of the governance stack. It must be kept current — stale cross-references are a warning sign that the governance stack is drifting out of alignment.

---

## Article 11 — Constitutional Compliance Statement

**Purpose:** Provide the formal constitutional compliance declaration for this Charter.

**Constitutional Rule (Binding):** This Charter affirms the following constitutional compliance declarations:

**CC-1 — Constitutional Supremacy Compliance:** This Charter operates under and in accordance with CONST-001 Enterprise Constitution. No provision of this Charter conflicts with or supersedes CONST-001.

**CC-2 — Structural Constraint Compliance:** This Charter contains:
- No operational procedures
- No current-person dependencies (all references are to roles, not individuals)
- No AI-platform-specific dependencies
- No implementation details
- Delegation to subordinate artifacts for all operational implementation

**CC-3 — Executable Governance Compliance:** Every article in this Charter contains:
- A defined Purpose
- A Constitutional Rule (Binding)
- A Delegation clause
- An Enforcement mechanism
- A Compliance Metric
- A Commentary (Non-Binding)

**CC-4 — Required Section Compliance:** This Charter contains all constitutionally required sections for a Tier 1 Organizational Charter:
- ✓ Enterprise Organizational Model (Article 1)
- ✓ Business Unit Model (Article 2)
- ✓ Department Classes (Article 3)
- ✓ Authority Classes (Article 4)
- ✓ Authority Flow — Downward (Article 5)
- ✓ Responsibility Flow — Upward (Article 6)
- ✓ Independence Requirements (Article 7)
- ✓ Department Lifecycle (Article 8)
- ✓ Organizational Invariants (Article 9)
- ✓ Cross-Reference Map (Article 10)
- ✓ Constitutional Compliance Statement (Article 11)
- ✓ Metadata Header (document front matter)

**CC-5 — Freeze Policy Compliance:** Upon reaching Approved v1.0 status, this Charter is subject to ADR-0001 constitutional freeze. No modification may occur without the formal amendment process defined in CONST-001 Book VIII.

**Delegation:** Compliance verification is performed by the Constitutional Reviewer & Governance Auditor through the GRF process.

**Enforcement:** Non-compliance with any of the above declarations is a Critical GRF finding blocking advancement to Approved status.

**Compliance Metric:** All five compliance declarations verified and affirmed in GRF Round 1 review package before advancement.

**Commentary (Non-Binding):** The Constitutional Compliance Statement is a self-assessment and constitutional commitment. Its verification by the Constitutional Reviewer & Governance Auditor through the GRF process is what transforms it from a declaration into a governed attestation.
