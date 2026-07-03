# Audit Directory

**Section:** Audit  
**Case:** CASE-666234B709  
**Purpose:** Immutable chain-of-custody log and audit receipts

---

## Contents

| File | Description |
|------|-------------|
| [CHAIN-OF-CUSTODY.jsonl](./CHAIN-OF-CUSTODY.jsonl) | Append-only machine-readable custody log |
| [AUDIT-RECEIPT.md](./AUDIT-RECEIPT.md) | Human-readable audit summary |

---

## Audit Directory Rules

1. `CHAIN-OF-CUSTODY.jsonl` is **append-only**. Existing lines must never be modified or deleted.
2. Each new event appended must include:
   - `seq` — monotonic integer (increment from last entry)
   - `event_type` — one of: `REPOSITORY_INITIALIZED`, `EVIDENCE_IMPORTED`, `HASH_VERIFIED`, `STATUS_CHANGED`, `APPROVAL_GRANTED`, `ACTION_COMPLETED`, `CUSTODY_TRANSFERRED`, `GOVERNANCE_INCIDENT`
   - `case_id` — `CASE-666234B709`
   - `timestamp` — ISO 8601 UTC
   - `actor` — who or what performed the action
   - `description` — plain-language description
   - `prior_entry_hash` — SHA-256 of the previous JSONL line
   - `entry_hash` — SHA-256 of this entry's JSON (computed after all other fields are set)
3. `AUDIT-RECEIPT.md` should be updated whenever a material event occurs.
4. No file in this directory may be removed or renamed.

## Hash Chain Verification

To verify the hash chain integrity:

```bash
node scripts/case/verify-custody-chain.mjs CASE-666234B709
```

Expected output: `{"ok":true,"entries_checked":N,"chain":"VALID"}`
