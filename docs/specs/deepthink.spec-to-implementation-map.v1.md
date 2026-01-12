# DeepThink — Spec → Implementation Map v1

This map is the only bridge between “talk” and “repo.”

| Spec item | Status | Notes |
| --- | --- | --- |
| Deterministic runner (input JSON → output JSON) | Implemented | [deepthink/src/deepthink.mjs](../../deepthink/src/deepthink.mjs) produces stub findings marked `UNASSESSED`. |
| Writes only under `runs/` | Implemented | Refuses to write outside `runs/` via path boundary checks. |
| Output sidecars (`*.sha256`) | Implemented | `request.json`, `output.json`, `manifest.json` each get a SHA-256 sidecar. |
| Manifest lists produced files + hashes | Implemented | `manifest.json` lists `request.json` and `output.json` hashes. |
| Full JSON Schema validation (draft 2020-12) | Implemented (CI) | CI gates validate `runs/DEEPTHINK_*/request.json` against [deepthink/src/deepthink_request.schema.json](../../deepthink/src/deepthink_request.schema.json) using Ajv. Runner still performs basic shape validation only. |
| CI gates (forbidden imports, runs boundary, sidecars, request-key strictness) | Implemented | [scripts/ci/deepthink-gates.mjs](../../scripts/ci/deepthink-gates.mjs) (static + artifact checks only; does not execute DeepThink in CI) |
| Network access | Intentionally not implemented | Forbidden by spec v1. |
| Signing (Tier 1) | Not implemented | Future optional module; not claimed. |
| TPM-backed signing / attestation (Tier 2) | Not implemented | Not claimed; future optional backend only. |
| Authority escalation | Intentionally not implemented | DeepThink produces analysis artifacts only. |
