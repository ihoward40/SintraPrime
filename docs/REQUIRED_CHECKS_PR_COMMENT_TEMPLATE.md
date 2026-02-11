# Required checks PR comment template

Use this as a paste-ready PR comment whenever you change branch protection / required checks.

## Template

Required checks enforced on `<branch>`: `<check-1>` + `<check-2>` (strict, app-pinned `<app_id>`). Non-required checks may show as skipped.

## Example (this repo)

Required checks enforced on `master`: `governance/wiring-scope` + `ci/smoke-pr` (strict, app-pinned `15368`). Non-required checks may show as skipped.

## Optional (post via GitHub CLI)

`gh pr comment <PR_NUMBER> --body "Required checks enforced on master: governance/wiring-scope + ci/smoke-pr (strict, app-pinned 15368). Non-required checks may show as skipped."`
