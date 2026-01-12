# Watch Mode (Plain-English Overview)

## What the feature is

SintraPrime includes an optional **Watch Mode**.

Watch Mode lets a human operator **visually observe what happens during a run** (what an operator would see on screen) without granting the system additional power, autonomy, or authority.

Think of it as an observer or recording device, not a decision-maker.

## Why it exists

SintraPrime can already be approval-gated and audit-backed, but reviewers often still ask:

- “How do I know it actually did what you say?”
- “Can I watch it happen?”
- “Is this autonomous or supervised?”

Watch Mode answers those questions **without changing execution authority**.

## What it does

When Watch Mode is enabled, SintraPrime can capture **non-authoritative observational artifacts**, such as:

- optional video
- optional screenshots
- phase-scoped observations (only at selected moments)

Artifacts are written to **run-scoped locations** and are not reused across runs.

## What it does not do

Watch Mode is observational only:

- It does not approve steps
- It does not initiate execution
- It does not change plans
- It does not bypass validation
- It does not create or expand authority

If Watch Mode is disabled, the system’s execution behavior is unchanged.

## Phase-gated (not always on)

Watch Mode can be limited to specific moments of a run (for example, preplan / approval / apply / postapply). Nothing is captured unless explicitly enabled.

## Per-step screenshots (optional)

When configured, the system can take a screenshot after each successful applied step.

These screenshots are run-scoped evidence artifacts and may be referenced by step logs.

## Integrity and verification

Watch Mode artifacts live inside a run folder and can be integrity-checked using append-only hashing and offline verification.

Verification proves integrity of artifacts and ordering (no tampering), not intent or meaning.

## One-sentence summary

Watch Mode enables supervised, phase-gated visual observation of approved actions, producing non-authoritative evidence artifacts that are independently verifiable without altering execution authority.
