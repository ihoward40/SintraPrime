# Changelog

This project treats releases as evidence-grade freezes. See `docs/CONSTITUTION.v1.md` for the invariants.

## Unreleased (v1.1)

Allowed without constitutional amendment (if `npm run smoke:vectors` stays green):
- New read-only adapters
- New deterministic redacted artifacts
- UI improvements (operator console, timeline, explain)
- Stronger redaction rules
- Additional smoke vectors (never fewer)

Requires a minor-version constitutional amendment process:
- Receipt schema changes
- Hashing / verification semantics changes
- Approval persistence semantics changes
- Policy code / denial semantics changes

## v1.0.0 — freeze/v1.0.0 (2026-01-11)

- Verifier contract hardened (zip-or-dir, strict mode, JSON-last-line, stable exit codes, optional expect compare).
- Constitution v1 published with explicit determinism invariants (including “no global tail inference”).
- Tier freeze checklist published.
- Deterministic audit execution bundles (Tier-15.1) with bundle-local verifier + canonical verifier script.
- Operator UI improvements for reading runs, timeline, and verify command copy.
