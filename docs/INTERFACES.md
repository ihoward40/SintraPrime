# Interfaces

## sintraprime.agent

Current version: `1.0.0`

- **Interface:** `sintraprime.agent`
- **Current version:** `1.0.0`
- **Contract:**
  - All normal executions emit **exactly one line of JSON** to stdout.
  - `--help/-h` and `--version` are **human-readable** and exit `0`.
  - JSON output MUST include:
    - `interface` (string)
    - `interface_version` (SemVer string)
    - `ok` (boolean)
  - If `ok: true`, MUST include: `run_id`, `run_dir`
  - If `ok: false`, MUST include: `error`
  - CI may enforce `--strict-stderr` (stderr must be empty).

### Versioning rules (SemVer)

- **PATCH**: bugfixes, add optional keys, stricter validation
- **MINOR**: add new capabilities without breaking existing consumers
- **MAJOR**: remove/rename keys, change types, change output cardinality, change help/version behavior

### Deprecation & compatibility policy

- **Forward-compatibility (parsers):** Consumers MUST ignore unknown keys and MUST NOT assume key order.
- **Backward-compatibility (producers):** Within a MAJOR line, changes MUST be additive (new optional keys) or stricter validation that does not change successful outputs.
- **Never break the output discipline without MAJOR:** output cardinality (exactly one JSON line), `--help/-h` and `--version` behavior, and the required envelope keys are MAJOR-only changes.
- **Deprecating keys:** When a key/type/behavior becomes discouraged, mark it as **Deprecated** in this document with:
  - the version it was deprecated in (e.g. “Deprecated in 1.2.0”)
  - the earliest removal version (MAJOR, e.g. “Removal no earlier than 2.0.0”)
- **Removing/renaming keys:** Only allowed in a MAJOR bump, and MUST be accompanied by:
  - fixture updates (goldens) in the same PR
  - release notes / changelog note describing the break

```deprecation
key: __smoke_test_deprecation_block__
deprecated_in: 1.0.0
remove_in: 99.0.0
remove_by: 2099-12-31
plan: major
plan_issue: N/A (smoke block)
note: CI parser exercise block — do not remove unless the checker is updated accordingly.
```
