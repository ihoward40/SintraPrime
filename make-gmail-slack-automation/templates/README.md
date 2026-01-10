# Templates

The files in this folder are expected to be **real Make.com exported blueprints**
so they support:

- Import → reconnect → run

## Current state

If you see `template_type: "make.com-scenario-definition"` in a template file,
it is a **stub** (deterministic scenario definition) and not guaranteed-importable
as a Make blueprint.

## Replace the stubs (90 seconds)

For each scenario:

1. Open the scenario in Make
2. Click `…` (three dots) → `Export blueprint`
3. Download the `.json`
4. Replace the corresponding file in this repo (keep filenames the same):

- Replace `template-gmail-alert-to-slack-notify.json`
- Replace `template-gmail-delete-after-notify.json`

No renaming inside the JSON is required.

## Sanity lock (recommended)

Quick visual check after export:

- Gmail trigger uses **Gmail search**
- Query contains:
  - `label:ALERT_SLACK -label:ALERT_SLACK_POSTED`
- Slack message contains **no slash commands**
- Delete scenario triggers only on `label:ALERT_SLACK_POSTED`
