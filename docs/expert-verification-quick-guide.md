# HOW TO VERIFY THESE RECORDS IN 10 MINUTES (Expert Quick Guide)

Audience: technical experts, auditors, opposing experts

This guide describes a minimal, independent procedure to verify **integrity** and **ordering** of the submitted records using standard cryptographic checks. No execution of system code is required.

## Step 1 — Identify the verification set (≈ 1 minute)
Locate the following files (as provided):

- `runs.json`
- `runs.json.sha256`
- `runs.merkle.json`
- `runs.merkle.json.sha256`
- `runs.json.sig` (if present)
- `tpm_attestation.json` (if present)
- `tier_declaration.json`
- `binder_manifest.json`

These files are referenced by the binder’s tier documentation, which identifies which verification properties apply.

## Step 2 — Verify file integrity (≈ 2 minutes)
Using any standard SHA-256 tool:

1. Compute the SHA-256 hash of each file.
2. Compare the result to the corresponding `.sha256` sidecar.

Expected result: hashes match exactly.

Failure condition: any mismatch indicates alteration after hashing.

## Step 3 — Verify ordering / tamper evidence (≈ 3 minutes)

1. Open `runs.merkle.json`.
2. Confirm each run entry corresponds to a record in `runs.json` (same identifiers / ordering fields).
3. Confirm the Merkle root in `runs.merkle.json` matches the latest recorded root value.

Expected result: the Merkle structure links entries without gaps.

Failure condition: missing entries, reordered entries, or hash inconsistencies.

## Step 4 — Verify signatures (≈ 2 minutes, if present)
If signature / attestation files are included:

- Verify `*.sig` files against the corresponding data files using the referenced public key.
- If `tpm_attestation.json` is present, confirm:
  - the signing key is identified as hardware-backed
  - the attestation itself is cryptographically signed

Expected result: signatures validate.

Failure condition: invalid signature, or missing attestation where a hardware-backed claim is asserted.

## Step 5 — Confirm tier claims (≈ 2 minutes)

1. Open `tier_declaration.json`.
2. Confirm each tier listed corresponds to the presence of its required artifacts.
3. Confirm no tier is claimed without its supporting artifact(s).

Expected result: tiers are derived from file existence.

Failure condition: a claimed tier without the required artifact.

## What this process does not require

- Trust in system operators
- Execution of system code
- Proprietary software
- Interpretation of intent

## Interpretation note
Passing these checks demonstrates integrity, ordering, and verifiability of the records. It does not assert accuracy of underlying facts or legal conclusions.
