# Tier‑6: Live Accounts Safety Contract

**Purpose:** Define non‑negotiable safety invariants for any Tier‑6 work that touches live/real accounts (e.g., Notion). This is a design contract intended to constrain implementation and future refactors.

## Scope

This contract applies to:
- Tier‑6.0 and any Tier‑6.* features that interact with third‑party services representing real accounts, real data, or real side effects.
- All runtime modes (dev/CI) unless explicitly stated.

This contract does **not** replace general policy controls; it narrows them for live-account integrations.

## Core invariants (non‑negotiable)

### 1) Tier‑6.0 is read‑only
Tier‑6.0 must never perform remote state changes against live services.

Read‑only means:
- Only allow HTTP methods that are semantically read-only (typically `GET`).
- No remote writes, updates, deletions, page creations, database updates, comments, uploads, etc.

**Hard rule:** If a plan contains a write-like operation targeting a live service in Tier‑6.0, the engine must deny it.

### 2) Mock-first is mandatory
Tier‑6.0 development and CI must be proven against a local mock server before any live integration is permitted.

Requirements:
- A local mock server must exist for the Tier‑6 read adapter endpoints.
- Smoke vectors must run offline and deterministically against the mock server.
- All Tier‑6.0 tests must be runnable without network access.

### 3) Determinism is required
Tier‑6.0 output must be reproducible.

Requirements:
- Given the same vector inputs, outputs and persisted artifacts must be stable.
- Persisted artifacts must be deterministic (stable JSON shape, stable ordering where relevant).
- Receipts must include enough metadata to audit the read operations performed.

### 4) No “approval-to-write” in Tier‑6.0
The Tier‑5.3 approval gate exists to pause write-like operations for explicit approval.

Tier‑6.0 does not use approval to permit writes to live services.

**Hard rule:** In Tier‑6.0, live-service write-like operations are **denied**, not paused.

### 5) Safe defaults for target selection
Tier‑6.0 must default to mock endpoints and explicitly require opt‑in to point at live endpoints.

Requirements:
- The default configuration must target the local mock server.
- Any live endpoint configuration must be explicit (e.g., separate env var) and should be designed so that accidental live execution is unlikely.

## What “live” means
A target is “live” if it can:
- mutate real user/org data, OR
- bill money / create external side effects, OR
- create irreversible data exposure.

If unsure, treat it as live.

## Enforcement expectations (implementation constraints)

Tier‑6.0 must enforce this contract in code paths that can execute steps:
- Pre-execution policy must reject write-like actions for live integrations.
- Adapter implementations must not expose any method that performs writes in Tier‑6.0.
- The mock server must be the first integration point used by vectors.

## Auditability requirements

Tier‑6.0 must make it easy to answer:
- What was read?
- From where?
- When?
- Under what config?

Minimum expectations:
- Receipts include the execution id, timestamps, status, and deterministic identifiers.
- Artifacts include the normalized read results and any metadata needed for later inspection.

## Change control

Any change that weakens these invariants requires:
- Explicit design review of this contract (update the doc), and
- Updated vectors proving the new behavior intentionally.

Until then, any behavior that contradicts this contract is a regression.
