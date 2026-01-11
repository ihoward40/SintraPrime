# Courtroom Insert (One Page)

## Electronic Evidence — Quick Intake

**What this is**
- Machine-generated electronic records
- No human statements
- No opinions, no narrative testimony

**Includes**
- Execution manifest
- Append-only ledger (JSONL)
- Hash list (SHA-256)
- Verification script + output
- Custodian certification

**Authenticity (plain)**
- Records are created automatically
- Stored append-only (no overwrite)
- Integrity is verified by hash comparison
- Any party can verify independently

**Witness**
- Not required for authentication where self-authentication applies; certification is attached

**If there is an objection**
- Authentication → Rule 104(a) (judge decides)
- Weight → fact-finder (if applicable)

**Clerk checkboxes**
- ☐ Execution ID matches across exhibits
- ☐ Hashes match verification output
- ☐ Certification signed
- ☐ Exhibits labeled consistently

**Exhibits (suggested labels)**
- Exhibit A: Audit Bundle
- Exhibit B: Verification Output
- Exhibit C: Custodian Affidavit
- Exhibit D: Judicial Explainer
- Exhibit E: Live Read Snapshot (if applicable)

> Clerk note: This evidence is verified mechanically. If hashes match, the record is authentic.

---

## Framing by venue (one sentence)

- **Family Court:** “Verified records; no one’s memory is required.”
- **Civil Court:** “Comparable to system logs / business records, with independent verification.”
- **Administrative:** “Sufficient indicia of reliability; verification requires no live testimony.”

---

## Hostile Q&A (script)

**Court:** “How is this authenticated?”  
**You:** “Under Rule 104(a), the Court can decide authentication. These records are machine-generated, stored append-only, and verified by cryptographic hash; the verification tools are included.”

**Opposing:** “Anyone could alter it.”  
**You:** “If altered, hashes would not match and verification would fail.”

**Opposing:** “No peer review.”  
**You:** “The method is hash comparison and append-only logging—decades-old mechanisms. The Court is not asked to accept a theory, only to compare hashes.”

---

## Sensitivity note (optional for family/juvenile)

Use neutral language. Avoid unnecessary personal details in exhibits; rely on redacted artifacts + verification outputs.
