# NotebookLM (Read-Only Analysis)

This directory is reserved for **supplemental** analysis generated from frozen artifacts.

NotebookLM outputs are **not evidence**, do **not** modify governed records, and must not be referenced by execution tooling.

## Recommended Structure

- `analysis/notebooklm/source_set.json`
- `analysis/notebooklm/source_set.json.sha256`
- `analysis/notebooklm/summaries/`
- `analysis/notebooklm/explainers/`
- `analysis/notebooklm/qa_exports/`

## Source Set Pinning
When uploading sources to NotebookLM, pin the exact set here:

- `source_set.json` contains the list of documents (and their hashes if available).
- `source_set.json.sha256` is the SHA-256 of the canonical JSON bytes of `source_set.json`.

This allows you to truthfully state:

> All NotebookLM summaries were derived from this exact source set.

## Guardrails
See [governance/policies/notebooklm.no-action.md](../../governance/policies/notebooklm.no-action.md) for the policy.
