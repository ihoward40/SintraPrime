# Slack export ingest

This repo includes a local (offline) ingest utility for **unzipped Slack exports**.

## What it does

- Reads `users.json` and `channels.json` to resolve IDs → human-readable names.
- Walks each channel folder (e.g. `general/`, `random/`) and loads all `*.json` message files.
- Writes an enriched, normalized JSONL stream into `runs/`.
- Optionally appends each message (or summary milestones) into the SintraPrime UI timeline (`runs/timeline.jsonl`).

## Run

From the repo root:

```powershell
npm run -s slack:ingest -- --root "C:\SlackExport\all-ikesolutions"
```

Or:

```powershell
node .\slack_ingest.js --root "C:\SlackExport\all-ikesolutions" --timeline summary --max 5000
```

## Expected Slack export layout

```
<exportRoot>/users.json
<exportRoot>/channels.json
<exportRoot>/<channel-name>/*.json
```

## Notes

- The default output file is `runs/slack_export_ingest_<timestamp>.jsonl`.
- A summary file is written alongside it as `*.summary.json`.
- To skip writing entirely and just validate/estimate counts, use `--dry-run`.
