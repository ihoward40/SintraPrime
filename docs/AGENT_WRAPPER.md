# Agent Wrapper

`tools/agent/agent.mjs` is an end-to-end orchestration wrapper that:

- routes a natural-language request to a deterministic playbook/governance recommendation
- creates a run directory via `tools/run-skeleton/run-skeleton.mjs`
- composes a deterministic bundle via `tools/bundle-compose/bundle-compose.mjs`
- rehashes the run ledger via `run-skeleton --rehash`
- emits a single-line JSON result including a Notion-ready run log

## Output Contract

- Default mode (machine): emits exactly one JSON line on success or failure.
- `--help/-h` and `--version`: human-readable output, exit code 0.
- JSON output includes interface metadata: `interface: "sintraprime.agent"` and `interface_version` (see `docs/INTERFACES.md`).

## Examples

Create a run:

- `node tools/agent/agent.mjs --text "Prepare a public-records FOIA packet"`

Force a governance gate:

- `node tools/agent/agent.mjs --text "Prepare packet" --governance G2`

Ship/publish (G3 approval-by-hash enforced):

- `node tools/agent/agent.mjs --text "Prepare packet" --ship --timeout-sec 600`

## CI Smoke

CI can run the deterministic end-to-end smoke (agent → verify-run → cleanup) via:

- `npm run -s run:agent:ci`

This emits exactly one JSON line and always deletes the generated run directory.

## Contract Test

To prevent regressions in the public one-line JSON surface, run the contract test:

- `npm run -s test:agent:contract -- --strict-stderr`

Golden fixtures (shape lock):

- `npm run -s test:agent:fixtures`

`--help` and `--version` are human-readable and exit 0.

## Approval-by-hash (G3)

If `--ship` or `--publish` is requested, the agent wrapper treats effective governance as `G3` and will block until:

- `05_hash/approval.json` exists
- `approval.json` contains `approved=true`
- `approval.json.manifest_sha256` matches the stable manifest hash (`05_hash/manifest_sha256.txt`)

To approve a run, use the existing approval helper:

- `node tools/approve-run/approve-run.mjs --run-id <RUN_ID> --runs-root runs --approved-by "<name>"`
