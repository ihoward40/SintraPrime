# Complaint Packet Builder — Runbook

**Status:** Stable
**Scope:** Deterministic packet assembly only
**Non-Goals:** Legal conclusions, inference, liability theories, Slack consumption

---

## 1) Purpose

The Complaint Packet Builder assembles a **repeatable, auditable enforcement packet** from already-captured facts, patterns, and totals.

It does **not** interpret facts, speculate intent, or recalculate damages.
It **only** composes and orders artifacts that already exist.

---

## 2) Authoritative Inputs (Read-Only)

This builder consumes **only** the following sources:

### 2.1 JSON Incident Artifacts

* `verizon-guardian-output.v1.0.1.schema.json`

Used fields (non-exhaustive):

* `meta.case_number`
* `meta.email_date`
* `meta.sender`
* `meta.subject`
* `violation.types[]`
* `violation.summary`
* `damages.estimated_amount`
* `damages.currency`
* `evidence.drive_pdf_url`

> No fields outside the schema may be read.

---

### 2.2 Notion Databases (Read-Only)

#### a) Patterns DB

Defined in: `notion-patterns-db.md`

Used properties:

* Counterparty
* Violation Type
* First Seen
* Last Seen
* Occurrence Count
* Pattern Threshold Met

#### b) Claim Summary DB

Defined in: `notion-claim-summary-db.md`

Used properties:

* Month
* Incident Count
* Total Estimated Damages
* Running Total
* Claim Threshold Hit

#### c) Escalation Fields

Defined in: `notion-escalation-fields.md`

Used properties:

* Stage (Notice / Cure / Default)
* Notice Sent
* Cure Deadline
* Escalation Ready

---

## 3) Packet Types (Same Machinery, Different Covers)

The builder supports multiple packet *contexts* using the same assembly rules:

* Regulatory (CFPB / State AG)
* Pre-litigation demand
* Litigation support

Differences are limited to **cover text only**.
Underlying exhibits, numbering, and summaries are identical.

---

## 4) Packet Assembly Order (Immutable)

Packets are assembled **in this order, always**:

1. Cover Letter (template-driven, no conclusions)
2. Incident Summary Table
3. Pattern-of-Conduct Summary
4. Claim Summary Snapshot
5. Evidence Index
6. Evidence PDFs (one per incident)
7. Verification / Chain-of-Custody Appendices

No reordering is permitted.

---

## 5) Section Definitions

### 5.1 Cover Letter

* Identifies counterparty
* Identifies time span covered
* Identifies escalation stage (Notice / Cure / Default)
* **Does not** assert liability or intent

Inputs:

* Escalation Stage
* First Seen / Last Seen dates

---

### 5.2 Incident Summary Table

One row per incident.

Columns:

* Case Number
* Email Date
* Sender
* Subject
* Violation Types
* Estimated Damages
* Evidence Reference

Source:

* JSON incident artifacts only

---

### 5.3 Pattern-of-Conduct Summary

Generated **only** from Patterns DB.

Includes:

* Violation Type
* Occurrence Count
* Date Range
* Pattern Threshold Met (Yes/No)

No narrative synthesis is added.

---

### 5.4 Claim Summary Snapshot

Pulled directly from Claim Summary DB.

Includes:

* Incident Count (period)
* Total Estimated Damages (period)
* Running Total
* Claim Threshold Hit (Yes/No)

The builder does **not** calculate totals.

---

### 5.5 Evidence Index

Deterministic mapping:

| Exhibit | Description           | Source |
| ------- | --------------------- | ------ |
| A-1     | Incident Evidence PDF | Drive  |
| A-2     | Incident Evidence PDF | Drive  |
| …       | …                     | …      |

Exhibit numbering is:

* Stable
* Rebuild-safe
* Derived from sorted incident dates

---

### 5.6 Evidence PDFs

Each incident contributes **exactly one** PDF:

* Converted from the original email
* Retrieved from `evidence.drive_pdf_url`
* No edits, highlights, or annotations

---

### 5.7 Verification Appendices

Appended as-is:

* Chain of custody diagram
* Verification appendix
* Declarations (if present)

The builder does not modify these documents.

---

## 6) Exhibit Numbering Rules

* Exhibits are numbered **after sorting incidents by `meta.email_date` (ascending)**.
* The same input set always yields the same exhibit numbers.
* Re-running the builder with unchanged inputs yields identical packets.

---

## 7) Make.com Responsibilities

### Make.com **does**

* Query Notion databases
* Retrieve Drive files
* Assemble documents in order
* Zip final packet

Each packet build is recorded separately in the Packet Record database (see `notion-packet-record-db.md`).

### Make.com **does not**

* Re-classify incidents
* Modify evidence
* Recalculate damages
* Read Slack messages

---

## 8) Outputs

### Folder Structure

```
Complaint_Packet_<YYYY-MM-DD>/
├─ Cover_Letter.pdf
├─ Incident_Summary.pdf
├─ Pattern_Summary.pdf
├─ Claim_Summary.pdf
├─ Evidence_Index.pdf
├─ Exhibits/
│  ├─ Exhibit_A-1.pdf
│  ├─ Exhibit_A-2.pdf
│  └─ …
└─ Verification/
   ├─ Chain_of_Custody.pdf
   ├─ Verification_Appendix.pdf
```

### Zip

```
Complaint_Packet_<YYYY-MM-DD>.zip
```

---

## 9) Guardrails (Explicit)

The Complaint Packet Builder:

* Makes **no legal conclusions**
* Infers **no intent or willfulness**
* Introduces **no new data**
* Depends on **no Slack state**
* Operates **purely from recorded facts**

If data is missing upstream, the packet reflects that absence explicitly.

---

## 10) Auditability

Given the same:

* JSON artifacts
* Notion records
* Evidence files

The builder will always produce the same packet.
This is a design requirement, not an optimization.

---

## Related operational docs

* `packet-build-checklist.md`
* `packet-rebuild-comparison.md`

### End of Runbook
