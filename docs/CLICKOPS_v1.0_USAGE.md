# ClickOps v1.0 — Operator Usage (BrowserAgent-only lane)

This is the **ClickOps lane**: a strictly governed BrowserAgent execution path intended for real UI operations with human checkpoints.

## Core safety rules

- **BrowserAgent-only**: any non-BrowserAgent adapter is rejected.
- **Allowlist enforced**: navigation is limited to hosts in `browser.allowlist.json`.
- **Operator gating**: live runs require explicit operator confirmation.
- **Human checkpoints**: workflows can pause and require a human to type `YES` to proceed.
- **Single-run lock**: a lockfile prevents concurrent ClickOps runs.

## Inputs and artifacts

- Lockfile: `clickops.lockfile.json`
- Allowlist: `browser.allowlist.json`
- Templates: `templates/workflows/` (`browser.canonical.yaml`, `make.*.yaml`, `notion.*.yaml`)

## Run modes

- `--dry-run`: plans and validates without sending inputs.
- `--confirm`: required for non-dry-run execution.
- `--visualize`: resolves the workflow and emits a flight-plan preview; **performs no inputs**.

## Audit bundles

- `--audit`: always emits a deterministic audit ZIP (even on failure/abort).
- `--audit=auto`: emits the audit ZIP only if the run does not end in `success`.
- `--audit=success-only`: emits the audit ZIP only if the run ends in `success`.

Optional manifest publishing:

- `--publish-manifest-url <url>`: if provided, the screenshot QR/banner will reference this hosted manifest URL (supports `{{ RUN_ID }}` templating). If omitted, QR/banner uses `sha256:<manifest_sha256>`.

Audit bundles include a manifest, checksums, and remapped artifacts suitable for independent verification.

RFC-3161 (best-effort; never blocks bundle creation):

- `CLICKOPS_TSA_URL=https://...` (single TSA)
- `CLICKOPS_TSA_LIST=https://tsa1,...,https://tsaN` (ordered fallback list)
- `CLICKOPS_TSA_INCLUDE_TSQ=1` (also include the `.tsq` request)

## Lock TTL

- Default lock TTL is conservative and prevents accidental concurrent operation.
- `--lock-ttl <minutes>` overrides the TTL (clamped to a safe min/max).

## BrowserAgent step methods (allowed)

- `goto`
- `pause_for_confirmation`
- `run_script`
