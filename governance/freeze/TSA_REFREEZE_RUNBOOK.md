# TSA Re-Freeze Runbook (RFC‑3161) — Plan Only

Date: 2026-01-10

This runbook describes how to **supersede** the current Phase X freeze with a new Phase X lock that includes RFC‑3161 evidence.

## Current authoritative facts (baseline)

- Current authoritative Phase X lock commit: `ada828b2a4085ec084eb9900aff56d60042fa997`
- Frozen source commit described by the lock: `6bc5743b847a26559c62396778a30b4251b010e3`
- Phase X root hash: `34252399507137d80824a2d02ce83fe42a3318fb06b48d1546f04f202b083f7a`
- Phase X bundle SHA‑256: `8b94fb2456b4549ab8de76d0438e9853e889e65e7e7a441004c0fda3d35a1d2b`
- Lock file SHA‑256: `e243211e901dd210a2e01a82ab07e3e4be8b9890cb52e160ce24320bc4f1c252`

## Why this is “plan only”

This Windows environment does not currently have OpenSSL on PATH (required by `scripts/phaseX-rfc3161.mjs`).
We do not fabricate TSA evidence.

---

## What a TSA re-freeze actually changes

A TSA re-freeze produces a **new lock** that asserts:

- `timestamp.rfc3161 = true`
- `timestamp.tsa_url` (which TSA you used)
- and either:
  - `timestamp.tsr_path` + `timestamp.tsr_sha256` (recommended), or
  - `timestamp.tsa_serial` (if that’s your policy)

This is not an edit to the existing lock; it is a **superseding lock** under a new authority ceremony.

---

## Prereqs

- A machine with OpenSSL installed and available as `openssl`.
  - Windows options:
    - Git for Windows + OpenSSL
    - Shining Light Productions OpenSSL
    - WSL (Ubuntu) with `openssl` installed

- A TSA endpoint URL.
  - Examples (you must verify current URLs and terms): DigiCert, GlobalSign, FreeTSA.

---

## Procedure (high integrity)

1) Ensure the repo is in the intended state:

- `git status --porcelain` should be empty.

2) Generate a clean Phase X lock and deterministic bundle:

- `node scripts/phaseX-freeze.mjs`

This creates:
- `governance/freeze/phaseX.lock.json`
- `governance/freeze/phaseX.roothash.txt`
- `dist/phaseX/ike-governance-phaseX.zip` (ignored)

3) Create and submit an RFC‑3161 request:

- `node scripts/phaseX-rfc3161.mjs --tsa <TSA_URL>`

Outputs to:
- `governance/freeze/rfc3161/phaseX.tsq`
- `governance/freeze/rfc3161/phaseX.tsr`
- `governance/freeze/rfc3161/phaseX.tsr.sha256`

4) Update the lock’s timestamp section:

In `governance/freeze/phaseX.lock.json`, set:

- `timestamp.rfc3161=true`
- `timestamp.tsa_url=<TSA_URL>`
- `timestamp.tsr_path=governance/freeze/rfc3161/phaseX.tsr`
- `timestamp.tsr_sha256=<sha256-of-tsr>`
- `timestamp.timestamp_utc=<timestamp time if extracted>`

5) Verify with timestamp-required posture:

- `PHASEX_REQUIRE_TIMESTAMP=1 node scripts/phaseX-freeze-verify.mjs`

6) Commit the new lock (and any TSA artifacts you choose to retain):

- Commit at least:
  - `governance/freeze/phaseX.lock.json`
- Recommended to also commit:
  - `governance/freeze/rfc3161/phaseX.tsr`
  - `governance/freeze/rfc3161/phaseX.tsr.sha256`
  - optionally `phaseX.tsr.txt` for human readability

7) Mark supersession explicitly

- Add a short note to your affidavit indicating that the earlier lock is superseded by the new lock commit hash.

---

## Failure modes to watch

- TSA endpoint returns HTTP errors (rate limiting, auth requirements, wrong content-type).
- OpenSSL present but incompatible `openssl ts` behavior.
- Using `phaseX.roothash.txt` from a different lock run than the committed lock.
- Running verify without `PHASEX_REQUIRE_TIMESTAMP=1` and assuming TSA evidence is “required”.

---

## Recommendation

Do not re-freeze unless you need third-party time attestation strength. The current lock is already defensible via:

- deterministic hashing
- reproducible scope + verifier
- repository history
- human notarization layer

---

## TSA re-freeze is a supersession, not an edit

A TSA-enabled Phase X requires generating a new lock and committing it. That action supersedes the current authoritative lock commit:

- Current lock commit (no TSA): `ada828b2a4085ec084eb9900aff56d60042fa997`

Supersession rules:

1) Create a new branch (e.g., `phaseX-tsa-supersession`).
2) Re-run Phase X freeze with timestamp-required verification and OpenSSL available.
3) Capture the RFC-3161 `.tsr` and include it in notarization exhibits.
4) Commit the new `governance/freeze/phaseX.lock.json` (new commit).
5) Publish a transparency entry indicating supersession and linking both lock commits.
