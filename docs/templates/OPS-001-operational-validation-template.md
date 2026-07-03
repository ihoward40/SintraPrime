# OPS-001 — Operational Validation Template

```
Artifact-ID:    OPS-001
Version:        1.0
Status:         Template
Mission:        MISSION-0001
Owner:          Hermes
Reviewer:       Isiah Howard
Effective-Date: 2026-07-02
Next-Review:    2026-10-01
Implements:     docs/ops/PRODUCTION-VERIFICATION-CHECKLIST.md
References:     MISSION-0001, GOV-AUD-001
```

---

## Usage

Copy this template for each validation run. Replace `{{PLACEHOLDERS}}`. File as `OPS-{{YYYY-MM-DD}}-{{scope}}-validation.md`.  
A validation report is *not* complete until the Evidence section is filled.

---

## [HEADER: Fill with validation scope]

**Report-ID:** OPS-{{SEQ}}-{{YYYY-MM-DD}}  
**Scope:** {{What is being validated}}  
**Validation Window:** {{Start}} → {{End}}  
**Prepared By:** Hermes  
**Approved By:** Isiah Howard  
**Status:** Draft / Approved / Failed *(delete one)*

---

## Validation Events

| # | Event | Expected | Actual | Pass/Fail | Notes |
|---|-------|----------|--------|-----------|-------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |

---

## Promotion Gate

All criteria must be ✅ PASS before the system under validation is promoted to Operational.

| Criteria | Required | Status |
|----------|----------|--------|
| All events executed automatically | Yes | |
| All events posted to correct destinations | Yes | |
| All event content complete (no errors) | Yes | |
| No manual intervention required | Yes | |
| Immutable receipt generated (if applicable) | Yes/No | |

**Promotion Decision:** Approve / Reject / Conditional *(delete one)*  
**If Conditional:** *(Describe required remediation before promotion)*

---

## Failure Log

If any event failed, record it here. Do not add new features to fix failures — diagnose and repair only.

| Event | Failure Mode | Root Cause | Fix Applied | Re-run Result |
|-------|-------------|------------|-------------|---------------|
| | | | | |

---

## Evidence

| Evidence | Location | Status |
|----------|----------|--------|
| Cron execution logs | | |
| Slack delivery receipts | | |
| Channel message links | | |
| Error logs (if any) | | |
| Audit trail entry | | |

---

## Disposition

```
Validation-ID:
System:
Observation-Window:
Events-Passed:
Events-Failed:
Blocking-Issues:
Promotion-Decision:
Effective-Date:
```

---

*This template is governed by MISSION-0001 and subject to the Founding Week documentation freeze.*  
*Do not modify this template until Tier 1 Ratification. Exceptions: defect corrections, operational blockers.*
