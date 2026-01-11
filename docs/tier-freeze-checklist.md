# Tier Freeze Checklist

Use this checklist to produce a **court-safe freeze**: green gates + deterministic artifacts + offline verification.

## Preconditions

- Clean working tree
- Node `>= 20`
- Dependencies installed: `npm ci` (preferred) or `npm install`

## Gates (MUST be green)

- Typecheck: `npm run typecheck`
- Smoke vectors: `npm run smoke:vectors`
- UI build (if shipping UI): `npm run ui:build`

## Artifact sanity

- Produce a fresh audit execution bundle (pick a known `execution_id`):
  - `node --loader tsx src/cli/run-audit.ts "/audit export <execution_id>"`
- Verify the resulting zip deterministically:
  - `node scripts/verify.js "<zip_path>" --strict --json`

## Freeze packaging (recommended)

- Record the freeze inputs:
  - git commit SHA
  - Node version
  - `schema_version` and verifier version (if applicable)
- Tag:
  - `git tag -a freeze/vX.Y.Z -m "freeze vX.Y.Z"`
  - `git push --tags`

## CI / policy guardrails (recommended)

- Require the three gates above on protected branches.
- Require exactly-two-vector audit tests (happy + tamper) for the audit verifier.
- Disallow merges that introduce any new writes in simulation commands.

## What to archive

- `exports/` artifacts for the release
- The verifier (`scripts/verify.js`) used for validation
- A copy of `docs/CONSTITUTION.v1.md` and this checklist
