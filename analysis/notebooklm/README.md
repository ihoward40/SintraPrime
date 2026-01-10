# NotebookLM (Read-Only Analysis)

This directory is reserved for **supplemental** analysis generated from frozen artifacts.

NotebookLM outputs are **not evidence**, do **not** modify governed records, and must not be referenced by execution tooling.

## Recommended Structure

- `analysis/notebooklm/source_set.json`
- `analysis/notebooklm/source_set.json.sha256`
- `analysis/notebooklm/source_set/` (optional staged export)
- `analysis/notebooklm/source_set/files/`
- `analysis/notebooklm/summaries/`
- `analysis/notebooklm/explainers/`
- `analysis/notebooklm/expert_tables/`
- `analysis/notebooklm/qa_exports/`

## Source Set Pinning
When uploading sources to NotebookLM, pin the exact set here:

- `source_set.json` contains the list of documents (and their hashes if available).
- `source_set.json.sha256` is the SHA-256 of the canonical JSON bytes of `source_set.json`.

This allows you to truthfully state:

> All NotebookLM summaries were derived from this exact source set.

## Guardrails
See [governance/policies/notebooklm.readonly.md](../../governance/policies/notebooklm.readonly.md) for the policy.

## Starter Notebook
- Prompt pack: `analysis/notebooklm/prompt-pack.md`
- Starter notebook setup: `analysis/notebooklm/starter-notebook.md`

## Expert handout
- 10-minute verification guide: `docs/expert-verification-quick-guide.md`

## Archive format
- Format spec: `analysis/notebooklm/archive-format.md`

## Export tooling
- Node: `npm run notebooklm:export-source-set -- --from <dir>`
- PowerShell: `scripts/export-notebooklm-sources.ps1 -SourceRoot <dir>`

## Archive build
- `npm run notebooklm:build-analysis-package -- --freeze-tag <tag>`
