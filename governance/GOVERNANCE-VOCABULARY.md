# SintraPrime Enterprise — Governance Vocabulary

**Version:** 1.0.0  
**Date:** 2026-07-02  
**Authority:** Issued per GOV-AUD-001-founding-week-enterprise-audit  
**Scope:** All SintraPrime Enterprise agents and artifact authors

---

## Purpose

Standardize the terminology used across all agents, documents, and communications within SintraPrime Enterprise. Inconsistent state vocabulary was identified in GOV-AUD-001 as a cross-agent risk. This document resolves that.

All agents are bound to use these definitions in formal artifacts, status reports, and governance communications.

---

## Artifact States

These states apply to all governance artifacts (CONST, GOV, ADR, MAN, PLAY, REF):

| State | Meaning | Who Can Set |
|-------|---------|------------|
| `Draft` | Being actively written; not yet ready for review | Author |
| `Review` | Submitted for formal review under ADR-0002 protocol | Author (on submission) |
| `Approved` | Accepted with findings; not yet governing baseline | Governance Reviewer |
| `Ratified` | Official governing baseline; binding on all agents | Founder (Isiah Howard) |
| `Enforced` | Actively controlling enterprise behavior; compliance measured | Hermes (on activation) |
| `Archived` | Superseded by a later artifact; no longer authoritative | Governance Reviewer |

---

## Maturity Codes

Used alongside states to indicate completeness within a lifecycle stage:

| Code | Label | Meaning |
|------|-------|---------|
| C0 | Draft Concept | Idea exists; no formal document |
| C1 | Formal Draft | Document written; ready for submission |
| C2 | Review Candidate | Under or awaiting formal review |
| C3 | Ratified | Approved and governing |
| C4 | Actively Enforced | Compliance monitoring active |
| C5 | Measured and Audited | Metrics collected; periodic audits run |
| C6 | Continuously Optimized | Data-driven improvement cycle active |

---

## Health / Status Indicators

Used in status reports, Company Pulse, and audit summaries:

| Indicator | Label | Meaning |
|-----------|-------|---------|
| 🟢 | Green / Stable / Operational | Functioning as intended; no action needed |
| 🟡 | Yellow / Partial / Early | In progress; gaps acknowledged; monitoring |
| 🔴 | Red / Blocked / At Risk | Requires immediate attention |
| ⚫ | Black / Archived / Frozen | No longer active; preserved for record |

---

## Agent Function Labels

Canonical role labels for the Enterprise Governance Topology:

| Agent | Canonical Label | What They Do |
|-------|----------------|-------------|
| Isiah Howard | Founder / Principal | Final authority; all approvals |
| Hermes | Chief of Staff | Manages work; does NOT perform work |
| ChatGPT | Chief Intelligence Officer | Strategic review; constitutional auditing |
| Tasklet | Operations Lead | Executes workflows; manages task pipelines |
| Viktor | Chief Infrastructure & Systems Architect | Builds systems; creates artifacts; implements |
| Manus | Production Lead | Content production and publishing pipeline |
| Space Agent | Infrastructure Integration Lead | Platform integrations and space management |
| Agent Zero | Local Automation Lead | On-device automation; local execution |
| Twin | Independent Verification | Not QA. Validates conclusions, not just function |

---

## Prohibited Terms (for formal artifacts)

Avoid these in formal governance documents and status reports. Use the canonical equivalents above.

| Avoid | Use Instead |
|-------|------------|
| Active | Enforced or Operational (per context) |
| Authoritative | Ratified |
| Completed | Ratified (for artifacts) or Closed (for tasks) |
| Approved | Use Approved only for artifacts accepted but not yet governing; not as a synonym for Ratified |
| Running | Operational |
| Done | Closed (tasks) / Archived (artifacts) |
| Live | Enforced or Operational |

---

## Amendment History

| Version | Date | Change | Author |
|---------|------|--------|--------|
| 1.0.0 | 2026-07-02 | Initial issue per GOV-AUD-001 vocabulary standardization finding | Viktor |
