# Evidence Request Register (v1)

**Governance artifact — process documentation only**  
**Tracks outstanding requests for evidence. Does not authorize sending requests without human approval.**

---

## Purpose

The evidence request register records every item of evidence that has been formally requested from a third party. It enables:

- Tracking of outstanding requests and their current status.
- Surfacing of missing evidence items that are blocking claim promotion in the claim ledger.
- Audit trail of request history (date requested, from whom, current status).
- Identification of stale or unanswered requests for follow-up action.

---

## Data Model

Each entry in the register represents a single request for a specific document or category of evidence.

### Evidence Request Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `request_id` | string | Yes | Unique identifier (e.g., `REQ-001`) |
| `case_id` | string | Yes | Parent case identifier (e.g., `CASE-666234B709`) |
| `requested_item` | string | Yes | Description of the specific document or evidence requested |
| `requested_from` | string | Yes | Organization or individual from whom the item was requested |
| `date_requested` | date | No | ISO 8601 date the request was sent (null if not yet sent) |
| `request_method` | enum | No | `certified_mail` / `email` / `fax` / `portal` / `verbal` / `not_sent` |
| `status` | enum | Yes | `draft` / `pending_approval` / `sent` / `received` / `overdue` / `withdrawn` |
| `deadline` | date | No | Date by which a response is legally required or expected |
| `response_date` | date | No | ISO 8601 date response was received (null if not yet received) |
| `received_evidence_ids` | array[string] | No | EV-{ID} items received in response to this request |
| `related_claim_ids` | array[string] | No | CLAIM-{ID} entries this request supports |
| `notes` | string | No | Free-text notes on the request |

### Status Definitions

| Status | Meaning |
|--------|---------|
| `draft` | Request prepared but not yet approved for sending |
| `pending_approval` | Request awaiting human approval before it can be sent |
| `sent` | Request has been transmitted; awaiting response |
| `received` | Response received; evidence registered |
| `overdue` | Deadline has passed with no response |
| `withdrawn` | Request cancelled or superseded |

**All requests must transition through `pending_approval` before `sent`. No request may be transmitted without explicit human approval.**

---

## Outstanding Requests View

The following view surfaces all requests that require attention:

- `status: draft` — needs to be prepared and submitted for approval
- `status: pending_approval` — awaiting human approval before sending
- `status: sent` — awaiting response; check deadline
- `status: overdue` — deadline passed; escalation may be required

---

## Example: CASE-666234B709 Evidence Request Register

```yaml
case_id: CASE-666234B709
register_version: "1"
generated: "2026-07-03"

requests:

  - request_id: REQ-001
    case_id: CASE-666234B709
    requested_item: Original credit agreement from original creditor (account [number])
    requested_from: "[Original Creditor Name]"
    date_requested: null
    request_method: not_sent
    status: draft
    deadline: null
    response_date: null
    received_evidence_ids: []
    related_claim_ids:
      - CLAIM-002
    notes: >
      Needed to establish chain of title from original creditor to LVNV.
      Draft request prepared; pending approval before sending.

  - request_id: REQ-002
    case_id: CASE-666234B709
    requested_item: Account assignment/purchase agreement between original creditor and LVNV Funding LLC
    requested_from: LVNV Funding LLC
    date_requested: null
    request_method: not_sent
    status: draft
    deadline: null
    response_date: null
    received_evidence_ids: []
    related_claim_ids:
      - CLAIM-002
    notes: >
      Required to verify LVNV's ownership of the alleged debt.

  - request_id: REQ-003
    case_id: CASE-666234B709
    requested_item: Debt validation letter from Resurgent Capital Services LP (30-day validation demand)
    requested_from: Resurgent Capital Services LP
    date_requested: null
    request_method: not_sent
    status: draft
    deadline: null
    response_date: null
    received_evidence_ids: []
    related_claim_ids:
      - CLAIM-003
    notes: >
      FDCPA Section 809 validation demand to be sent via certified mail.
      Awaiting approval. Upon sending, deadline is 30 days from receipt.
```

---

## Schema

See `notion/schemas/Evidence_Request.schema.json` for the machine-readable schema.

---

## Governance Note

The evidence request register is an internal tracking document. Individual request entries must not be transmitted to third parties. Only the approved request correspondence (drafted separately) may be transmitted, and only after explicit human approval.
