# Deterministic Run Replay (No New Power)

## Status

- Version: v1.0.0
- Date: 2026-01-10
- Scope: determinism proof only (replay), not new capture

---

## Summary (Plain Language)

A **Run Replay** is deterministic re-processing:

- the **same gateway event**
- pointing at the **same frozen inputs**
- re-processed by the **same workers**
- producing **new artifacts**
- whose hashes are compared to the originals

Nothing new is fetched.
Nothing new is inferred.
Nothing is executed.

If the hashes match → determinism proven.
If they don’t → drift exposed.

Both outcomes are valuable.

---

## What Gets Exposed (And Nothing More)

The correct public abstraction is **math only**:

Per run:

- `original_RUN_ROOT_hash`
- `replay_RUN_ROOT_hash`
- `match` = `true` | `false`

Per system:

- `replays` = `N`
- `matches` = `M`

No logs.
No narratives.
No interpretations.

---

## What This Does *Not* Do

Replay does **not**:

- re-capture TikTok comments
- bypass API limits
- access private data
- change policy mode
- escalate authority

Replay is **stricter than the original run**, not looser.

If anything required for deterministic re-processing is missing, the replay **must refuse**.

---

## Why This Is Unusually Strong

Most systems:

- overwrite history
- normalize away inconsistencies
- hide drift

This system:

- preserves original artifacts
- replays mechanically
- exposes mismatch without commentary

That’s why it survives:

- regulator review
- platform trust tests
- court scrutiny

And why it doesn’t require permission from anyone.

---

## Implementation Forks (Policy Choices, Not Engineering)

You don’t need to decide these to adopt Replay, but these are the only forks:

1) **Replay scope**

- per run only
- or per run + per worker

2) **Public visibility**

- internal only
- or public verifier viewer shows replay counts

3) **Failure posture**

- replay mismatch = visible warning
- or replay mismatch = hard stop

---

## Related Verifier Artifacts

See docs/verifier/INDEX.v1.0.0.md for independent re-verification materials.

---

## Bottom Line

This is not “automation.”

This is a system that can **prove it didn’t lie — even to itself — weeks later**.

If/when you extend beyond this, treat it as additive lanes, not rewrites:

- cross-domain replay (Email → Credit → IRS)
- court-exhibit replay bundles
- adversarial replay testing
