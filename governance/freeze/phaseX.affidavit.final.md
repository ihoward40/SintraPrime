# Phase X Integrity Affidavit (Final)

Date: 2026-01-10

This affidavit attests to the integrity and reproducibility of a governed automation snapshot ("Phase X") for the repository.

## Referenced artifacts (authoritative)

- Authoritative freeze commit (lock commit): `ada828b2a4085ec084eb9900aff56d60042fa997`
- Frozen source commit (the governed surface commit the lock describes): `6bc5743b847a26559c62396778a30b4251b010e3`

- Phase X lock file:
  - Path: `governance/freeze/phaseX.lock.json`
  - SHA-256: `e243211e901dd210a2e01a82ab07e3e4be8b9890cb52e160ce24320bc4f1c252`

- Phase X governed-surface root hash (from lock):
  - `34252399507137d80824a2d02ce83fe42a3318fb06b48d1546f04f202b083f7a`

- Deterministic bundle (zip) created by the Phase X freeze tool:
  - Path (local build output, not committed): `dist/phaseX/ike-governance-phaseX.zip`
  - SHA-256: `8b94fb2456b4549ab8de76d0438e9853e889e65e7e7a441004c0fda3d35a1d2b`

## Statement of method

1. The Phase X freeze generator computed SHA-256 for each governed file in-scope and recorded them in the lock.
2. The lock also records a governed-surface root hash computed as SHA-256 over the sorted lines:
   `"<sha256>  <path>"` for each governed file.
3. The Phase X bundle ZIP was produced deterministically and its SHA-256 is recorded above.
4. Verification was performed using the repository’s verifier script (`scripts/phaseX-freeze-verify.mjs`) against the committed lock.

## RFC-3161 timestamp posture (explicit)

No RFC-3161 Time-Stamp Authority (TSA) evidence is attached to this Phase X lock.

- The lock’s `timestamp` section is present only as a structured placeholder.
- No `tsr_path` / `tsr_sha256` is asserted.
- No TSA serial is asserted.

This affidavit makes no claim of third-party timestamping.

## Exhibits (recommended attachments)

- Exhibit A: `governance/freeze/phaseX.lock.json` (printed and/or digitally attached)
- Exhibit B: SHA-256 of the lock file (this affidavit section and/or sidecar)
- Exhibit C: SHA-256 of the deterministic Phase X bundle ZIP (as produced locally)

---

Signature: ________________________________

Name: ________________________________

Title/Role: ________________________________

