# One-Shot Build Doctrine v1.0 (Frozen)

## Purpose
Produce a single, time-locked, self-verifying artifact family for a specified case.

This process is designed to be:
- deterministic (same inputs + same `--now` → same bytes where applicable)
- auditable (records provenance; fails closed)
- platform-agnostic (Windows-safe; no shell-dependent quoting)

## Authority
This document defines v1.0 behavior for the one-shot build runner.

v1.0 is immutable. Any behavioral changes require a new versioned doctrine document (v1.1, v2.0, etc.).

## Required Inputs
The one-shot runner requires:
- `--case <CASE_ID>`
- `--now <ISO_UTC_TIMESTAMP>`

Doctrine rule: no timestamp → no build.

## Optional Inputs
- `--out <path>` (default: `deliverables/v1.0`)
- `--clean` (remove the one-shot output subfolders before running)
- `--dry-run` (print resolved commands and paths; exit without executing or writing)

## Prohibited Behaviors
- No writes to `dist/`.
- No partial runs: if verification fails, the run must stop non-zero.
- No fabricated provenance: if git metadata cannot be obtained, record `git: "unavailable"`.

## Output Contract (v1.0)
All outputs are under the output root (default `deliverables/v1.0`).

The one-shot runner emits:
- `RUN_PROVENANCE.json` (written before any build step)
- `README_CLERK.txt` (written only after verification PASS)

It also runs component builders that emit:
- `anomaly/` (flags JSON + neutral PDF + readonly dashboard)
- `training/` (SRT captions, print PDF, quickstart PDF, manifest)
- `public_verification_kits/` (verification kit ZIP)
- `mirror_site/` (static mirror with signed feed and content-addressed blobs)

## Verification Gate Rule
The run must conclude by offline-verifying the mirror site:
- verify feed signature
- verify SHA-256 of each referenced blob

If verification does not PASS, the run must fail.

## Amendment Rule
To change behavior:
1) create a new doctrine document (e.g., `ONE_SHOT_BUILD_DOCTRINE.v1.1.md`)
2) implement changes in a new or versioned runner
3) do not silently modify v1.0 outputs or semantics
