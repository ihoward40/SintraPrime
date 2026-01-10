# Make.com Auto-Lint (Enforcement)

This folder is the enforcement layer.

- Profiles live in `lint_profiles/`.
- Per-scenario declarations live in `scenarios/*.lint.json` at repo root.
- `scripts/check-make-lint.mjs` scans Make scenario JSON artifacts and produces `lint-report.json`.

Run:

- `npm run ci:make-lint`

Policy is designed to be deterministic and operator-friendly: failures include exact rule codes and offending module identifiers.
