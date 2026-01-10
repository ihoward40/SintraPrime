# NotebookLM Starter Notebook (Post-Freeze, Read-Only)

## Notebook name
SintraPrime — Read-Only Analysis (Post-Freeze)

## Notebook description (paste verbatim)
This notebook is limited to summarization and cross-reference of frozen, read-only artifacts. Outputs are analytical aids only and are not evidence.

## Sources (import these only)
Upload the contents of:

- `analysis/notebooklm/source_set/files/`

Then export the NotebookLM source list from the UI (Sources → Export list) and archive it under:

- `analysis/notebooklm/source_set/notebooklm_sources_export.*`

## Pinned prompts

### Section 1 — Judge Orientation (Plain Language)
1. One-Page Orientation
   “Using only the provided sources, summarize in plain English what this exhibit binder contains, what each exhibit is for, and how the pieces relate. Do not make claims about accuracy or reliability.”

2. What Matters / What Doesn’t
   “From the provided materials, list what a reader needs to understand for an initial review and what can be ignored at first pass.”

3. Scope & Limits
   “Identify the stated limits of the system and what it explicitly does not do. Quote the language that describes those limits.”

### Section 2 — Expert Verification (Technical)
1. Artifact → Tier Map
   “Create a table mapping each artifact to its verification properties, citing the exact source file.”

2. Reproducibility Walkthrough
   “Describe the steps an independent reviewer would take to verify integrity and ordering of the records.”

3. Failure Conditions
   “List the conditions under which verification would fail, based solely on the provided sources.”

### Section 3 — Guardrail (Read First)
“Do not infer intent, reliability, or legal conclusions. Use only the provided sources. If information is not present, state that it is not present.”

## Output handling rule
Store NotebookLM exports only under:

- `analysis/notebooklm/summaries/`
- `analysis/notebooklm/expert_tables/`
- `analysis/notebooklm/qa_exports/`

First line of every exported file:

**Analytical summary generated from hashed, read-only sources. Not evidence.**

## Exhibit A disclosure line (drop-in)
Supplemental analytical summaries may be generated using third-party language models operating solely over frozen, read-only records, in accordance with governance policy `notebooklm.readonly.md`. Such summaries are not evidence and do not modify the underlying artifacts.
