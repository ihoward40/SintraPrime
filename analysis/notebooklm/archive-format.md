# NotebookLM Export Archive Format (For Opposing Experts)

Archive name (deterministic, freeze-tagged):

- `NotebookLM_Analysis_Package_<freeze-tag>.zip`

## Contents (authoritative)

```
NotebookLM_Analysis_Package/
├─ README.txt
├─ source_set/
│  ├─ files/
│  │  ├─ Exhibit_A_System_Overview.pdf
│  │  ├─ Exhibit_B_Tier_Declaration_Sheet.pdf
│  │  ├─ FINAL_EXHIBIT_BINDER.pdf
│  │  ├─ runs.json
│  │  ├─ runs.merkle.json
│  │  ├─ tier_declaration.json
│  │  └─ binder_manifest.json
│  ├─ source_set.json
│  └─ source_set.json.sha256
└─ notebooklm_outputs/
   ├─ judge_summary.txt
   ├─ expert_artifact_map.txt
   └─ qa_log.txt
```

## README.txt (verbatim)

```
This package contains a read-only source set and optional analytical summaries.

The source_set/ directory defines the complete, hashed set of files provided
to NotebookLM for analysis. The file source_set.json.sha256 verifies that list.

The notebooklm_outputs/ directory contains analytical summaries generated from
those sources. These outputs are not evidence and do not modify the source files.

No private keys, execution scripts, or pre-freeze artifacts are included.
```

## Build tooling

- Node: `npm run notebooklm:build-analysis-package -- --freeze-tag <tag>`
  - Builds a deterministic ZIP under `dist/notebooklm/`.
