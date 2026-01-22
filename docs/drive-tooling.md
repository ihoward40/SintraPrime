# Drive tooling (ensurePath)

SintraPrime includes a governed Google Drive folder-creation toolchain.

## Goals (non-negotiable)

- Allowlisted roots only (no roaming)
- Idempotent: search → create only if missing
- Receipts: every run writes a JSON receipt + appends a hashed event line
- Deterministic guardrails: depth and create limits; deny patterns; no `..`

## Config

- File: `config/drives.json`
- Secrets: via env var refs (see `control/secrets.env.example`)

Example target (Make proxy):

```json
{
  "alias": "make_proxy",
  "auth": { "type": "make", "webhookUrlSecretRef": "MAKE_DRIVE_ENSUREPATH_URL" },
  "driveType": "folder",
  "approvedRoots": ["ROOT_FOLDER_ID_HERE"],
  "defaultRoot": "ROOT_FOLDER_ID_HERE"
}
```

## CLI

- Ensure a folder chain exists:

`node --import tsx src/cli/run-command.ts /drive ensurePath {"target":"make_proxy","path":"TikTok/Exports/Raw"}`

- Dry-run:

`node --import tsx src/cli/run-command.ts /drive ensurePath {"target":"make_proxy","path":"TikTok/Exports/Raw","dryRun":true}`

- Apply folder template:

`node --import tsx src/cli/run-command.ts /drive applyTemplate {"target":"make_proxy","template":"TikTokEvidence_v1"}`

## Operator tier

These are read-only convenience commands to make troubleshooting fast and greppable.

- Tail the append-only receipt spine:

`node --import tsx run-command.ts /drive receipts tail '{"n":20}'`

- Status dashboard (capabilities + latest ensurePath receipts + health):

`node --import tsx run-command.ts /drive status '{"targets":["my_drive_ops","shared_drive_marketing","trust_vault","make_proxy"],"n":1}'`

`healthReason` is the source of truth and `health` is derived from it:

- `OK` → `green`
- `AUTH_FAIL` → `red`
- `NO_SIGNALS` → `red`
- `NO_ENSUREPATH_YET` → `yellow`
- `STALE` → `yellow`

Receipts default to `runs/<run>/drive/receipts/` but can be forced globally via `SINTRAPRIME_DRIVE_RECEIPTS_DIR`.
