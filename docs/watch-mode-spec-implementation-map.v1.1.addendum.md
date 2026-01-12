# Watch Mode v1.1 — Addendum (Additive)

This document is an additive clarification to
[docs/watch-mode-spec-implementation-map.v1.md](watch-mode-spec-implementation-map.v1.md).

No statements in v1 are modified or overridden.

## Purpose

This addendum captures clarifications and edge cases that commonly arise during audit/review, without changing the v1 baseline.

## Clarifications (Audit-facing)

- Watch Mode is **observational evidence** (video/screenshots + ledger entries), not an execution mechanism.
- Presence of Watch Mode artifacts shows that UI capture was enabled and attempted; it does not guarantee completeness.
- Absence of Watch Mode artifacts does not invalidate a run; it only indicates Watch Mode was disabled or capture failed.

Watch Mode recordings are observational artifacts.
Deterministic replay relies on plan, apply, and ledger artifacts, not video.

## What Watch Mode does NOT visually prove

- It does not prove that a third-party UI accurately reflects backend state at all times.
- It does not prove intent, authorization, or correctness of a step beyond what is recorded.
- It does not prove that every API-side change is visible in the UI immediately (latency/caching may exist).

## Operator responsibilities vs system guarantees

Operator responsibilities:
- Ensure the browser profile is logged in for each system URL used during tours.
- Choose when (and whether) Watch Mode is enabled for a run.
- Treat Watch Mode artifacts as **supporting receipts** alongside ledger and apply artifacts.

System guarantees (as designed):
- Watch Mode does not escalate authority or bypass approvals.
- Watch Mode output is run-scoped (no cross-run reuse).
- Ledger entries record Watch Mode stages/events when enabled.

## Known limitations (acceptable by design)

- UI capture is best-effort: popups, MFA, network errors, or UI changes can prevent capture.
- Redaction is best-effort and should not be relied upon as a sole control for secrets handling.

## Forward-compatibility notes (what would justify v1.2)

A v1.2 addendum (or new baseline) would be justified by:
- Adding first-class “highlight reel” artifacts (if desired), with strict non-authoritative framing.
- Adding more explicit, ledger-backed capture coverage reporting (e.g., per-phase capture summary).
- Adding additional platform-specific safety clarifications if policies evolve.
