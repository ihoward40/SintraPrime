# Run Skeleton Generator

Creates a Trust-grade run directory under `runs/` with a standard folder tree, minimal intake/audit/hash scaffolding, and a bundle zip.

## Node

```bash
node tools/run-skeleton/run-skeleton.mjs --tag CASEFILE --objective "Smoke test run"
```

On success this prints a single JSON line including `run_id`, `run_dir`, and `manifest_sha256`.

## Version / provenance

```bash
node tools/run-skeleton/run-skeleton.mjs --version
```

## Governance modes

- `--governance G1`: run tree + log + hashing (default)
- `--governance G2`: + requires `04_audit/verification_checklist.json`
- `--governance G3`: + requires `05_hash/approval.json` when shipping/publishing

## NPM scripts (recommended)

```bash
npm run -s run:new -- --tag CASEFILE --objective "Smoke test run"
```

```bash
npm run -s run:ci
```

```bash
npm run -s verify:run -- --run-id RUN-YYYYMMDD-HHMMSS-ET-TAG-NNN --json
```

## PowerShell

```powershell
./tools/run-skeleton/run-skeleton.ps1 -Tag CASEFILE -Objective "Smoke test run"
```

## Bash

```bash
./tools/run-skeleton/run-skeleton.sh --tag CASEFILE --objective "Smoke test run"
```

## Verify hash chain (optional)

```bash
node verify-run.js runs/<RUN_ID>
```

## Rehash an existing run (optional)

```bash
npm run -s run:rehash -- --run-id RUN-YYYYMMDD-HHMMSS-ET-TAG-NNN
node verify-run.js runs/RUN-YYYYMMDD-HHMMSS-ET-TAG-NNN --json
```

## Ship / publish (approval-by-hash enforced)

```bash
node tools/run-skeleton/run-skeleton.mjs --ship --run-id RUN-YYYYMMDD-HHMMSS-ET-TAG-NNN
```

## Notion-ready run log (optional)

```bash
npm run -s run:new -- --tag CASEFILE --objective "..." --notion-runlog
```
