# NotebookLM Prompt Pack (Read-Only Cognition)

## Guardrail prompt (pin this)
Do not infer intent, reliability, or legal conclusions. Use only the provided sources. If information is not present, state that it is not present.

## Judge-facing prompts (plain language)

### J-01 — One-Page Orientation
Using only the provided sources, summarize in plain English what this exhibit binder contains, what each exhibit is for, and how the pieces relate. Do not make claims about accuracy or reliability.

### J-02 — What Matters / What Doesn’t
From the provided materials, list what the Court needs to understand to read the exhibits efficiently, and list what details can be safely ignored for an initial review.

### J-03 — Verification at a Glance
Explain, without technical jargon, how a reader could independently verify that the records were not altered after creation, using only the information in these sources.

### J-04 — Scope & Limits
Identify the stated limits of the system and what it explicitly does not do. Quote the language that describes those limits.

### J-05 — Where to Look First
If a reader had five minutes, which exhibit(s) should be read first and why, based solely on the descriptions in the sources?

## Expert-facing prompts (technical, testable)

### E-01 — Artifact Map
Create a table mapping each artifact to its verification properties (hashing, ledgering, hardware signing, attestation), citing the exact source file where each property is documented.

### E-02 — Reproducibility Walkthrough
Describe the steps an independent reviewer would take to verify integrity and ordering of the records, including which files to check and in what order.

### E-03 — Tier Derivation Check
Identify which verification tiers are present and explain how their presence is derived from file existence rather than assertion. Cite the detection logic described in the sources.

### E-04 — Threat Model (Stated)
Summarize the threat model implicitly or explicitly addressed by the system, and note which threats are out of scope according to the documentation.

### E-05 — What Would Falsify This
Based only on the sources, list the conditions that would cause verification to fail (e.g., missing files, hash mismatch, ledger inconsistency).

## Output handling
Store exports only under `analysis/notebooklm/**` and label them:

Analytical — Not Evidence
