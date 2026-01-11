# Freeze v1.0 + Fork v2 (Governance Action)

## v1.0 Freeze Checklist (Do This Once)

* Tag repository:

  ```
  git tag -a v1.0-freeze -m "Sintra Evidence Engine v1.0 – admissibility frozen"
  git push --tags
  ```

* Lock documents:

  * `CONSTITUTION.v1.md`
  * `change-control.v1.1.md`
  * `judicial-explainer.md`

* Add banner to README:

  > **v1.0 is frozen for evidentiary use. No semantic changes permitted.**

## Fork v2 (Speculative Only)

* New branch or repo: `sintra-v2-speculative`

* Explicit banner:

  > **NOT FOR EVIDENTIARY USE**

* Allowed in v2:

  * UX experiments
  * New adapters
  * Analytics views

* Forbidden:

  * Reusing v1 execution IDs
  * Reinterpreting hashes
  * Retroactive validation

This preserves admissibility while allowing innovation.
