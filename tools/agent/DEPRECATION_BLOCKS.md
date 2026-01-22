# Deprecation blocks (machine-parseable)

This repo supports machine-parseable deprecation annotations inside [docs/INTERFACES.md](../../docs/INTERFACES.md).

## Format

Place one or more fenced blocks using the `deprecation` info string:

````md
```deprecation
key: legacy_field
deprecated_in: 1.2.0
remove_in: 2.0.0
remove_by: 2026-06-30
plan: major
plan_issue: GH-123 (Remove legacy_field in v2)
```
````

### Fields

- `key` (required): the field/behavior being deprecated.
- `deprecated_in` (optional, SemVer): the interface version where the deprecation started.
- `remove_in` (optional, SemVer): the first interface version where removal is allowed (must be a future MAJOR relative to the current major).
- `remove_by` (optional, YYYY-MM-DD): date deadline for removal.
- `plan` (optional): set to `major` to declare a MAJOR bump plan exists.
- `plan_issue` (optional): human reference (issue id, ticket, etc.).

## Enforcement

The checker [tools/agent/check-deprecation-deadlines.mjs](check-deprecation-deadlines.mjs) treats a deprecation as **crossed** when either:

- `now >= remove_by`, OR
- `current interface_version >= remove_in`

When crossed:

- **WARN (default)** if a valid major plan exists (`plan: major`) and `remove_in` (if present) is a future MAJOR.
- **FAIL** if crossed and there is no valid major plan.
- `--fail-on-warn` makes warnings fatal.

The CLI supports `--now YYYY-MM-DD` for deterministic tests.

## Rollup artifact

Every invocation writes a dashboard-friendly JSON rollup:

- In run context: `runs/<RUN_ID>/04_audit/checks/deprecation_rollup.json`
- Otherwise: `artifacts/deprecation-rollup.json`

Additionally, a copy is always written to `artifacts/deprecation-rollup.json` even when run-context is detected, so CI uploads can use a stable path.

In the tool's one-line JSON output:

- `rollup_path` is workspace-relative and uses forward slashes (POSIX-style).
- `rollup_path_native` is the native OS path used for writing.

The rollup includes counts, per-key status, and the next upcoming deadline.
