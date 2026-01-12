# External Evidence Add-ons (Docs-Only)

Purpose: capture three **non-governing, docs-only** add-ons that bind external/public/physical evidence to the same immutable core record **without introducing new authority**.

Scope constraints
- No execution paths are changed.
- No new claims of authority are introduced.
- Tiers remain **derived from artifact presence**, not asserted.
- Any verifier described here is **integrity-only** (hash checking), not interpretation.

## Add-on I — Certified-mail tracking integration

Goal: represent physical dispatch and delivery outcomes as a canonical “Mailing Record” that can be referenced from ledgers and exhibits.

Key invariants
- **Never infer delivery.** If there is no delivery scan, status stays `pending`/`in_transit`/`unknown`.
- Delivery outcomes are recorded as evidence-bearing events (e.g., scan hash + timestamp), not as narrative assertions.
- A “delivered/returned/unclaimed” status requires an explicit `delivery_date_utc`.

Schema stub
- [notion/schemas/Mailing_Record.schema.json](notion/schemas/Mailing_Record.schema.json)

## Add-on II — FOIA-ready packet variants

Goal: produce “subset + re-index + re-caption” packet variants of an existing master record **without adding content**.

Key invariants
- FOIA packets are presentational: filter, re-order, re-caption, and optionally redact.
- The packet must preserve a traceable link to the source (e.g., governance anchor URL and/or source ZIP SHA-256).

Schema stub
- [notion/schemas/FOIA_Packet_Manifest.schema.json](notion/schemas/FOIA_Packet_Manifest.schema.json)

## Add-on III — Public verifier page (integrity-only)

Goal: a public, browser-side verifier that:
- takes a user-supplied ZIP
- computes SHA-256 locally
- compares against a published, static manifest
- reports **Match / Mismatch / Unknown**

Constraints
- No network calls are required beyond downloading the static manifest (and optionally the known-good sidecar hash).
- Output language must remain strictly “integrity only, no interpretation.”

Manifest template stub
- [docs/governance/public-verifier/manifest.template.json](docs/governance/public-verifier/manifest.template.json)

## Integration map (high-level)

- Physical/admin evidence (Mailing Record) → bound to run/ledger identifiers and hashes.
- Public distribution evidence (FOIA packets, verifier manifest) → bound to a published anchor + hashes.
- All of the above → reference the immutable core record; none of the above create authority.
