# Changelog

This project treats releases as evidence-grade freezes. See `docs/CONSTITUTION.v1.md` for the invariants.

## Unreleased (v1.1)

Allowed without constitutional amendment (if `npm run smoke:vectors` stays green):
- New read-only adapters
- New deterministic redacted artifacts
- UI improvements (operator console, timeline, explain)
- Stronger redaction rules
- Additional smoke vectors (never fewer)
- Ops + Safety Hardening: Added durable Windows logging for the full integration gauntlet via `smoke:all:log` (Node “tee” wrapper writes `.smoke-all.log` reliably while streaming output). Documented the three smoke lanes (“don’t guess”) in `OPERATOR_RUNBOOK.md` with a small README pointer so devs run the right suite fast. Added a policy snapshot viewer (`/policy snapshot` + `policy:snapshot`) and self-debugging refusal breadcrumbs on `EGRESS_REFUSED`, making egress/approval failures explainable in one copy-paste command without spelunking.
- Run governance tooling: Added approve-by-hash helpers (`approve:run`) and hardened ship/publish gates to require an `approval.json` bound to `05_hash/manifest_sha256.txt`.

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
