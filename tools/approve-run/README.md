# Approve Run (approve-by-hash)

Writes `05_hash/approval.json` bound to the current `05_hash/manifest_sha256.txt` (or the SHA256 of `05_hash/manifest.json`).

## Usage

```bash
node tools/approve-run/approve-run.mjs --run-id RUN-... --by "Your Name" --note "Approved for ship"
```

By default this also rehashes `ledger.jsonl` so `verify-run.js` stays green after approval.

## PowerShell

```powershell
./tools/approve-run/approve-run.ps1 -RunId RUN-... -By "Your Name" -Note "Approved for ship"
```

## Bash

```bash
./tools/approve-run/approve-run.sh --run-id RUN-... --by "Your Name" --note "Approved for ship"
```

## Help / Version

```bash
node tools/approve-run/approve-run.mjs --help
node tools/approve-run/approve-run.mjs --version
```
