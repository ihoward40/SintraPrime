# Run Header Anchor Addendum (v1)

## Purpose
This addendum defines required run-header fields that bind execution artifacts
to immutable documentation baselines and external time anchors.

This document is additive. It does not modify prior run-header specifications.

---

## Mandatory Documentation Binding
Every Watch Mode run MUST declare the documentation baseline it operates under.

### Required Fields
```json
{
  "documentation_baseline": {
    "baseline_tag": "watch-mode-docs-v1",
    "baseline_commit": "<git_commit_hash>",
    "addendum_tag": "watch-mode-docs-v1.1",
    "addendum_commit": "<git_commit_hash>"
  }
}
````

---

## External Anchors (Optional but Recommended)

When available, external anchors SHOULD be declared.

```json
{
  "external_anchors": {
    "github_release": {
      "name": "<release_name>",
      "published_at_utc": "<ISO-8601>"
    },
    "transparency_log": {
      "anchor_file": "<path>",
      "anchor_file_sha256": "<hash>"
    },
    "tsa": {
      "digest_file": "<filename>",
      "tsr_file": "<filename>",
      "tsr_sha256": "<hash>"
    }
  }
}
```

---

## Public Bundle Integrity (Optional)

If a Public Verifier bundle exists, its integrity SHOULD be declared.

```json
{
  "public_bundle_integrity": {
    "bundle_sha256": "<hash>",
    "merkle_root": "<hash>"
  }
}
```

---

## Refusal Rule (MANDATORY)

If `documentation_baseline` is absent or incomplete:

* the run MUST be refused
* no execution, observation, or recording may proceed
* a refusal event MUST be logged

Example ledger entry:

```json
{
  "event": "REFUSAL",
  "reason": "MISSING_DOCUMENTATION_BASELINE",
  "ts": "<ISO-8601>"
}
```

---

## Claims Boundary

Run header anchors assert:

* declared context
* documentation alignment
* time-of-existence (when externally anchored)

They do NOT assert:

* correctness
* authorization
* legal effect
