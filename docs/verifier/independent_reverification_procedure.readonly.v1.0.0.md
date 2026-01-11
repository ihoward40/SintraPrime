# Independent Re-Verification Procedure (Read-Only)

- Version: v1.0.0
- Date: 2026-01-11
- Mode: read-only

## Purpose

This procedure lets any third party independently verify that a published mirror has not changed over time.

You are not validating claims. You are checking internal consistency.

## What you are verifying

- The mirror’s signed feed matches its contents
- Hashes resolve deterministically
- The result is reproducible at the time you ran it

## What you are NOT doing

- You are not judging correctness, legality, or truth of claims
- You are not endorsing outcomes
- You are not required to agree with anything

## Requirements

- A copy of the mirror directory (online or offline ZIP)
- The included verifier script
- A system clock (your local clock is sufficient)

## Steps (Canonical)

1) Obtain the mirror

- Download or extract the mirror directory exactly as published
- Do not rename files inside the mirror

2) Run the verifier

Run the verifier against the mirror and provide an explicit `--verified-at` timestamp:

```bash
node verify_mirror.mjs \
  --site <path_to_mirror_site> \
  --out <output_directory> \
  --verified-at <ISO_UTC_TIMESTAMP>
```

3) Observe the result

- A `PUBLIC_VERIFY_RECEIPT.json` is generated
- The receipt contains:
  - feed digest
  - object hash verification results
  - verification timestamp

4) Optional: sign or publish

- You may sign the receipt
- You may publish it
- You may submit it to a registry
- You may do nothing

## Interpretation Rules

- PASS means: the mirror is internally consistent at the time you checked
- FAIL means: something did not match and should be inspected
- Silence or non-participation is acceptable

This procedure produces evidence, not conclusions.
