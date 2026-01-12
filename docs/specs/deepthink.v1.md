# DeepThink (Analysis Runner) — Spec v1

Status: **Additive** (non-authoritative); analysis-only.

## Goals

- Provide a deterministic, local-only analysis runner that converts an input request JSON into auditable outputs (JSON + SHA-256 sidecars + manifest).
- Produce evidence-grade artifacts that can be archived, hashed, and independently verified without trusting the machine.
- Prevent capability drift and overclaiming via explicit CI gates and a spec→implementation map.

## Non-goals (Hard boundaries)

- No execution authority: DeepThink **must not** initiate actions, trigger workflows, or mutate operational state.
- No network: DeepThink **must not** perform HTTP(S) requests, open sockets, or call external services.
- No mutation of existing evidence: DeepThink **must not** rewrite existing run folders or “upgrade” artifacts in-place.
- No secret handling: DeepThink should not read keys, tokens, or secrets.

## Inputs

- `deepthink_request.json` validated against [deepthink/src/deepthink_request.schema.json](../../deepthink/src/deepthink_request.schema.json)

Determinism rule: `created_utc` is optional metadata and must be provided explicitly by the request. No timestamps are auto-injected.

## Outputs

For each run, DeepThink writes into a single run folder under `runs/`:

- `request.json` + `request.json.sha256`
- `output.json` + `output.json.sha256`
- `manifest.json` + `manifest.json.sha256`

The manifest lists the produced files and their hashes. SHA-256 sidecars are written in the format:

- `<sha256>  <filename>`

## Gates (CI)

DeepThink is considered “in SintraPrime” only if the following are continuously enforced:

- Forbidden imports are blocked in the DeepThink module (network and process-spawn primitives).
- DeepThink writes only under `runs/`.
- Output artifacts exist, have `.sha256` sidecars, and sidecars match computed SHA-256.
- Gates are **static + artifact checks only** and must not create or mutate run artifacts in CI.

## Tier mapping (Derived, not asserted)

DeepThink itself does not claim tiers. Tiers are derived from artifacts present in a run folder.

- Tier 0: hashes (`*.sha256`) only.
- Tier 1: signatures present (`*.sig`) with repo-published public key.
- Tier 2: TPM attestation present (`tpm_attestation.json` + signature).

DeepThink v1 targets Tier 0 only.
