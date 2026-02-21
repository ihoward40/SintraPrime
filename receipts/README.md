# Receipts

This folder contains **audit-grade “receipts”** for governance/branch-protection.

GitHub effectively has two parallel worlds for checks:

- **master-world**: what exists on a specific commit SHA on the `master` branch tip (useful for proving what check-runs are emitted on the branch head).
- **PR-world**: what branch protection evaluates when merging a pull request (useful for proving PR-only gates like `Guard solo-team BP symmetry` actually emit).

This repo captures both:

- `bp-*.json`: snapshot of branch protection settings + check-runs/statuses on a `master` SHA.
- `pr-*.json`: snapshot of a PR’s `statusCheckRollup` (the merge-path view).

Both receipt types include a `schema_version` so the JSON structure can evolve without breaking downstream tooling.

## Provenance

Receipts may also include optional provenance fields:

- `captured_by`: who/where captured the receipt (e.g. `USERNAME@COMPUTERNAME`).
- `source_endpoints`: the exact API endpoints or CLI queries used to generate the receipt.
- `tool_versions`: versions of tools used (e.g. `gh`, `git`, `node`).

## Pinned Required Contexts

`required-contexts.master.json` pins the expected required context strings for `master` so repo expectations stay aligned with branch protection.

## Naming

- Snapshot receipts MUST be named `receipts/<meta.receipt_id>.json`.
- `meta.receipt_id` is canonical; filenames must match.
- `required-contexts.master.json` is a pinned expectations file (not a snapshot receipt).

## Schema Validation

`schema.v1.json` describes the v1 receipt JSON shapes in this folder.

- Local validation: `npm run -s validate:receipts`
