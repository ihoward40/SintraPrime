# Phase X — Lock File Forensic Checklist

Use this to review `governance/freeze/phaseX.lock.json` for clarity and auditability.

## Non-negotiable fields

- `lock_version` present and stable
- `created_utc` ISO-8601 UTC
- `git.head` (commit SHA) present when in a git repo
- `git.tree_clean: true` for an authoritative freeze
- `scope_definition.path` and `scope_definition.sha256` present
- `scope.root_hash_sha256` present
- `files[]` present with `path` + `sha256`

## Strongly recommended

- `bundle.filename`, `bundle.sha256`, `bundle.byte_size`
- `inputs[]` with `role` classification (operator readability)
- `timestamp` object present (even if RFC-3161 not used yet)

## Authoritative vs draft

- Draft freeze may be generated with `--allow-dirty`.
- Authoritative freeze should have `git.tree_clean: true` and be generated from a clean commit.
