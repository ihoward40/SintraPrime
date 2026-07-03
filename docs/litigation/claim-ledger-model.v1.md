# Claim Ledger Model (v1)

**Governance artifact — process documentation only**  
**Claims must be fact-grounded and evidence-mapped. No claim is asserted without a corresponding evidence entry.**

---

## Purpose

The claim ledger is the authoritative mapping of legal/factual claims to evidence items within a case. It ensures:

- Every claim stated in a case packet is traceable to one or more evidence items.
- The support status of each claim is explicitly recorded and updated as evidence is added.
- Missing evidence gaps are surfaced for action (via the evidence request register).
- Packet generation pulls directly from the claim ledger so assertions are never fabricated.

---

## Data Model

Each entry in the claim ledger represents a single discrete claim or factual assertion.

### Claim Ledger Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `claim_id` | string | Yes | Unique identifier (e.g., `CLAIM-001`) |
| `case_id` | string | Yes | Parent case identifier (e.g., `CASE-666234B709`) |
| `claim_statement` | string | Yes | A single, unambiguous factual or legal assertion |
| `claim_category` | enum | Yes | `fact` / `legal_conclusion` / `calculation` / `timeline_event` |
| `supporting_evidence_ids` | array[string] | Yes | Evidence IDs (`EV-{YYYY}-{NNNNN}`) that support this claim |
| `support_status` | enum | Yes | `supported` / `partially_supported` / `unsupported` |
| `support_notes` | string | No | Explanation of why support status was assigned |
| `missing_evidence` | array[string] | No | Description of evidence needed to promote support status |
| `evidence_request_ids` | array[string] | No | IDs in the evidence request register for outstanding items |
| `added_date` | date | Yes | ISO 8601 date when the claim was first recorded |
| `last_updated` | date | Yes | ISO 8601 date of last status update |

### Support Status Definitions

| Status | Meaning |
|--------|---------|
| `supported` | One or more authenticated evidence items directly establish the claim; no material gaps |
| `partially_supported` | Evidence exists but is incomplete, unauthenticated, or only circumstantially supports the claim |
| `unsupported` | No evidence currently supports the claim; claim must not appear in external submissions without promotion |

---

## Example: CASE-666234B709 Claim Ledger

```yaml
case_id: CASE-666234B709
ledger_version: "1"
generated: "2026-07-03"

claims:

  - claim_id: CLAIM-001
    case_id: CASE-666234B709
    claim_statement: >
      Resurgent Capital Services LP sent a deficiency notice to Howard on or about
      [date] regarding account [account number] in the amount of $[amount].
    claim_category: fact
    supporting_evidence_ids:
      - EV-2026-00001
    support_status: supported
    support_notes: Deficiency notice imported as EV-2026-00001 with hash and provenance.
    missing_evidence: []
    evidence_request_ids: []
    added_date: "2026-07-03"
    last_updated: "2026-07-03"

  - claim_id: CLAIM-002
    case_id: CASE-666234B709
    claim_statement: >
      LVNV Funding LLC is the current account owner of the alleged debt
      originally originated by [original creditor].
    claim_category: fact
    supporting_evidence_ids:
      - EV-2026-00002
    support_status: partially_supported
    support_notes: >
      Chain of title documentation not yet obtained; deficiency notice references
      LVNV as owner but original assignment agreement is missing.
    missing_evidence:
      - Original credit agreement from original creditor
      - Account assignment/purchase agreement between original creditor and LVNV
    evidence_request_ids:
      - REQ-001
      - REQ-002
    added_date: "2026-07-03"
    last_updated: "2026-07-03"

  - claim_id: CLAIM-003
    case_id: CASE-666234B709
    claim_statement: >
      Resurgent Capital Services LP is authorized to collect on behalf of LVNV
      Funding LLC and has a valid collection license in the applicable jurisdiction.
    claim_category: legal_conclusion
    supporting_evidence_ids: []
    support_status: unsupported
    support_notes: >
      No validation record obtained. Collection agency validation letter
      not yet requested or received.
    missing_evidence:
      - Debt validation letter from Resurgent
      - Collection agency license verification for applicable state
    evidence_request_ids:
      - REQ-003
    added_date: "2026-07-03"
    last_updated: "2026-07-03"
```

---

## Packet Generation Reference

When generating a case packet, the packet generator must:

1. Pull all claims from the ledger for the case.
2. Include only claims with `support_status: supported` in the "Claims" section of external submissions.
3. List `partially_supported` claims in a "Claims Requiring Additional Evidence" section.
4. Exclude `unsupported` claims from external submissions entirely.
5. Include the full claim-to-evidence mapping in the packet's Evidence Index section for internal use.

**Unsupported claims must not appear in any externally submitted document.**

---

## Schema

See `notion/schemas/Claim_Ledger.schema.json` for the machine-readable schema.

---

## Governance Note

The claim ledger is append-only within a packet version cycle. To update a claim's status, update the `support_status` and `last_updated` fields, and add a `support_notes` entry explaining the change. Previous statuses are preserved in the audit trail.
