# Wiring Scope

## PR: pr/searchrouter-job-schedule

### Summary
Wires runtime behavior for:
- SearchRouter tool execution + receipt projection
- /job schedule offline-safe handler + smoke vector
- Plain-Node policy registry coverage gate (snapshot-based)

### Paths in scope
- src/cli/run-command.ts
- src/research/searchrouter.ts
- src/tools/searchrouter/**
- scripts/smoke/smoke-job-schedule.mjs
- scripts/ci/verify-ajv-compile-ops-schemas.mjs
- scripts/ci/require-policy-registry-for-schemas.mjs
- scripts/ci/schema-policy-registry-matcher.mjs
- src/policy/policyRegistry.snapshot.json
- schemas/research/**
- schemas/automations/heartbeat.job.v1.json
- notion/schemas/** (AJV hygiene: legacy JSON made valid)

### Scope notes
- Policy coverage gate is plain-Node snapshot only (`policyRegistry.snapshot.json` is `{ actions, prefixes }`).
- Full TS governance registry stays PR #1/mainline.

### CI receipts
```bash
node scripts/ci/require-policy-registry-for-schemas.mjs; echo $LASTEXITCODE
node scripts/ci/verify-ajv-compile-ops-schemas.mjs; echo $LASTEXITCODE
node scripts/smoke/smoke-job-schedule.mjs; echo $LASTEXITCODE

```
