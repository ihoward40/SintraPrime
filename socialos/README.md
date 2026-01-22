# SocialOS

Minimal end-to-end SocialOS scaffolding (API + worker + UI) with deterministic hashing/signing and an append-only audit ledger.

## Run (dev)

### 1) API

From repo root:

- `node socialos/api/src/server.mjs`

API listens on `http://localhost:8787`.

### 2) Worker

In a second terminal (repo root):

- `node socialos/worker/src/runner.mjs`

Env:
- `SOCIALOS_CONNECTOR_MODE=assist` (default) or `success`
- `SOCIALOS_STORE_PATH` (optional) to point API + worker at the same store file

### 3) UI

The UI is a separate Vite app:

- `cd socialos/ui`
- `npm install`
- `npm run dev`

Env:
- `VITE_API_BASE=http://localhost:8787`

## Storage

By default, the API writes to `socialos/.data/socialos_store.json`.

## Schemas

Shared schemas live in `socialos/shared/schemas/` and are included in the repo-wide schema validation gate (`scripts/ci/validate-json-schemas.mjs`).
