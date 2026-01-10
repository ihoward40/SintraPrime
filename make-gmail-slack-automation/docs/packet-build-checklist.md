# `packet-build-checklist.md`

**Complaint Packet Builder — Pre/Post Conditions**

**Audience:** Operators, reviewers, auditors
**Purpose:** Ensure every packet build is complete, deterministic, and reviewable before distribution or filing.

This checklist is **procedural**, not technical.
If every box is checked, the packet is valid by construction.

---

## A) Pre-Build Checklist (Before Running the Builder)

### A.1 Source Readiness

* ☐ All incidents to be included exist as JSON artifacts compliant with
  `verizon-guardian-output.v1.0.1.schema.json`
* ☐ Each incident has:

  * ☐ `meta.email_date`
  * ☐ `meta.sender`
  * ☐ `violation.summary`
  * ☐ `evidence.drive_pdf_url`
* ☐ No incident relies on Slack-only information

---

### A.2 Notion Database State

* ☐ Patterns DB is up to date (no pending sync jobs)
* ☐ Claim Summary DB reflects the current period totals
* ☐ Escalation Stage is correctly set (Notice / Cure / Default)
* ☐ No formulas are expected to compute totals at build time

---

### A.3 Evidence Integrity

* ☐ Each incident has exactly **one** preserved evidence PDF
* ☐ Evidence PDFs are finalized (no drafts or placeholders)
* ☐ Evidence links resolve correctly

---

### A.4 Scope Confirmation

* ☐ Packet Type selected (Regulatory / Demand / Litigation Support)
* ☐ Counterparty confirmed
* ☐ Incident date range reviewed and intentional
* ☐ No intent to add narrative conclusions during this build

---

## B) Build Execution Checklist

* ☐ Incidents sorted by `meta.email_date` (ascending)
* ☐ Exhibit numbering derived solely from sorted order
* ☐ Packet assembled using the immutable section order:

  1. Cover Letter
  2. Incident Summary
  3. Pattern Summary
  4. Claim Summary
  5. Evidence Index
  6. Evidence PDFs
  7. Verification Appendices
* ☐ No manual edits performed during assembly

---

## C) Post-Build Checklist (Before Use or Filing)

### C.1 Structural Validation

* ☐ Packet ZIP created successfully
* ☐ Folder structure matches runbook specification
* ☐ All referenced exhibits are present
* ☐ No empty or placeholder files included

---

### C.2 Content Validation

* ☐ Cover letter contains no legal conclusions
* ☐ Pattern summary reflects DB values exactly
* ☐ Claim totals match Claim Summary DB snapshot
* ☐ No Slack content appears anywhere in the packet

---

### C.3 Logging & Audit Trail

* ☐ Packet Record created in Packet Record DB
* ☐ Packet ZIP URL recorded
* ☐ Builder version recorded
* ☐ Source schema version recorded

---

### C.4 Release Readiness

* ☐ Packet reviewed as a complete unit
* ☐ Rebuild would produce identical output if inputs unchanged
* ☐ Packet cleared for:

  * ☐ Internal review
  * ☐ Regulatory submission
  * ☐ Filing support

---

**If any box is unchecked, the packet is not final.**
