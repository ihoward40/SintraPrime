# Notarization SOP — Documentation & Public Bundles (v1)

## Purpose
This SOP defines acceptable notarization methods for anchoring documentation
and public bundles in time, with explicit claims boundaries.

---

## Variant A — RFC-3161 Timestamp Authority (TSA)

### Use Case
Cryptographic proof that a digest existed at or before a specific time.

### Inputs
- Digest file (recommended):
  - `public_verifier.sha256`
  - or `merkle.root.txt`

### Outputs
- Timestamp token:
  - `<input>.tsr`

### Storage
````

notarization/
├── public_verifier.sha256
├── public_verifier.sha256.tsr
└── tsa-notes.md

```

### Verification
- Verify TSA signature
- Confirm digest inside token matches input

### Claims Boundary
TSA notarization proves:
- existence of a digest by a time

It does NOT prove:
- authorship
- intent
- correctness
- legal sufficiency

---

## Variant B — Human Notary (Affidavit-Based)

### Use Case
Sworn human attestation of possession or creation of an artifact.

### Document
A notarized affidavit that references:
- artifact name
- SHA-256 hash
- date of attestation

### Required Language (Example)
> “I attest that the artifact identified by SHA-256 hash `<hash>`
> was in my possession on `<date>`.”

### Storage
```

a notarization/
├── affidavit.<date>.pdf
└── affidavit.<date>.pdf.sha256

```

### Claims Boundary
Human notarization proves:
- a person swore to possession or creation

It does NOT prove:
- technical correctness
- completeness
- legal enforceability

---

## Recommended Practice
- Prefer TSA for technical integrity
- Use human notarization only when identity matters
- Never notarize mutable files—only hashes

---

## Non-Goals
This SOP does not:
- replace legal advice
- certify compliance
- assert operational correctness
