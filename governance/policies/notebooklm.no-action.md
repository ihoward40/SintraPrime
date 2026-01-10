# NotebookLM "No-Action" Policy (Read-Only Cognition Layer)

## Purpose
NotebookLM (or any third-party LLM notebook) is permitted **only** as a read-only comprehension tool over **frozen artifacts**.

It is explicitly **not** part of execution, verification, or evidence generation.

## Allowed Use
NotebookLM may be used to:

- Summarize and restate already-frozen artifacts in plain language
- Cross-reference where concepts appear across frozen documents
- Answer questions about frozen artifacts (with citations/quotes to those artifacts where possible)
- Produce supplemental explainers for operators, clerks, reviewers, or experts

## Prohibited Use
NotebookLM outputs must never:

- Modify, generate, or replace governed artifacts (including exhibits, locks, receipts)
- Be treated as evidence or incorporated into exhibits/binders as primary content
- Trigger or drive any automation (Make, Slack, scripts, CI) directly or indirectly
- Alter tier claims or tier declarations (tiers are derived by deterministic gates)
- Introduce pre-freeze materials into the frozen record

## Storage
All NotebookLM-derived outputs must remain segregated under:

- `analysis/notebooklm/**`

NotebookLM outputs are **secondary** and **advisory**.

## Disclosure Line (Recommended)
Include the following disclosure line in a system overview or governance doc when appropriate:

> Supplemental analytical summaries may be generated using third-party language models operating solely over frozen, read-only records. Such summaries are not evidence and do not modify the underlying artifacts.
