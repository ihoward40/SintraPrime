# Evidence-First Workflow (v1)

**Governance artifact — process documentation only**  
**Not a legal strategy document. Does not predict legal outcomes.**  
**External actions are approval-gated.**

---

## Overview

The evidence-first workflow ensures every case is built from documented, authenticated evidence before any correspondence, filing, or legal action is taken. Evidence drives claims; claims are never asserted without evidentiary support.

This workflow governs:
- Evidence intake and registration
- Chain-of-custody metadata
- Claim mapping and ledger maintenance
- Case packet generation
- External action approval gates

---

## Workflow Phases

### Phase 0 — Repository Initialization

Before any evidence is accepted:

1. Create case directory structure:
   ```
   CASE-{ID}/
   ├── 01_Intake/
   ├── 02_Credit_Reports/
   ├── 03_Original_Creditor/
   ├── 04_Collection_Agency/
   ├── 05_Correspondence/
   ├── 06_Evidence/
   ├── 07_Legal_Research/
   ├── 08_Drafts/
   ├── 09_Submitted/
   ├── 10_Responses/
   ├── 11_Deadlines/
   └── Audit/
   ```
2. Assign Case ID in canonical format (e.g., `CASE-666234B709`).
3. Initialize claim ledger (see [claim-ledger-model.v1.md](./claim-ledger-model.v1.md)).
4. Initialize evidence request register (see [evidence-request-register.v1.md](./evidence-request-register.v1.md)).
5. Initialize litigation readiness record (see [litigation-readiness-metrics.v1.md](./litigation-readiness-metrics.v1.md)).

### Phase 1 — Evidence Intake

For each piece of evidence:

1. Assign a unique Evidence ID in format `EV-{YYYY}-{NNNNN}` (e.g., `EV-2026-00001`).
2. Record provenance metadata per `Evidence_Item` schema:
   - `acquisition_method`, `acquisition_date`, `obtained_from`
   - `authenticity_status`, `verification_status`
   - SHA-256 hash of the document
   - custodian, description, source category
3. Place document in the appropriate case subfolder.
4. Record in the evidence index (Audit/ folder).
5. Do **not** overwrite existing evidence items — append new versions using the document versioning policy (see [document-versioning-policy.v1.md](./document-versioning-policy.v1.md)).

### Phase 2 — Claim Mapping

After evidence is registered:

1. State each factual claim in the claim ledger.
2. Map supporting evidence IDs to each claim.
3. Assign support status (`supported` / `partially_supported` / `unsupported`).
4. Record any missing evidence needed to promote status.
5. Log outstanding evidence requests in the evidence request register.

### Phase 3 — Case Packet Generation

Packet generation is driven by the evidence repository and claim ledger. A packet must include:

- Cover sheet (case ID, party names, packet version, generation date)
- Case summary
- Chronology (evidence-sourced, no unsupported assertions)
- Evidence index (all EV-{ID} items with hashes)
- Claim ledger extract (claims → evidence mappings)
- Supporting exhibits (referenced by EV-{ID})
- Authority index (statutes, regulations, case law cited)
- Outstanding request list (pending items from evidence request register)
- Next deadlines
- Audit receipt (packet hash, generation timestamp)

**Packets are versioned and never overwritten.** See document versioning policy.

### Phase 4 — External Action Gate

**No external action may proceed without explicit human approval.**

Actions subject to the gate:
- send, file, contact, submit, delete, modify, email, call, mail, serve, post

Each externally-gated action must be logged with:
- Action type
- Target
- Prepared artifact (EV-{ID} or packet version)
- Approval status: `pending_approval` / `approved` / `rejected`
- Approver
- Approval timestamp

### Phase 5 — Response Intake and Update

When responses are received:

1. Register response as a new evidence item with full provenance.
2. Update the claim ledger (support status may change).
3. Update the evidence request register (mark items received).
4. Regenerate affected case packet (new version).
5. Update litigation readiness scores.

---

## Reference Implementation

**CASE-666234B709** (Halsted / LVNV / Resurgent) is the reference implementation for this workflow.

See [CASE-666234B709/README.md](./CASE-666234B709/README.md).

---

## Related Artifacts

- [litigation-readiness-metrics.v1.md](./litigation-readiness-metrics.v1.md)
- [claim-ledger-model.v1.md](./claim-ledger-model.v1.md)
- [evidence-request-register.v1.md](./evidence-request-register.v1.md)
- [document-versioning-policy.v1.md](./document-versioning-policy.v1.md)
- Schema: `notion/schemas/Evidence_Item.schema.json`
- Schema: `notion/schemas/Claim_Ledger.schema.json`
- Schema: `notion/schemas/Evidence_Request.schema.json`
- Schema: `notion/schemas/Document_Version.schema.json`
- Schema: `notion/schemas/Litigation_Readiness.schema.json`
