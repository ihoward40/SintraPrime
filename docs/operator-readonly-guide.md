# Operator Read-Only Guide (SintraPrime)

This is the default posture: **read-only, court-safe, deny-by-default**.

## Non-negotiables

- Do not run apply commands with write-capable credentials unless you have explicit authorization.
- Do not modify `runs/**` artifacts after creation.
- Treat `hashes.json` + `manifest.json` + `roothash.txt` as the canonical integrity triplet.

## Environment hygiene (Windows PowerShell)

Clear “ambient” variables before live work:

```powershell
Remove-Item Env:SMOKE_VECTORS_USE_REMOTE,Env:WEBHOOK_URL,Env:VALIDATION_WEBHOOK_URL,Env:PLANNER_WEBHOOK_URL -ErrorAction SilentlyContinue
```

## Read-only operations

### Run a Notion live read (if enabled by policy)

- Set secrets in `control/secrets.env` (never commit).
- Use a read-only Notion integration token.

Example:

```powershell
$env:AUTONOMY_MODE="OFF"
node --import tsx ./src/cli/run-command.ts "/notion live db <DATABASE_ID>"
```

### Verify exported bundles (strict)

Use verifier for exports that provide a local verifier:

```powershell
node ./scripts/verify.js "<zip_or_dir_path>" --strict --json
```

## Clean sweep (observe/plan only)

### Observe

```powershell
npm run sintra -- observe --systems notion,slack
```

### Plan

```powershell
npm run sintra -- plan RUN-YYYYMMDD-HHMMSS --systems notion,slack
```

Outputs are written under:

- `runs/<RUN_ID>/observe/`
- `runs/<RUN_ID>/plan/`

## If something pauses or refuses

- Prefer refusals over guessing. Check the run ledger first: `runs/<RUN_ID>/ledger.jsonl`.
- Refer to the refusal glossary: `docs/refusal-code-glossary.md`.
