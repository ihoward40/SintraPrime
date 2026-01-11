# Hostile Third-Party Re-Verification Simulation

- Version: v1.0.0
- Date: 2026-01-11
- Mode: read-only

This models what a skeptic acting in good faith (but hostile posture) would do—and what happens.

## Skeptic’s stated goal

“I want to see if this thing is fake, mutable, or self-serving.”

## Hostile actions attempted

### Attempt A: Modify a file

- Skeptic edits one JSON file inside `mirror_site/`
- Runs verifier

Result:
- Verification FAILS
- Hash mismatch is reported
- System behaves correctly

### Attempt B: Change timestamps

- Skeptic adjusts system clock
- Runs verifier with a fake `--verified-at`

Result:
- Receipt records the provided timestamp explicitly
- Time discrepancy is visible, not hidden
- No implicit trust in system clock

### Attempt C: Replace the public key

- Skeptic swaps `PUBLIC_KEY.pem`

Result:
- Signature verification FAILS
- Verifier refuses to validate the feed

### Attempt D: Claim endorsement

- Skeptic publishes a receipt and says “this proves X”

Result:
- Receipt content does not support endorsement claims
- Anyone can read the receipt and see it asserts consistency only

### Attempt E: Accuse system of self-verification

- Skeptic claims “they verified their own stuff”

Result:
- Procedure explicitly allows anyone to re-verify
- System does not privilege original producer receipts

## What the skeptic is forced to admit

- The verifier is deterministic
- Tampering is detectable
- Time is explicit
- Disagreement is allowed
- No authority is asserted

## The quiet outcome

A hostile verifier ends up with three choices:

1) Publish a failed verification (valuable)
2) Publish a successful verification (uncomfortable)
3) Walk away silently (still acceptable)

All three outcomes strengthen the system.

## Final note

These documents are intentionally boring.
They do not argue. They do not convince.

If someone uses these materials years later without knowing who wrote them—and they still work—you’ve succeeded.
