# v1.1 Safety Design (proposal)

This document describes what may evolve after the `freeze/v1.0.0` tag without breaking court-safe invariants.

## Frozen in v1.0 (non-negotiables)

- Webhook transport contract remains `{ type: "user_message", message, threadId }`.
- Deterministic receipts + deterministic hashing always produced for evidence artifacts.
- Approval gate required for external writes.
- Plan immutability across approval (`plan_hash` reuse on `/approve`).
- Policy is the choke point (deny/need-approval over best-effort).
- Smoke vectors are the ship gate (green = shippable).

## Allowed in v1.1 (safe expansion)

Allowed if smoke stays green:
- New read-only adapters.
- New deterministic redacted artifact writers.
- UI improvements (operator console, timeline, explain).
- Stronger redaction rules.
- More vectors and more post-asserts (never fewer).

## Constitutional amendment process (required for semantic change)

Any semantic change must include:
1) a `CHANGELOG.md` entry,
2) new smoke vectors proving the new behavior,
3) explicit operator sign-off.

Examples:
- Changing `PolicyDenied` codes.
- Changing receipt schema.
- Changing approval persistence behavior.
- Changing hashing semantics.
