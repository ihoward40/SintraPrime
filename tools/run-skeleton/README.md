# Run Skeleton Generator

Creates a Trust-grade run directory under `runs/` with a standard folder tree, minimal intake/audit/hash scaffolding, and a bundle zip.

## Node

```bash
node tools/run-skeleton/run-skeleton.mjs --tag CASEFILE --objective "Smoke test run"
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
