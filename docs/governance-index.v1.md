# Governance Index (v1)

## Purpose
This index enumerates all governance, specification, and verification
documents relevant to Watch Mode and related public artifacts.

This index is descriptive only.

## Governance Flow (Overview)

```
  ┌────────────────────────────┐
  │  Documentation Baseline    │
  │  (v1 + v1.1 Addendum)      │
  └─────────────┬──────────────┘
            │ declared by
            ▼
  ┌────────────────────────────┐
  │        Run Header           │
  │  (declared baseline +      │
  │   optional anchors)        │
  └─────────────┬──────────────┘
            │ summarized into
            ▼
  ┌────────────────────────────┐
  │   Public Verifier Bundle   │
  │  (docs, hashes, headers)  │
  └─────────────┬──────────────┘
            │ integrity + time
            ▼
  ┌────────────────────────────┐
  │    External Anchors        │
  │  (GitHub, Log, TSA)        │
  └────────────────────────────┘
```

This flow is declarative and integrity-focused; it does not imply execution authority or legal effect.

---

## Core Specifications
- **Watch Mode Spec → Implementation Map (v1)**
  - `watch-mode-spec-implementation-map.v1.md`

- **Watch Mode Addendum (v1.1)**
  - `watch-mode-spec-implementation-map.v1.1.addendum.md`

---

## Integrity & Verification
- **Merkle Specification — Public Bundles**
  - `merkle-public-bundle-spec.v1.md`

- **Public Verifier How-To**
  - `public-verifier-how-to.v1.md`

---

## Transparency & Anchoring
- **Watch Mode Transparency Report**
  - `transparency/watch-mode-transparency-report.v1.md`

- **Run Header Anchor Addendum**
  - `run-header-anchor-addendum.v1.md`

- **Notarization SOP**
  - `notarization-sop.v1.md`

---

## Reference Artifacts (Examples)
- **Sample Merkle Leaves File**
  - `examples/merkle.leaves.sample.v1.json`

---

## Interpretation Rules
- Versioned documents are immutable once published
- Addenda are additive and do not override baselines
- Absence of a document implies non-implementation by design

---

## How to Challenge This System

Challenges to this system must be raised against documented specifications, declared hashes, or immutable tags. Objections should identify a specific document, file hash, Merkle root, or tag and demonstrate inconsistency, tampering, or non-conformance with the published rules. Claims based on assumptions, undocumented expectations, or unstated requirements are out of scope. Where no document exists, non-implementation is intentional by design.

---

## Claims Boundary
This index organizes documentation.
It does not assert execution, compliance, or legal effect.
