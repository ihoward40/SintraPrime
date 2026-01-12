# Public Verifier — How To (v1)

## Purpose
This guide explains how a third party can verify Watch Mode documentation
and public bundle integrity without access to execution systems, secrets,
or internal configuration.

Verification is read-only.

---

## What You Need
- A copy of the Public Verifier bundle
- A SHA-256 capable tool (e.g., sha256sum, certutil, or equivalent)
- Optional: Git access to resolve tags

---

## Step 1 — Verify File Integrity
For each `.sha256` file in the bundle:
- Compute the SHA-256 hash of the referenced file
- Confirm it matches the recorded value

Example:
```

sha256sum -c documentation_baseline.json.sha256

```

A successful check indicates the file has not been modified.

---

## Step 2 — Verify Merkle Root (If Present)
If `checksums/merkle.root.txt` is included:

1. Recompute SHA-256 for each file listed in `merkle.leaves.json`
2. Rebuild the Merkle tree using the published Merkle specification
3. Confirm the computed root matches `merkle.root.txt`

This confirms bundle-wide integrity.

---

## Step 3 — Verify Documentation Baseline
Open `run_declaration/documentation_baseline.json` and confirm:
- Documentation tag names are present
- Commit hashes are specified
- Tags resolve to those commits in Git

This confirms the run declared an immutable documentation context.

---

## Step 4 — Review Transparency Report
Read the transparency report to understand:
- What is claimed
- What is explicitly not claimed
- Which tags and artifacts are in scope

---

## What Verification Proves
- Documentation integrity
- Declared correspondence between runs and docs
- Time-of-existence (if externally anchored)

## What Verification Does NOT Prove
- Runtime correctness
- Authorization
- Legal sufficiency
- Outcome validity

---

## Conclusion
If all checks pass, the artifacts are internally consistent and untampered.
No trust in the operator is required beyond the published hashes and tags.
