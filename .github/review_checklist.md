# Strict review checklist

Use this checklist when reviewing changes in this repository.

## Correctness

- [ ] Change matches the PR Summary and intended scope
- [ ] Edge cases considered (nulls, empties, error paths)
- [ ] Backward compatibility considered (or explicitly broken with rationale)

## Safety

- [ ] No secrets, tokens, or credentials committed
- [ ] No over-broad permissions or unsafe defaults introduced
- [ ] Inputs validated / sanitized where applicable

## Testing

- [ ] Tests added/updated for new/changed behavior
- [ ] CI is green and failures are investigated (not ignored)
- [ ] Manual verification steps recorded if tests aren’t possible

## Maintainability

- [ ] Code is readable and consistent with repo conventions
- [ ] Public APIs and config changes documented (README/notes if needed)
- [ ] Rollback plan / risk notes included for higher-risk changes
