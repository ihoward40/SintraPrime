# Change Control v1.1 (Admissibility-Preserving)

This document defines what may change in v1.1 without undermining auditability or admissibility.

## Definitions

- **Canonical proof**: artifacts that determine integrity and replay safety.
- **Supplementary proof**: artifacts that provide human context, but are not cryptographic truth.

## Frozen (no change in v1.1)

Changes in this section require a major version bump and an explicit re-freeze.

- Integrity contract for runs: `ledger.jsonl` is append-only.
- Hashing contract: `hashes.json` and `roothash.txt` semantics.
- Manifest contract: required fields and meaning of `manifest.json`.
- Approval semantics: apply must execute only an approved plan; no silent replanning.
- Verifier behavior (`scripts/verify.js`) for existing export formats.
- Policy deny-by-default posture for live systems.

## Allowed (safe in v1.1)

- New read-only adapters behind explicit allowlists.
- UI improvements that do not alter canonical export artifacts.
- Additional refusal codes that are additive and documented.
- Optional, non-blocking supplementary artifacts (e.g., screen recordings) provided they never become canonical proof.

## Requires a migration note (v1.1)

- Adding new optional artifact files under runs (e.g., new subfolders), as long as hashing and manifest contracts remain unchanged.
- Adding new planner output files if they are referenced in the ledger and hashed.

## Requires major version bump

- Any change to hashing algorithms, hashing scope, or root hash computation.
- Any change to approval/rollback semantics.
- Any newly introduced autonomous write capability.

## Recordings policy (explicit)

- Screen recordings are **supplementary**. Canonical proof remains: ledger + hashes + API receipts.
- Recording failures must not block apply.
- If present, recordings must live under `runs/<RUN_ID>/screen/` and be included in run hashing.
