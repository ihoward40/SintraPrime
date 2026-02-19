# Receipts

This folder contains **audit-grade “receipts”** for governance/branch-protection.

GitHub effectively has two parallel worlds for checks:

- **master-world**: what exists on a specific commit SHA on the `master` branch tip (useful for proving what check-runs are emitted on the branch head).
- **PR-world**: what branch protection evaluates when merging a pull request (useful for proving PR-only gates like `Guard solo-team BP symmetry` actually emit).

This repo captures both:

- `branch-protection-receipt-*.json`: snapshot of branch protection settings + check-runs/statuses on a `master` SHA.
- `pr-*-checks-receipt-*.json`: snapshot of a PR’s `statusCheckRollup` (the merge-path view).

Both receipt types include a `schema_version` so the JSON structure can evolve without breaking downstream tooling.
