# Skills Learn (v1)

`skills.learn.v1` is a **patch-only** skill scaffolding lane.

## What it does

- Takes a plain-English skill request (name/description/tools requested)
- Generates a deterministic skill skeleton under `runs/skills-learn/<execution_id>/<step_id>/generated_files/...`
- Writes a unified diff (`patch.diff`) that adds the generated files to the repo
- Emits evidence artifacts with SHA-256 and an `evidence_rollup_sha256`

## Safety model

- Default: `output_mode=patch_only`
- No repo modifications are applied by the executor in v1
- A future `apply_patch` mode must be approval-gated in policy before enabling

## Artifacts

- `runs/skills-learn/<execution_id>/<step_id>/skill_manifest.json`
- `runs/skills-learn/<execution_id>/<step_id>/generated_files/...`
- `runs/skills-learn/<execution_id>/<step_id>/patch.diff`
- `runs/skills-learn/<execution_id>/<step_id>/smoke_results.json`
- `runs/skills-learn/<execution_id>/<step_id>/evidence_manifest.json`

## Apply manually

From repo root:

- `git apply runs/skills-learn/<execution_id>/<step_id>/patch.diff`
