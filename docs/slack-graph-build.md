# Phase 2: Slack Knowledge Graph Build

This repo can build a named Slack knowledge graph and several operational artifacts from the output of `slack_ingest.js`.

## Inputs

- A JSONL file produced by `slack_ingest.js` (recommended).

## Outputs

A folder under `runs/slack_graph/<timestamp>/` containing:

- `graph.json` — normalized graph + metrics
- `graph.dot` — GraphViz DOT (top edges)
- `credit_hit_intensity.json|csv` — creditor mention intensity
- `channel_activity_heatmap.csv` — channel/day message counts
- `bot_behavior_matrix.csv` — actor/channel message counts
- `paralegal_evidence_index.csv` — evidence index (keywords + creditor hits)
- `paralegal_evidence_pack.jsonl` — evidence rows in JSONL

Also updates `runs/slack_graph/latest/*` to the newest build so the UI can load it.

## Run

```powershell
node .\scripts\slack-graph-build.mjs --in .\runs\slack_export_ingest_2026-01-21T00-00-00-000Z.jsonl
```

For a faster first pass:

```powershell
node .\scripts\slack-graph-build.mjs --in .\runs\slack_export_ingest_...jsonl --max 5000
```

## Serve in UI

When the UI starts, it will attempt to load `runs/slack_graph/latest/graph.json` and expose it at:

- `GET /api/slack/graph?compact=1`
- `POST /api/slack/graph/reload`

You can override the path with `SLACK_GRAPH_PATH`.

## Autonomous Paralegal (task/case loop)

Enable the autonomous task/case generator:

- Set `PARALEGAL_AUTONOMOUS=1`

Then the UI exposes:

- `GET /api/paralegal/state`
- `POST /api/paralegal/task/complete` with body `{ "id": "task_..." }`

Optional hardening:

- Set `PARALEGAL_STATE_REQUIRE_ADMIN=1` to require `X-Sintra-Admin` (same as other admin routes via `CLUSTER_ADMIN_SECRET`).

### Manual event injection (admin-only)

For local testing you can emit an event through the admin debug endpoint:

- `POST /api/admin/debug/events/emit` with header `X-Sintra-Admin: <CLUSTER_ADMIN_SECRET>`
- Body: `{ "type": "creditor.observed", "payload": { "name": "Verizon", "source": "test", "channel": "#general" } }`

### Manual event injection (local dev shortcut)

If you prefer not to use admin auth for local testing, you can enable an env-gated shortcut endpoint:

- Set `DEBUG_EVENTS_ENABLE=1`
- (Optional) Set `DEBUG_EVENTS_REQUIRE_ADMIN=0`
- Then call `POST /api/debug/events/emit` with the same JSON body.
